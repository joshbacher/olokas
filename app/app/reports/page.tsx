import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

// Phase 3.7 — /app/reports — list view of historical reports.
//
// Server component. The /app/* layout has already verified the auth session
// and ensured a customers row exists; we re-call ensureCustomerRecord() here
// only because the React.cache() wrapper makes the second call free, and it
// keeps the page self-contained.
//
// Data fetch:
//   - SELECT id, period_start, period_end, status, sent_at, created_at FROM
//     reports, ordered by period_end DESC. RLS scopes to the current customer
//     via the migration's "reports_owner_select" policy (auth.uid() =
//     customer_id), so we don't need an explicit .eq("customer_id", …).
//   - The reports table also has content_html / content_pdf_url columns;
//     we don't fetch those here — they're large and only the per-report
//     viewer (3.7's stub for now, full impl in Phase 5.2) needs them.
//
// Render branches:
//   - No rows → friendly empty state copy explaining the weekly cadence,
//     pointing at /app/queries for users who haven't set anything up yet.
//   - One or more rows → table with period_end / status badge / view link.
//
// Per the spec, the view link goes to /app/reports/[id], where Phase 5.2
// renders the full HTML report. We ship a small stub at that path in this
// commit so the link doesn't 404.

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

type ReportStatus = "pending" | "ready" | "sent" | "failed";

interface ReportRowFromSupabase {
  id: string;
  period_start: string;
  period_end: string;
  status: ReportStatus;
  sent_at: string | null;
  created_at: string;
}

const REPORTS_FETCH_LIMIT = 200;

export default async function ReportsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The layout has already gated /app/* on a real session; this is defensive
  // narrowing for TS so we never end up dereferencing a null user below.
  if (!user || !user.email) {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to see your reports.
        </p>
      </div>
    );
  }
  // Free dedupe — layout already populated this in the same request.
  await ensureCustomerRecord(user.id, user.email);

  const { data, error } = await supabase
    .from("reports")
    .select("id, period_start, period_end, status, sent_at, created_at")
    .order("period_end", { ascending: false })
    .limit(REPORTS_FETCH_LIMIT);

  // We don't surface DB errors directly to the user (no useful action they
  // can take) — log and fall through to the empty state. Logging here gives
  // operator visibility via the Vercel function logs.
  if (error) {
    console.error("[reports] failed to load reports", {
      message: error.message,
      code: error.code,
    });
  }

  const rows: ReportRowFromSupabase[] = (data ?? []) as ReportRowFromSupabase[];

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Reports</h1>
        <p className="text-sm text-muted-foreground">
          Weekly summaries of your AI search visibility, generated from each
          completed scan.
        </p>
      </header>

      {rows.length === 0 ? <EmptyState /> : <ReportsTable rows={rows} />}
    </div>
  );
}

function EmptyState() {
  return (
    <section
      aria-labelledby="reports-empty-heading"
      className="rounded-lg border border-dashed bg-card px-6 py-10 text-center"
    >
      <h2
        id="reports-empty-heading"
        className="text-base font-semibold tracking-tight"
      >
        No reports yet
      </h2>
      <p className="mx-auto mt-2 max-w-[480px] text-sm text-muted-foreground">
        Reports are generated weekly. You&apos;ll see your first report after
        your first scan completes.
      </p>
      <p className="mt-3 text-xs text-muted-foreground">
        Haven&apos;t added a query yet?{" "}
        <Link
          href="/app/queries"
          className="text-foreground underline underline-offset-2 hover:text-accent"
        >
          Add one in Queries.
        </Link>
      </p>
    </section>
  );
}

function ReportsTable({
  rows,
}: {
  rows: ReadonlyArray<ReportRowFromSupabase>;
}) {
  return (
    <section aria-labelledby="reports-table-heading">
      <header className="mb-3 flex items-baseline justify-between">
        <h2
          id="reports-table-heading"
          className="text-base font-semibold tracking-tight"
        >
          All reports
        </h2>
        <span className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? "report" : "reports"}
        </span>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sent</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                <TableCell className="text-foreground">
                  <span className="tabular-nums">
                    {formatPeriod(row.period_start, row.period_end)}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge status={row.status} />
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {row.sent_at ? formatIsoDate(row.sent_at) : "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Link
                    href={`/app/reports/${row.id}`}
                    className="text-sm font-medium text-foreground underline underline-offset-2 hover:text-accent"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

// StatusBadge — maps the four enum values defined in
// supabase/migrations/0001_initial.sql (CHECK status IN ('pending', 'ready',
// 'sent', 'failed')) onto the project's Badge variants.
//
// We default to outline for unknown statuses so a future enum addition won't
// crash the row — only mis-style it.
function StatusBadge({ status }: { status: ReportStatus | string }) {
  const { label, variant } = describeStatus(status);
  return (
    <Badge
      variant={variant}
      className={cn("uppercase tracking-wider text-[10px]")}
    >
      {label}
    </Badge>
  );
}

type BadgeVariant =
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "accent";

function describeStatus(status: string): {
  label: string;
  variant: BadgeVariant;
} {
  switch (status) {
    case "pending":
      return { label: "Pending", variant: "secondary" };
    case "ready":
      return { label: "Ready", variant: "accent" };
    case "sent":
      return { label: "Sent", variant: "default" };
    case "failed":
      return { label: "Failed", variant: "destructive" };
    default:
      return { label: status, variant: "outline" };
  }
}

// formatPeriod — "May 4 → May 10, 2026" style label for a (period_start,
// period_end) pair. Uses a fixed UTC formatter to keep server/client output
// identical (avoids hydration wobble from Intl locale differences).
function formatPeriod(periodStart: string, periodEnd: string): string {
  const start = parseUtcDate(periodStart);
  const end = parseUtcDate(periodEnd);
  if (!start || !end) {
    return `${periodStart} → ${periodEnd}`;
  }
  const startLabel = `${MONTHS[start.month]} ${start.day}`;
  const endLabel = `${MONTHS[end.month]} ${end.day}, ${end.year}`;
  return `${startLabel} → ${endLabel}`;
}

function formatIsoDate(iso: string): string {
  // Render only the YYYY-MM-DD portion; the seconds-precision sent_at column
  // includes a TIMESTAMPTZ value but for the list view a date is enough.
  const parsed = parseUtcDate(iso);
  if (!parsed) return iso;
  const mm = String(parsed.month + 1).padStart(2, "0");
  const dd = String(parsed.day).padStart(2, "0");
  return `${parsed.year}-${mm}-${dd}`;
}

const MONTHS: ReadonlyArray<string> = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

interface ParsedDate {
  year: number;
  month: number;
  day: number;
}

function parseUtcDate(value: string): ParsedDate | null {
  // Accept either a YYYY-MM-DD DATE or a full TIMESTAMPTZ ISO string.
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth(),
    day: date.getUTCDate(),
  };
}
