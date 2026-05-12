import { NextResponse } from "next/server";
import { z } from "zod";

import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

// POST /api/checkout
//
// Creates a Stripe Checkout session for the authenticated user against one of
// the price IDs configured in the Vercel env (STRIPE_PRICE_*_MONTHLY /
// STRIPE_PRICE_*_ANNUAL — the six slots set up by `npm run stripe:setup` in
// 3.9). The frontend posts `{ priceId }`, gets back `{ url }`, and redirects
// the browser to Stripe's hosted checkout page.
//
// Auth model: anon-key Supabase client carries the user's session cookie via
// @supabase/ssr; `supabase.auth.getUser()` confirms the session. RLS isn't
// the gate here — Stripe doesn't see RLS — but the customers row that backs
// `stripe_customer_id` is looked up through `ensureCustomerRecord` (same
// React.cache()-hardened helper used by the /app/* layout), so a forged
// request can't reach another customer's Stripe id.
//
// All error responses are plain JSON with a short, non-leaky message. Stripe
// SDK errors are caught and mapped to either a 400 (request-shape problems)
// or a 500 (unexpected); raw Stripe error messages never reach the client.
//
// This handler is `runtime: nodejs` because the Stripe SDK uses Node's
// `crypto` and isn't usable from the Edge runtime.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BodySchema = z.object({
  priceId: z
    .string()
    .min(1, "priceId is required")
    // Stripe price IDs are always `price_…`. Hard-fail anything that doesn't
    // match before we even consult the allow-list — saves an env round-trip
    // and a meaningless allow-list miss.
    .regex(/^price_[A-Za-z0-9]+$/, "priceId is malformed"),
});

// The six env-var slots that 3.9 provisions. Read at request time (not at
// module load) so a freshly-rotated env var takes effect on the next request
// without a redeploy — useful when the operator pastes new IDs from
// `stripe:setup` into Vercel.
const PRICE_ENV_VARS = [
  "STRIPE_PRICE_STARTER_MONTHLY",
  "STRIPE_PRICE_STARTER_ANNUAL",
  "STRIPE_PRICE_PRO_MONTHLY",
  "STRIPE_PRICE_PRO_ANNUAL",
  "STRIPE_PRICE_AGENCY_MONTHLY",
  "STRIPE_PRICE_AGENCY_ANNUAL",
] as const;

function buildAllowedPriceIds(): Set<string> {
  const allowed = new Set<string>();
  for (const name of PRICE_ENV_VARS) {
    const value = process.env[name];
    if (value && value.trim()) {
      allowed.add(value.trim());
    }
  }
  return allowed;
}

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL");
  }
  // Strip a trailing slash so we can append paths cleanly.
  return raw.replace(/\/+$/, "");
}

export async function POST(req: Request) {
  // -----------------------------------------------------------------------
  // 1. Parse + validate the request body.
  // -----------------------------------------------------------------------
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { priceId } = parsed.data;

  // -----------------------------------------------------------------------
  // 2. Validate the priceId against the env allow-list.
  // -----------------------------------------------------------------------
  const allowed = buildAllowedPriceIds();
  if (allowed.size === 0) {
    // Operator hasn't pasted any of the STRIPE_PRICE_* env vars yet. Surface
    // a deterministic 503 rather than calling Stripe with no allow-list.
    console.error(
      "[checkout] no STRIPE_PRICE_* env vars are set; refusing checkout",
    );
    return NextResponse.json(
      { error: "Checkout isn't configured yet" },
      { status: 503 },
    );
  }
  if (!allowed.has(priceId)) {
    return NextResponse.json(
      { error: "Unknown price" },
      { status: 400 },
    );
  }

  // -----------------------------------------------------------------------
  // 3. Authenticate the request.
  // -----------------------------------------------------------------------
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json(
      { error: "You must be signed in to start checkout" },
      { status: 401 },
    );
  }

  // -----------------------------------------------------------------------
  // 4. Load (or recover) the customers row. ensureCustomerRecord is the same
  //    React.cache()-wrapped helper the /app/* layout uses, so this is the
  //    canonical source of truth for the user's Stripe linkage.
  // -----------------------------------------------------------------------
  let customer;
  try {
    customer = await ensureCustomerRecord(user.id, user.email);
  } catch (err) {
    console.error(
      "[checkout] ensureCustomerRecord failed for user",
      user.id,
      err,
    );
    return NextResponse.json(
      { error: "Account isn't ready for checkout yet. Please try again." },
      { status: 500 },
    );
  }

  // -----------------------------------------------------------------------
  // 5. Resolve the Stripe customer id, creating one on demand if needed.
  //    A fresh free-plan customer has no Stripe id; we mint one here and
  //    persist it via the service-role client (RLS would otherwise block the
  //    UPDATE since the anon-key client doesn't have a policy that lets it
  //    mutate `stripe_customer_id`).
  // -----------------------------------------------------------------------
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("[checkout] Stripe is not configured:", err);
    return NextResponse.json(
      { error: "Payments aren't configured yet" },
      { status: 503 },
    );
  }

  let stripeCustomerId = customer.stripe_customer_id;
  if (!stripeCustomerId) {
    try {
      const created = await stripe.customers.create({
        email: user.email,
        metadata: {
          // The webhook in app/api/webhooks/stripe/route.ts maps Stripe ->
          // Supabase via this id. client_reference_id on the Checkout
          // session (set below) carries the same value as a belt-and-braces
          // for `checkout.session.completed`.
          supabase_user_id: user.id,
        },
      });
      stripeCustomerId = created.id;

      const admin = createAdminClient();
      const { error: updateError } = await admin
        .from("customers")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);
      if (updateError) {
        // We've already created the Stripe customer; not persisting the id
        // means a future checkout would create a duplicate. Surface clearly
        // so the operator notices in logs, but proceed with the session
        // creation — the webhook handler is the eventually-consistent
        // backstop and will reconcile via metadata.supabase_user_id.
        console.error(
          "[checkout] failed to persist stripe_customer_id for user",
          user.id,
          updateError.message,
        );
      }
    } catch (err) {
      console.error(
        "[checkout] Stripe customer create failed for user",
        user.id,
        err,
      );
      return NextResponse.json(
        { error: "Could not start checkout. Please try again." },
        { status: 500 },
      );
    }
  }

  // -----------------------------------------------------------------------
  // 6. Create the Checkout session.
  // -----------------------------------------------------------------------
  let base: string;
  try {
    base = siteUrl();
  } catch (err) {
    console.error("[checkout]", err);
    return NextResponse.json(
      { error: "Site URL isn't configured" },
      { status: 503 },
    );
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: stripeCustomerId,
      // Stripe rejects passing both `customer` and `customer_email`; the
      // customer record carries the email already.
      line_items: [{ price: priceId, quantity: 1 }],
      allow_promotion_codes: true,
      // client_reference_id is what the webhook reads to find the right
      // Supabase user when `checkout.session.completed` lands — kept in
      // sync with stripe.customers.metadata.supabase_user_id above.
      client_reference_id: user.id,
      success_url: `${base}/app/onboarding?checkout_session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/pricing?checkout=cancelled`,
      subscription_data: {
        metadata: {
          supabase_user_id: user.id,
        },
      },
    });

    if (!session.url) {
      // Stripe is documented to always return a `url` for hosted sessions,
      // but the SDK types are nullable — guard so the client never gets
      // `{ url: undefined }`.
      console.error(
        "[checkout] Stripe returned a session with no url (id=" +
          session.id +
          ")",
      );
      return NextResponse.json(
        { error: "Could not start checkout. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(
      "[checkout] Stripe checkout.sessions.create failed for user",
      user.id,
      err,
    );
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 500 },
    );
  }
}
