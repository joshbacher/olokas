import * as React from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// Phase 3.5 — Dashboard overview stat cards.
//
// Four read-only summary cards rendered above the recent-activity table:
//   1. Total domains      — count of public.domains rows for the customer
//   2. Active queries     — count of public.customer_queries rows
//   3. Last scan          — most recent scan_results.scanned_at, in
//                           "X hours / days ago" relative form, or "—" if none
//   4. Avg GEO score      — average of the latest geo_score per (query, engine)
//                           pair across all customer scans, 0–100, or "—" if no
//                           scored scan exists yet
//
// All inputs are pre-aggregated by the dashboard server component so this
// stays a pure presentational unit — server-renderable, no client state.

export interface OverviewCardsProps {
  domainCount: number;
  queryCount: number;
  lastScanAt: string | null;
  avgScore: number | null;
}

export function OverviewCards({
  domainCount,
  queryCount,
  lastScanAt,
  avgScore,
}: OverviewCardsProps) {
  return (
    <section
      aria-label="Account overview"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4"
    >
      <StatCard label="Total domains" value={String(domainCount)} />
      <StatCard label="Active queries" value={String(queryCount)} />
      <StatCard
        label="Last scan"
        value={lastScanAt ? formatRelativeTime(lastScanAt) : "—"}
        sub={lastScanAt ? formatAbsoluteDate(lastScanAt) : "No scans yet"}
      />
      <StatCard
        label="Avg GEO score"
        value={avgScore === null ? "—" : String(avgScore)}
        sub={avgScore === null ? "Across engines" : "Average across engines"}
      />
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-semibold tracking-tight tabular-nums">
          {value}
        </div>
        {sub ? (
          <div className="mt-1 text-xs text-muted-foreground">{sub}</div>
        ) : null}
      </CardContent>
    </Card>
  );
}

// formatRelativeTime — produces a deterministic, server-renderable
// "5 minutes ago" / "3 hours ago" / "2 days ago" string. We intentionally
// avoid `Intl.RelativeTimeFormat` here because Next 14's RSC prerender path
// will hash this output between runs; a stable formatter keeps that diff
// quiet. Falls back to an absolute date if the input is older than ~30 days.
export function formatRelativeTime(iso: string, now: Date = new Date()): string {
  const then = new Date(iso);
  const ms = now.getTime() - then.getTime();
  if (Number.isNaN(ms)) return "—";
  if (ms < 0) return "just now";

  const seconds = Math.floor(ms / 1000);
  if (seconds < 45) return "just now";

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 30) {
    return days === 1 ? "1 day ago" : `${days} days ago`;
  }

  return formatAbsoluteDate(iso);
}

// formatAbsoluteDate — UTC, fixed-format. Stable across server/client.
export function formatAbsoluteDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const months = [
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
  return `${months[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}
