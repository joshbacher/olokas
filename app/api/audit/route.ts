import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";

// POST /api/audit — accepts { domain, email, queries[] }, mints an audit id,
// and returns the URL the client can poll for status.
//
// Phase 3 will replace this stub with real persistence (Supabase) and a real
// scan-job dispatch. For 2.3 the goal is just: validate input, mint a UUID,
// hand back a status URL the polling page can hit.
//
// We deliberately do NOT persist anything yet — the polling page tolerates
// status calls for unknown ids and just runs out the 90s timer client-side.

const requestSchema = z.object({
  domain: z
    .string()
    .trim()
    .min(1, "Enter the domain you want to audit.")
    .max(2048),
  email: z
    .string()
    .trim()
    .min(3)
    .max(320)
    .email("That doesn't look like a valid email."),
  queries: z
    .array(z.string())
    .min(1, "Add at least one query.")
    .max(50, "Too many queries."),
});

function looksLikeDomain(value: string): boolean {
  const v = value.trim();
  if (!v) return false;
  try {
    const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const url = new URL(candidate);
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(url.hostname);
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
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
        error: "Invalid audit request.",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  const { domain, email } = parsed.data;
  const queries = parsed.data.queries
    .map((q) => q.trim())
    .filter((q) => q.length > 0);

  if (queries.length < 1) {
    return NextResponse.json(
      { error: "Add at least one query." },
      { status: 400 }
    );
  }

  if (!looksLikeDomain(domain)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid domain." },
      { status: 400 }
    );
  }

  // Reference the parsed email so the (currently unused) value is preserved
  // for Phase 3 wiring without tripping the no-unused-vars lint.
  void email;

  const auditId = randomUUID();
  const statusUrl = `/audit/${auditId}`;

  return NextResponse.json({ auditId, statusUrl }, { status: 202 });
}
