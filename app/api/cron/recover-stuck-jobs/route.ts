import { NextResponse } from "next/server";

// Cron: recover-stuck-jobs
// Triggered by GitHub Actions (see .github/workflows/recover-stuck-jobs.yml).
// Authenticated via the CRON_SECRET shared between the workflow and this route.
// Implementation arrives in Phase 4 (scan jobs) and Phase 5 (reports).

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    ok: true,
    cron: "recover-stuck-jobs",
    note: "Stub. Real implementation pending phase 4 (scans) or phase 5 (reports).",
  });
}

// Allow GET for easy manual testing (still requires the secret).
export const GET = POST;
