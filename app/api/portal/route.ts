import { NextResponse } from "next/server";

// POST /api/portal — creates a Stripe Customer Portal session for the
// authenticated user, returns the redirect URL. Phase 3 implementation.
export async function POST() {
  return NextResponse.json(
    { error: "Customer Portal endpoint arrives in Phase 3" },
    { status: 501 }
  );
}
