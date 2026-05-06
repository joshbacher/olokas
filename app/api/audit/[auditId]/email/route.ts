import { NextResponse } from "next/server";
import { z } from "zod";
import { generateMockReport } from "@/lib/audit/mock-report";
import { renderFreeAuditReportEmail } from "@/lib/audit/render-email";

// POST /api/audit/[auditId]/email — renders the free-audit report email for
// the given audit and returns { subject, preview, html }.
//
// Phase 2.6 stub. We don't have audit persistence yet (Phase 3), so the
// caller hands us the same {domain, queries} they submitted and we
// re-derive the deterministic mock report. When persistence lands, this
// route will fetch the audit by id and the request body will collapse to
// nothing.
//
// Real Resend dispatch lives in Phase 5 — this route only renders.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const requestSchema = z.object({
  domain: z.string().trim().min(1).max(2048),
  queries: z.array(z.string()).min(1).max(50),
});

export async function POST(
  request: Request,
  context: { params: { auditId: string } }
) {
  const { auditId } = context.params;
  if (!UUID_RE.test(auditId)) {
    return NextResponse.json(
      { error: "Invalid audit id." },
      { status: 400 }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be JSON." },
      { status: 400 }
    );
  }

  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid email render request.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const queries = parsed.data.queries
    .map((q) => q.trim())
    .filter((q) => q.length > 0);
  if (queries.length < 1) {
    return NextResponse.json(
      { error: "Add at least one query." },
      { status: 400 }
    );
  }

  const report = generateMockReport(parsed.data.domain, queries);

  const origin = new URL(request.url).origin;
  const reportUrl = `${origin}/audit/${auditId}`;

  const rendered = renderFreeAuditReportEmail(report, {
    baseUrl: origin,
    reportUrl,
  });

  return NextResponse.json(
    {
      auditId,
      subject: rendered.subject,
      preview: rendered.preview,
      html: rendered.html,
    },
    { status: 200 }
  );
}
