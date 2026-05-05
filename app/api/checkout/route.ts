import { NextResponse } from "next/server";

// POST /api/checkout — accepts { priceId }, creates Stripe Checkout session,
// returns the redirect URL. Phase 3 implementation.
export async function POST() {
  return NextResponse.json(
    { error: "Checkout endpoint arrives in Phase 3" },
    { status: 501 }
  );
}
