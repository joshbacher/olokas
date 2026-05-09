import * as React from "react";

import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { formatRelativeTime } from "./overview-cards";

// Phase 3.5 — last 10 scan_results across all queries, table format.
//
// Data shape mirrors the customer-RLS-scoped select in the dashboard page.
// We present:
//   - Query (truncated)
//   - Engine (mapped to display label)
//   - GEO score (badge, color band)
//   - Target appeared (yes / no / —)
//   - Scanned (relative time)
//
// Pure layout — no client state. Empty state ("Reports show up here once your
// first scan completes") is rendered by the parent dashboard page when
// `scans.length === 0`, so this component always has rows to show when called.

export type DashboardEngineKey =
  | "chatgpt"
  | "perplexity"
  | "google_aio"
  | "claude";

const ENGINE_LABELS: Readonly<Record<DashboardEngineKey, string>> = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  google_aio: "Google AI Overviews",
  claude: "Claude",
};

export interface DashboardScanRow {
  id: string;
  engine: string;
  geo_score: number | null;
  target_appeared: boolean | null;
  scanned_at: string;
  query_text: string | null;
}

export function RecentActivity({
  scans,
}: {
  scans: ReadonlyArray<DashboardScanRow>;
}) {
  return (
    <section aria-labelledby="dashboard-recent-activity-heading">
      <header className="mb-3 flex items-baseline justify-between">
        <h2
          id="dashboard-recent-activity-heading"
          className="text-base font-semibold tracking-tight"
        >
          Recent activity
        </h2>
        <span className="text-xs text-muted-foreground">
          Last {scans.length} {scans.length === 1 ? "scan" : "scans"}
        </span>
      </header>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Query</TableHead>
              <TableHead>Engine</TableHead>
              <TableHead className="text-right">GEO</TableHead>
              <TableHead>Cited</TableHead>
              <TableHead className="text-right">Scanned</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {scans.map((scan) => (
              <TableRow key={scan.id}>
                <TableCell className="max-w-[260px] truncate text-foreground">
                  {scan.query_text ?? "—"}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {engineLabel(scan.engine)}
                </TableCell>
                <TableCell className="text-right">
                  <ScoreBadge score={scan.geo_score} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {scan.target_appeared === null
                    ? "—"
                    : scan.target_appeared
                      ? "Yes"
                      : "No"}
                </TableCell>
                <TableCell className="text-right tabular-nums text-muted-foreground">
                  {formatRelativeTime(scan.scanned_at)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function engineLabel(engine: string): string {
  if (isKnownEngine(engine)) return ENGINE_LABELS[engine];
  return engine;
}

function isKnownEngine(engine: string): engine is DashboardEngineKey {
  return engine in ENGINE_LABELS;
}

// ScoreBadge — three bands matching the audit-report convention.
function ScoreBadge({ score }: { score: number | null }) {
  if (score === null) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold text-muted-foreground"
        )}
        aria-label="No GEO score yet"
      >
        —
      </span>
    );
  }
  const variant: "accent" | "secondary" | "destructive" =
    score >= 70 ? "accent" : score >= 45 ? "secondary" : "destructive";
  return (
    <Badge variant={variant} className="tabular-nums">
      {score}
    </Badge>
  );
}
