import { NextResponse } from "next/server";

// GET /api/audit/[auditId]/status — stubbed status endpoint that the polling
// page hits every few seconds while a free audit runs.
//
// Phase 3 will replace this with a real lookup against the Supabase
// `free_audits` table. For 2.3 we just validate the shape of the id and
// always return a "queued" status — the client carries the 90s timer and
// flips to "ready" on its own.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type StatusResponse = {
  auditId: string;
  status: "queued" | "running" | "ready";
};

export async function GET(
  _request: Request,
  context: { params: { auditId: string } }
) {
  const { auditId } = context.params;
  if (!UUID_RE.test(auditId)) {
    return NextResponse.json(
      { error: "Invalid audit id." },
      { status: 400 }
    );
  }

  const body: StatusResponse = { auditId, status: "queued" };
  return NextResponse.json(body, { status: 200 });
}
