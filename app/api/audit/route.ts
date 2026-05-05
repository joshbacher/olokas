import { NextResponse } from "next/server";

// POST /api/audit — accepts { domain, email, queries[] }, enqueues scan jobs,
// returns { auditId, statusUrl } so the client can poll.
// Phase 2 fills in the real implementation. For now, returns 501 Not Implemented.

export async function POST() {
  return NextResponse.json(
    { error: "Free audit endpoint arrives in Phase 2" },
    { status: 501 }
  );
}
