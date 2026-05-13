import { NextResponse } from "next/server";

import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe/client";

// POST /api/portal
//
// Creates a Stripe Customer Portal session for the authenticated user and
// returns its hosted URL. The settings page's <ManageBillingButton> POSTs
// here with an empty body, reads `{ url }` from the response, and calls
// `window.location.assign(url)` to take the user off-site to Stripe's hosted
// billing UI (where they can update payment methods, change plans, cancel,
// download invoices, etc.).
//
// Auth model mirrors /api/checkout: an anon-key Supabase ssr client carries
// the session cookie, `supabase.auth.getUser()` validates it, then
// `ensureCustomerRecord` (React.cache()-wrapped, the same helper the /app/*
// layout uses) loads the customers row that carries `stripe_customer_id`.
// A user can only ever create a portal session against their own Stripe id
// — the id is read from THEIR customers row, never from the request body.
//
// All error responses are plain JSON with a short, non-leaky message. Stripe
// SDK errors are caught and mapped to a 500 with a generic message; raw
// Stripe error messages never reach the client. The route is `runtime: nodejs`
// because the Stripe SDK uses Node's `crypto` and isn't usable from Edge.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) {
    throw new Error("Missing NEXT_PUBLIC_SITE_URL");
  }
  // Strip a trailing slash so we can append paths cleanly.
  return raw.replace(/\/+$/, "");
}

export async function POST() {
  // -----------------------------------------------------------------------
  // 1. Authenticate the request.
  // -----------------------------------------------------------------------
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json(
      { error: "You must be signed in to manage billing" },
      { status: 401 },
    );
  }

  // -----------------------------------------------------------------------
  // 2. Load the customers row. ensureCustomerRecord is the canonical helper
  //    the /app/* layout already calls, so within a single request this is
  //    a cached hit; in isolation (a direct POST without traversing the
  //    layout) it does one round-trip to fetch — or recover — the row.
  // -----------------------------------------------------------------------
  let customer;
  try {
    customer = await ensureCustomerRecord(user.id, user.email);
  } catch (err) {
    console.error(
      "[portal] ensureCustomerRecord failed for user",
      user.id,
      err,
    );
    return NextResponse.json(
      { error: "Account isn't ready for billing portal access yet. Please try again." },
      { status: 500 },
    );
  }

  // -----------------------------------------------------------------------
  // 3. Require a stripe_customer_id. Per spec: 404 if not set. A free-plan
  //    user who has never started a checkout has no Stripe customer on file
  //    — there's nothing to manage in the billing portal yet. The settings
  //    page already gates the button on this same field and shows
  //    "You're on the free plan…", so a real-world hit here implies either
  //    a deep link or a state mismatch; either way, 404 is the honest
  //    response.
  // -----------------------------------------------------------------------
  const stripeCustomerId = customer.stripe_customer_id;
  if (!stripeCustomerId) {
    return NextResponse.json(
      { error: "No subscription on file yet" },
      { status: 404 },
    );
  }

  // -----------------------------------------------------------------------
  // 4. Build the return URL. Trailing slashes on NEXT_PUBLIC_SITE_URL are
  //    common (e.g. "https://olokas.com/") and would produce
  //    "https://olokas.com//app/settings"; siteUrl() strips them.
  // -----------------------------------------------------------------------
  let base: string;
  try {
    base = siteUrl();
  } catch (err) {
    console.error("[portal]", err);
    return NextResponse.json(
      { error: "Site URL isn't configured" },
      { status: 503 },
    );
  }

  // -----------------------------------------------------------------------
  // 5. Create the Stripe portal session. getStripe() throws if
  //    STRIPE_SECRET_KEY isn't set; we map that to a 503 so the client can
  //    distinguish "Stripe isn't configured at all" from "Stripe rejected
  //    this request".
  // -----------------------------------------------------------------------
  let stripe;
  try {
    stripe = getStripe();
  } catch (err) {
    console.error("[portal] Stripe is not configured:", err);
    return NextResponse.json(
      { error: "Payments aren't configured yet" },
      { status: 503 },
    );
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${base}/app/settings`,
    });

    if (!session.url) {
      // Stripe documents `url` as always set for hosted portal sessions, but
      // the SDK types are nullable — guard so the client never gets
      // `{ url: undefined }`.
      console.error(
        "[portal] Stripe returned a session with no url (id=" +
          session.id +
          ")",
      );
      return NextResponse.json(
        { error: "Could not open the billing portal. Please try again." },
        { status: 500 },
      );
    }

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error(
      "[portal] Stripe billingPortal.sessions.create failed for user",
      user.id,
      err,
    );
    return NextResponse.json(
      { error: "Could not open the billing portal. Please try again." },
      { status: 500 },
    );
  }
}
