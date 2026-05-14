import { NextResponse } from "next/server";
import type Stripe from "stripe";

import type { CustomerPlan, CustomerStatus } from "@/lib/customers/types";
import { getStripe, STRIPE_WEBHOOK_SECRET } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/server";

// POST /api/webhooks/stripe
//
// Stripe → Olokas subscription-lifecycle webhook (Phase 3.12).
//
// Replaces the 3.0 stub that only verified signatures and logged event types.
// Handlers are wired for the five lifecycle events the business actually
// depends on:
//
//   - checkout.session.completed     → first-time plan provisioning
//   - customer.subscription.updated  → plan changes (and we alias `.created`
//                                      to the same handler so cross-flow
//                                      provisioning paths converge)
//   - customer.subscription.deleted  → revert to free; keep ids on the row
//                                      so a chargeback / restoration flow can
//                                      reuse them, and Phase 4's data-retention
//                                      cron decides when to actually purge
//   - invoice.payment_failed         → mark past_due (recovery email is 5.x)
//   - invoice.payment_succeeded      → mark active (covers dunning recovery)
//
// Body-bytes integrity: Stripe signs the raw request body. The default App
// Router parsing must be bypassed (we call `req.text()` directly), and the
// route is declared `runtime: nodejs` + `dynamic: force-dynamic` so the
// edge runtime never gets in the way and the route isn't cached.
//
// Auth model: Stripe-signature header verification IS the auth gate. Past
// that, every DB write uses the service-role Supabase client
// (`createAdminClient`) since RLS would otherwise block updates to the
// stripe_* fields and the plan/limit fields — there is no policy that lets
// the anon-key client touch these.
//
// Idempotency: every handler converges to the same final state when an
// event is delivered twice (which Stripe will do at least occasionally).
// Mutations are UPDATEs scoped by stripe_customer_id (or auth.users.id when
// we have it via client_reference_id), never INSERTs, so the second delivery
// is a no-op write of the same values. For invoice.* events we also gate
// against the `cancelled` state so a delayed final invoice for a closed
// subscription can't resurrect it.

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// ---------------------------------------------------------------------------
// Plan ↔ price-ID mapping
// ---------------------------------------------------------------------------
//
// Plan limits MUST match the user-facing copy in `lib/pricing/tiers.ts` —
// those are the numbers we promised people on the pricing page, so they're
// the numbers their account should actually be allowed.
//
// `free` shows up here even though no Stripe subscription maps to it; it's
// the state we revert to in subscription.deleted, and the limits match the
// `customers` table defaults from supabase/migrations/0001_initial.sql.

const PLAN_LIMITS: Record<
  CustomerPlan,
  { query_limit: number; domain_limit: number }
> = {
  free: { query_limit: 1, domain_limit: 1 },
  starter: { query_limit: 10, domain_limit: 1 },
  pro: { query_limit: 50, domain_limit: 5 },
  agency: { query_limit: 250, domain_limit: 25 },
};

// Env-var name → tier. The actual price IDs are pasted into Vercel after
// `npm run stripe:setup` (3.9), so we look the value up at request time so a
// freshly-rotated id takes effect on the next webhook without a redeploy.
const PRICE_ENV_TO_PLAN: Record<string, Exclude<CustomerPlan, "free">> = {
  STRIPE_PRICE_STARTER_MONTHLY: "starter",
  STRIPE_PRICE_STARTER_ANNUAL: "starter",
  STRIPE_PRICE_PRO_MONTHLY: "pro",
  STRIPE_PRICE_PRO_ANNUAL: "pro",
  STRIPE_PRICE_AGENCY_MONTHLY: "agency",
  STRIPE_PRICE_AGENCY_ANNUAL: "agency",
};

function getPlanFromPriceId(priceId: string): CustomerPlan | null {
  for (const [envName, plan] of Object.entries(PRICE_ENV_TO_PLAN)) {
    const value = process.env[envName];
    if (value && value.trim() === priceId) return plan;
  }
  return null;
}

// Stripe fields like `session.customer` / `subscription.customer` can be a
// string id, an expanded object, a deleted-customer stub, or null. We only
// ever need the id, so reduce all four shapes here.
function asId(
  value: string | { id: string } | null | undefined,
): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  return value.id ?? null;
}

// Bucket Stripe's eight subscription statuses into the four `customers.status`
// values defined by the CHECK constraint in 0001_initial.sql.
function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status,
): CustomerStatus {
  switch (status) {
    case "active":
    case "trialing":
      return "active";
    case "past_due":
    case "unpaid":
    case "incomplete":
      // `incomplete` means the first payment didn't clear — treat it like
      // past_due so the UI prompts the user to fix billing.
      return "past_due";
    case "paused":
      return "paused";
    case "canceled":
    case "incomplete_expired":
      return "cancelled";
    default:
      // Defensive default: Stripe may add new statuses in future API versions;
      // logging makes the gap visible without breaking the webhook.
      console.warn(
        `[stripe-webhook] unknown subscription status "${status}"; defaulting to active`,
      );
      return "active";
  }
}

// ---------------------------------------------------------------------------
// Handlers
// ---------------------------------------------------------------------------

async function handleCheckoutSessionCompleted(
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const stripeCustomerId = asId(session.customer);
  const stripeSubscriptionId = asId(session.subscription);

  // /api/checkout sets client_reference_id to the Supabase auth.users.id and
  // duplicates it into subscription_data.metadata.supabase_user_id. Either
  // one is sufficient to resolve the row; prefer client_reference_id since
  // it lives on the session itself.
  const supabaseUserId =
    session.client_reference_id ??
    (typeof session.metadata?.supabase_user_id === "string"
      ? session.metadata.supabase_user_id
      : null);

  if (!stripeCustomerId) {
    console.error(
      `[stripe-webhook] ${event.id}: checkout.session.completed missing customer`,
    );
    return;
  }
  if (!stripeSubscriptionId) {
    // Olokas only sells subscriptions, but defensively skip non-sub sessions
    // (e.g. a future one-off charge surface) rather than throwing — Stripe
    // would otherwise retry the event indefinitely.
    console.log(
      `[stripe-webhook] ${event.id}: session has no subscription; skipping`,
    );
    return;
  }

  // The session itself doesn't carry the price id by default (line_items must
  // be expanded). Easier and more reliable: retrieve the subscription, which
  // always has its items populated.
  let subscription: Stripe.Subscription;
  try {
    const stripe = getStripe();
    subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
  } catch (err) {
    console.error(
      `[stripe-webhook] ${event.id}: subscriptions.retrieve(${stripeSubscriptionId}) failed:`,
      err,
    );
    // Throw so Stripe retries — a transient network blip shouldn't leave the
    // user stuck on the free plan after they paid.
    throw err;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error(
      `[stripe-webhook] ${event.id}: subscription ${stripeSubscriptionId} has no price`,
    );
    return;
  }
  const plan = getPlanFromPriceId(priceId);
  if (!plan || plan === "free") {
    console.error(
      `[stripe-webhook] ${event.id}: priceId ${priceId} is not in the Olokas allow-list`,
    );
    return;
  }
  const limits = PLAN_LIMITS[plan];

  const admin = createAdminClient();
  const update = {
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: stripeSubscriptionId,
    plan,
    status: mapStripeSubscriptionStatus(subscription.status),
    query_limit: limits.query_limit,
    domain_limit: limits.domain_limit,
  };

  // Prefer matching by supabase user id (the auth.users PK, also the
  // customers PK). That path works even if /api/checkout failed to persist
  // stripe_customer_id before we got here.
  if (supabaseUserId) {
    const { error } = await admin
      .from("customers")
      .update(update)
      .eq("id", supabaseUserId);
    if (error) {
      console.error(
        `[stripe-webhook] ${event.id}: customers update by user id failed:`,
        error.message,
      );
      throw new Error(error.message);
    }
    return;
  }

  // Fallback: match by stripe_customer_id. /api/checkout's normal happy path
  // has already persisted it before redirecting to Stripe, so this is the
  // common case when client_reference_id is somehow missing.
  const { error } = await admin
    .from("customers")
    .update(update)
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    console.error(
      `[stripe-webhook] ${event.id}: customers update by stripe_customer_id failed:`,
      error.message,
    );
    throw new Error(error.message);
  }
}

async function handleSubscriptionUpserted(
  event: Stripe.Event,
  subscription: Stripe.Subscription,
): Promise<void> {
  // Re-derive plan from the CURRENT price id on the subscription. This is
  // the upgrade/downgrade path: a user moves Starter → Pro, Stripe fires
  // customer.subscription.updated with the new price, and we mirror that
  // into customers.plan + query_limit + domain_limit in one write.
  //
  // Also handles `.created` — Stripe fires that the moment the subscription
  // is born, before checkout.session.completed in some flows. Re-applying
  // the same fields is a no-op write, so it's safe to share the handler.

  const stripeCustomerId = asId(subscription.customer);
  if (!stripeCustomerId) {
    console.error(
      `[stripe-webhook] ${event.id}: subscription ${subscription.id} has no customer`,
    );
    return;
  }

  const priceId = subscription.items.data[0]?.price.id;
  if (!priceId) {
    console.error(
      `[stripe-webhook] ${event.id}: subscription ${subscription.id} has no price`,
    );
    return;
  }
  const plan = getPlanFromPriceId(priceId);
  if (!plan || plan === "free") {
    console.error(
      `[stripe-webhook] ${event.id}: priceId ${priceId} is not in the Olokas allow-list`,
    );
    return;
  }
  const limits = PLAN_LIMITS[plan];

  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .update({
      stripe_subscription_id: subscription.id,
      plan,
      status: mapStripeSubscriptionStatus(subscription.status),
      query_limit: limits.query_limit,
      domain_limit: limits.domain_limit,
    })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    console.error(
      `[stripe-webhook] ${event.id}: subscription update db error:`,
      error.message,
    );
    throw new Error(error.message);
  }
}

async function handleSubscriptionDeleted(
  event: Stripe.Event,
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripeCustomerId = asId(subscription.customer);
  if (!stripeCustomerId) {
    console.error(
      `[stripe-webhook] ${event.id}: deleted subscription ${subscription.id} has no customer`,
    );
    return;
  }

  // Per spec: revert to free, set status=cancelled, PRESERVE the data
  // (rows stay, customers row stays, the 30-day purge cron is a separate
  // Phase 4 item). We deliberately keep stripe_customer_id populated so a
  // user resuming via the Stripe portal lands on the same row, and clear
  // stripe_subscription_id since that particular subscription is dead.
  const admin = createAdminClient();
  const { error } = await admin
    .from("customers")
    .update({
      stripe_subscription_id: null,
      plan: "free" as CustomerPlan,
      status: "cancelled" as CustomerStatus,
      query_limit: PLAN_LIMITS.free.query_limit,
      domain_limit: PLAN_LIMITS.free.domain_limit,
    })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    console.error(
      `[stripe-webhook] ${event.id}: subscription.deleted db error:`,
      error.message,
    );
    throw new Error(error.message);
  }
}

async function handleInvoicePaymentFailed(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
): Promise<void> {
  const stripeCustomerId = asId(invoice.customer);
  if (!stripeCustomerId) {
    console.log(
      `[stripe-webhook] ${event.id}: invoice.payment_failed without customer; skipping`,
    );
    return;
  }

  const admin = createAdminClient();

  // Guard against out-of-order delivery: if the customer is already
  // cancelled (e.g. subscription.deleted landed first), don't flip them
  // back to past_due — Stripe sometimes emits a final failed invoice for a
  // subscription that has just been closed.
  const { data: existing, error: selErr } = await admin
    .from("customers")
    .select("status")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<{ status: CustomerStatus }>();
  if (selErr) {
    console.error(
      `[stripe-webhook] ${event.id}: invoice.payment_failed lookup:`,
      selErr.message,
    );
    throw new Error(selErr.message);
  }
  if (!existing) {
    console.log(
      `[stripe-webhook] ${event.id}: no customer row for ${stripeCustomerId}; skipping`,
    );
    return;
  }
  if (existing.status === "cancelled") {
    return;
  }

  const { error } = await admin
    .from("customers")
    .update({ status: "past_due" as CustomerStatus })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    console.error(
      `[stripe-webhook] ${event.id}: invoice.payment_failed db error:`,
      error.message,
    );
    throw new Error(error.message);
  }
}

async function handleInvoicePaymentSucceeded(
  event: Stripe.Event,
  invoice: Stripe.Invoice,
): Promise<void> {
  const stripeCustomerId = asId(invoice.customer);
  if (!stripeCustomerId) {
    console.log(
      `[stripe-webhook] ${event.id}: invoice.payment_succeeded without customer; skipping`,
    );
    return;
  }

  const admin = createAdminClient();

  // Same guard: don't resurrect a cancelled customer from a delayed proration
  // invoice. If they're cancelled, they stay cancelled until a new
  // subscription event reactivates them.
  const { data: existing, error: selErr } = await admin
    .from("customers")
    .select("status")
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle<{ status: CustomerStatus }>();
  if (selErr) {
    console.error(
      `[stripe-webhook] ${event.id}: invoice.payment_succeeded lookup:`,
      selErr.message,
    );
    throw new Error(selErr.message);
  }
  if (!existing) {
    console.log(
      `[stripe-webhook] ${event.id}: no customer row for ${stripeCustomerId}; skipping`,
    );
    return;
  }
  if (existing.status === "cancelled") {
    return;
  }

  const { error } = await admin
    .from("customers")
    .update({ status: "active" as CustomerStatus })
    .eq("stripe_customer_id", stripeCustomerId);
  if (error) {
    console.error(
      `[stripe-webhook] ${event.id}: invoice.payment_succeeded db error:`,
      error.message,
    );
    throw new Error(error.message);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 },
    );
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      STRIPE_WEBHOOK_SECRET(),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      "[stripe-webhook] signature verification failed:",
      message,
    );
    return NextResponse.json(
      { error: `Signature verification failed: ${message}` },
      { status: 400 },
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutSessionCompleted(
          event,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await handleSubscriptionUpserted(
          event,
          event.data.object as Stripe.Subscription,
        );
        break;
      case "customer.subscription.deleted":
        await handleSubscriptionDeleted(
          event,
          event.data.object as Stripe.Subscription,
        );
        break;
      case "invoice.payment_failed":
        await handleInvoicePaymentFailed(
          event,
          event.data.object as Stripe.Invoice,
        );
        break;
      case "invoice.payment_succeeded":
        await handleInvoicePaymentSucceeded(
          event,
          event.data.object as Stripe.Invoice,
        );
        break;
      default:
        // Anything else (e.g. customer.created, charge.succeeded) is logged
        // but acknowledged so Stripe doesn't retry it forever.
        console.log(
          `[stripe-webhook] unhandled event type: ${event.type} (id=${event.id})`,
        );
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(
      `[stripe-webhook] handler for ${event.type} (id=${event.id}) threw:`,
      message,
    );
    // 500 → Stripe retries. Handlers are idempotent so retries converge.
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}
