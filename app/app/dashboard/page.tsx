import type { Metadata } from "next";
import Link from "next/link";

import { createClient } from "@/lib/supabase/server";
import {
  OverviewCards,
} from "@/components/dashboard/overview-cards";
import {
  RecentActivity,
  type DashboardScanRow,
} from "@/components/dashboard/recent-activity";
import { Button } from "@/components/ui/button";

// Phase 3.5 — Dashboard overview page.
//
// Server component. The /app/* layout has already verified the auth session
// and ensured a customers row exists; we re-call supabase.auth.getUser() here
// only because RLS scopes the data we read by user.id under the hood (the
// anon-key ssr client carries the session cookie, so every SELECT below is
// implicitly scoped via the RLS policies in supabase/migrations/0001_initial.sql).
//
// What we render:
//   - Page header with greeting and a link to /app/queries.
//   - <OverviewCards /> — four stat cards: domains, queries, last scan, avg score.
//   - Either <RecentActivity /> (last 10 scan_results) or an empty state CTA
//     pointing the user at /app/queries.
//
// Performance notes:
//   - We fan out three queries in parallel: domain count (head=true, no rows),
//     query count (head=true, no rows), and the recent scans fetch.
//   - The recent-scans query is bounded at 200 rows so the latest-per-(query,
//     engine) reduction stays cheap. With a Pro plan's 50-query × 4-engine
//     ceiling, 200 rows comfortably covers "the most recent state of every
//     monitored slot" plus a little headroom for fresh scans.
//   - The Supabase select uses an embedded relationship (customer_queries:query_id)
//     to grab the query text without a second round-trip; it's typed via a
//     local interface rather than a generated database.types module (we don't
//     ship one yet — Phase 3 ships features rather than tooling).
//
// Empty state: a fresh account has no domains, no queries, and no scans, so
// instead of rendering an empty table we route the user to /app/queries with
// a "Add your first domain" CTA. We still render the four stat cards above
// the empty state — they read 0 / 0 / — / —, which is honest signal.

export const metadata: Metadata = { title: "Dashboard" };
export const dynamic = "force-dynamic";

interface ScanFromSupabase {
  id: string;
  query_id: string;
  engine: string;
  geo_score: number | null;
  target_appeared: boolean | null;
  scanned_at: string;
  // Supabase ssr v2 returns embedded single-FK relationships as either an
  // object or null. We accept both shapes defensively to avoid a runtime
  // surprise on schemas where the FK metadata makes Supabase emit an array.
  customer_queries:
    | { query: string | null }
    | { query: string | null }[]
    | null;
}

const SCAN_FETCH_LIMIT = 200;
const RECENT_ACTIVITY_LIMIT = 10;

export default async function DashboardPage() {
  const supabase = createClient();
  // We don't strictly need the user object here — RLS handles scoping — but
  // pulling it lets us greet by email and keeps the auth state explicit at
  // the page level. The layout has already gated /app/* on a real session,
  // so this is a near-free cookie read.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [domainsRes, queriesRes, scansRes] = await Promise.all([
    supabase
      .from("domains")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("customer_queries")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("scan_results")
      .select(
        "id, query_id, engine, geo_score, target_appeared, scanned_at, customer_queries:query_id (query)"
      )
      .order("scanned_at", { ascending: false })
      .limit(SCAN_FETCH_LIMIT),
  ]);

  const domainCount = domainsRes.count ?? 0;
  const queryCount = queriesRes.count ?? 0;
  const allScans: ScanFromSupabase[] = (scansRes.data ?? []) as ScanFromSupabase[];

  // Latest scan per (query_id, engine) pair — `allScans` is ordered desc by
  // scanned_at, so the first sighting of each composite key is the freshest.
  const latestByKey = new Map<string, ScanFromSupabase>();
  for (const scan of allScans) {
    const key = `${scan.query_id}::${scan.engine}`;
    if (!latestByKey.has(key)) {
      latestByKey.set(key, scan);
    }
  }

  const latestScores: number[] = [];
  for (const scan of latestByKey.values()) {
    if (typeof scan.geo_score === "number") {
      latestScores.push(scan.geo_score);
    }
  }

  const avgScore =
    latestScores.length === 0
      ? null
      : Math.round(
          latestScores.reduce((a, b) => a + b, 0) / latestScores.length
        );

  const lastScanAt = allScans.length > 0 ? allScans[0].scanned_at : null;

  const recentRows: DashboardScanRow[] = allScans
    .slice(0, RECENT_ACTIVITY_LIMIT)
    .map((scan) => ({
      id: scan.id,
      engine: scan.engine,
      geo_score: scan.geo_score,
      target_appeared: scan.target_appeared,
      scanned_at: scan.scanned_at,
      query_text: extractQueryText(scan.customer_queries),
    }));

  const isFreshAccount =
    domainCount === 0 && queryCount === 0 && allScans.length === 0;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {isFreshAccount
            ? "Welcome to Olokas. Add a domain to start measuring AI search visibility."
            : `Signed in as ${user?.email ?? "your account"}.`}
        </p>
      </header>

      <OverviewCards
        domainCount={domainCount}
        queryCount={queryCount}
        lastScanAt={lastScanAt}
        avgScore={avgScore}
      />

      {isFreshAccount ? (
        <EmptyState />
      ) : recentRows.length === 0 ? (
        <NoScansYet />
      ) : (
        <RecentActivity scans={recentRows} />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <section
      aria-labelledby="dashboard-empty-heading"
      className="rounded-lg border border-dashed bg-card px-6 py-10 text-center"
    >
      <h2
        id="dashboard-empty-heading"
        className="text-base font-semibold tracking-tight"
      >
        Nothing to show yet
      </h2>
      <p className="mx-auto mt-2 max-w-[420px] text-sm text-muted-foreground">
        You haven&apos;t added a domain or any queries. Add your first domain
        in <span className="text-foreground">Queries</span> to schedule your
        first scan.
      </p>
      <div className="mt-5 flex justify-center">
        <Button asChild>
          <Link href="/app/queries">Add your first domain</Link>
        </Button>
      </div>
    </section>
  );
}

function NoScansYet() {
  // The user has set up domains/queries but no scan_results have landed yet.
  // Different copy from the fully-fresh account — they're not at the start;
  // they're between scheduling and first scan completing.
  return (
    <section
      aria-labelledby="dashboard-no-scans-heading"
      className="rounded-lg border border-dashed bg-card px-6 py-10 text-center"
    >
      <h2
        id="dashboard-no-scans-heading"
        className="text-base font-semibold tracking-tight"
      >
        Your first scan is on its way
      </h2>
      <p className="mx-auto mt-2 max-w-[420px] text-sm text-muted-foreground">
        Scans run on a schedule and the first one usually completes within an
        hour. This page will populate automatically.
      </p>
      <div className="mt-5 flex justify-center">
        <Button asChild variant="ghost">
          <Link href="/app/queries">Manage queries</Link>
        </Button>
      </div>
    </section>
  );
}

// extractQueryText handles both the object-shape and array-shape Supabase
// emits for embedded single-FK relationships. The migration's
// scan_results.query_id → customer_queries.id FK is single-row, but the
// supabase-js types are conservative; we accept whichever runtime form lands.
function extractQueryText(
  cq:
    | { query: string | null }
    | { query: string | null }[]
    | null
    | undefined
): string | null {
  if (!cq) return null;
  if (Array.isArray(cq)) {
    return cq[0]?.query ?? null;
  }
  return cq.query ?? null;
}
