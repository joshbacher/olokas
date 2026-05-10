import type { Metadata } from "next";
import Link from "next/link";

import { AddDomainForm } from "@/components/queries/add-domain-form";
import { AddQueryForm } from "@/components/queries/add-query-form";
import {
  DomainsList,
  type DomainListItem,
} from "@/components/queries/domains-list";
import {
  QueriesTable,
  type QueryRow,
} from "@/components/queries/queries-table";
import { Button } from "@/components/ui/button";
import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { createClient } from "@/lib/supabase/server";

// Phase 3.6 — /app/queries — domain & query CRUD with plan-limit enforcement.
//
// What this page renders, top to bottom:
//   1. Header with title, blurb, and a 3-stat strip (Plan / Domains used /
//      Queries used) so users can see at a glance where they are against
//      their plan.
//   2. Domains section: list of the customer's domains (with delete) plus
//      either an "Add domain" form, or — if at domain_limit — an upgrade
//      callout pointing at /pricing.
//   3. Queries section: table of customer_queries with inline edit + delete,
//      plus either an "Add query" form, an upgrade callout, or an
//      "Add a domain first" message when no domains exist yet.
//
// Data fetch:
//   - ensureCustomerRecord is React.cache()'d, so re-calling it after the
//     layout already did is a free dedupe (no extra DB round-trip).
//   - Domains and customer_queries are fetched in parallel via the anon
//     Supabase client, scoped by RLS (auth.uid() = customer_id) — no
//     explicit .eq("customer_id", …) needed.
//   - We embed nothing across tables: instead we resolve query→domain
//     names client-side via a Map lookup. Smaller payload, no FK shape
//     ambiguity.
//
// Plan-limit enforcement happens in two layers:
//   - This page chooses between rendering the form and the upgrade CTA.
//   - The corresponding server action re-checks the count before INSERT
//     so a stale render can't be exploited.

export const metadata: Metadata = { title: "Queries" };
export const dynamic = "force-dynamic";

interface DomainFromSupabase {
  id: string;
  domain: string;
  created_at: string;
}

interface QueryFromSupabase {
  id: string;
  query: string;
  is_priority: boolean;
  domain_id: string;
  created_at: string;
}

const PLAN_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  agency: "Agency",
};

export default async function QueriesPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  // The /app/* layout already redirects to /login when there's no session;
  // this guard is a TS narrowing belt to keep ensureCustomerRecord happy
  // (and a defensive no-op if the layout's auth state ever drifts from
  // ours within the same render).
  if (!user || !user.email) {
    return null;
  }
  const customer = await ensureCustomerRecord(user.id, user.email);

  const [domainsRes, queriesRes] = await Promise.all([
    supabase
      .from("domains")
      .select("id, domain, created_at")
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_queries")
      .select("id, query, is_priority, domain_id, created_at")
      .order("created_at", { ascending: false }),
  ]);

  const rawDomains = (domainsRes.data ?? []) as DomainFromSupabase[];
  const rawQueries = (queriesRes.data ?? []) as QueryFromSupabase[];

  const queryCountByDomain = new Map<string, number>();
  for (const q of rawQueries) {
    queryCountByDomain.set(
      q.domain_id,
      (queryCountByDomain.get(q.domain_id) ?? 0) + 1,
    );
  }
  const domainNameById = new Map<string, string>();
  for (const d of rawDomains) {
    domainNameById.set(d.id, d.domain);
  }

  const domainListItems: DomainListItem[] = rawDomains.map((d) => ({
    id: d.id,
    domain: d.domain,
    query_count: queryCountByDomain.get(d.id) ?? 0,
  }));

  const queryRows: QueryRow[] = rawQueries.map((q) => ({
    id: q.id,
    query: q.query,
    is_priority: q.is_priority,
    created_at: q.created_at,
    domain: domainNameById.get(q.domain_id) ?? null,
  }));

  const domainsUsed = rawDomains.length;
  const queriesUsed = rawQueries.length;
  const atDomainLimit = domainsUsed >= customer.domain_limit;
  const atQueryLimit = queriesUsed >= customer.query_limit;
  const planLabel = PLAN_LABEL[customer.plan] ?? customer.plan;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Queries</h1>
        <p className="max-w-prose text-sm text-muted-foreground">
          The domains and search queries Olokas measures against AI engines.
          Add a domain, then attach the queries you care about — we&apos;ll
          report visibility for each one.
        </p>
        <dl className="mt-1 grid grid-cols-3 gap-3 text-sm sm:max-w-md">
          <div className="rounded-md border bg-card px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Plan
            </dt>
            <dd className="mt-0.5 text-sm font-medium">{planLabel}</dd>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Domains
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {domainsUsed} / {customer.domain_limit}
            </dd>
          </div>
          <div className="rounded-md border bg-card px-3 py-2">
            <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Queries
            </dt>
            <dd className="mt-0.5 text-sm font-medium tabular-nums">
              {queriesUsed} / {customer.query_limit}
            </dd>
          </div>
        </dl>
      </header>

      <section
        aria-labelledby="domains-heading"
        className="flex flex-col gap-4"
      >
        <div>
          <h2
            id="domains-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Domains
          </h2>
          <p className="text-sm text-muted-foreground">
            The websites you&apos;re monitoring. Each query attaches to one
            domain.
          </p>
        </div>
        <DomainsList domains={domainListItems} />
        <div className="rounded-lg border bg-card p-5">
          {atDomainLimit ? (
            <UpgradeCallout
              title={`You're at your plan's domain limit (${customer.domain_limit}).`}
              body="Upgrade to monitor more sites with Olokas."
            />
          ) : (
            <AddDomainForm />
          )}
        </div>
      </section>

      <section
        aria-labelledby="queries-heading"
        className="flex flex-col gap-4"
      >
        <div>
          <h2
            id="queries-heading"
            className="text-lg font-semibold tracking-tight"
          >
            Queries
          </h2>
          <p className="text-sm text-muted-foreground">
            Each query is what we ask AI engines, to see whether your domain
            shows up. Priority queries are scanned more frequently than the
            default cadence.
          </p>
        </div>
        <QueriesTable queries={queryRows} />
        <div className="rounded-lg border bg-card p-5">
          {rawDomains.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Add a domain above to start adding queries.
            </p>
          ) : atQueryLimit ? (
            <UpgradeCallout
              title={`You're at your plan's query limit (${customer.query_limit}).`}
              body="Upgrade to track more search queries."
            />
          ) : (
            <AddQueryForm
              domains={rawDomains.map((d) => ({
                id: d.id,
                domain: d.domain,
              }))}
            />
          )}
        </div>
      </section>
    </div>
  );
}

function UpgradeCallout({
  title,
  body,
}: {
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <Button asChild variant="accent" size="sm">
        <Link href="/pricing">View plans</Link>
      </Button>
    </div>
  );
}
