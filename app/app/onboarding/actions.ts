"use server";

import { redirect } from "next/navigation";

import { createClient, createAdminClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { suggestQueriesFromUrl } from "@/lib/queries/suggest";

// -------------------------------------------------------------------------
// Onboarding server actions
//
// getCtx() — confirms an authed session and returns the Supabase anon client
// (RLS-scoped) plus the customer record. Called at the top of each action.
//
// suggestQueriesForDomainAction — returns up to 10 suggested queries for a
// domain. Non-mutating, but implemented as a server action so the client
// component can call it without an API route.
//
// ensureDomainAction — idempotently inserts a domain row and returns its id,
// or returns the id of an existing row. Used in step 1.
//
// completeOnboardingAction — the "finish" path: inserts any not-yet-saved
// queries, attaches competitor domains to each query, inserts a scan job row
// for every query × engine combination, and marks onboarding complete.
// Redirects to /app/dashboard?onboarding=complete.
//
// skipOnboardingAction — just redirects to /app/dashboard without modifying
// any data. The absence of onboarding_completed_at serves as the implicit
// "skipped / incomplete" flag.
// -------------------------------------------------------------------------

const SCAN_ENGINES = ["chatgpt", "perplexity", "google_aio", "claude"] as const;
type Engine = (typeof SCAN_ENGINES)[number];

const HOST_RE = /^[a-z0-9.-]+\.[a-z]{2,}$/;
const MAX_DOMAIN_LEN = 253;
const MAX_QUERY_LEN = 500;
const MAX_COMPETITORS = 5;

// Extra query templates beyond what suggestQueriesFromUrl returns (5), so we
// can offer up to 10 options in step 2 without altering the shared utility.
const EXTENDED_TEMPLATES: readonly string[] = [
  "best AI search visibility tool for small business",
  "how to monitor ChatGPT mentions of my brand",
  "what is generative engine optimization",
  "how to track Perplexity citations",
  "AI SEO tools comparison",
];

function normalizeHostname(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, "");
    if (!HOST_RE.test(host)) return null;
    if (host.length > MAX_DOMAIN_LEN) return null;
    return host;
  } catch {
    return null;
  }
}

async function getCtx() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    throw new Error("Not authenticated");
  }
  const customer = await ensureCustomerRecord(user.id, user.email);
  return { supabase, customer, user };
}

// -------------------------------------------------------------------------
// suggestQueriesForDomainAction
// Returns up to 10 query suggestions for the given domain string.
// -------------------------------------------------------------------------
export async function suggestQueriesForDomainAction(
  domain: string,
): Promise<string[]> {
  // Basic sanitization — the function itself is robust to bad input, but we
  // cap the length before sending it across a network call.
  const trimmed = domain.trim().slice(0, MAX_DOMAIN_LEN);
  if (!trimmed) return [...EXTENDED_TEMPLATES].slice(0, 10);

  const base = await suggestQueriesFromUrl(trimmed);

  // Pad to 10 with non-overlapping extended templates.
  const seen = new Set(base.map((q) => q.toLowerCase()));
  const result = [...base];
  for (const tpl of EXTENDED_TEMPLATES) {
    if (result.length >= 10) break;
    if (!seen.has(tpl.toLowerCase())) {
      seen.add(tpl.toLowerCase());
      result.push(tpl);
    }
  }
  return result.slice(0, 10);
}

// -------------------------------------------------------------------------
// ensureDomainAction
// Idempotently inserts a domains row. Returns { ok, domainId, error? }.
// -------------------------------------------------------------------------
export async function ensureDomainAction(rawDomain: string): Promise<{
  ok: boolean;
  domainId: string | null;
  error?: string;
}> {
  const host = normalizeHostname(rawDomain);
  if (!host) {
    return { ok: false, domainId: null, error: "That doesn't look like a valid domain." };
  }

  const { supabase, customer } = await getCtx();

  // Check if row already exists (unique constraint: customer_id + domain).
  const { data: existing } = await supabase
    .from("domains")
    .select("id")
    .eq("domain", host)
    .maybeSingle();

  if (existing) {
    return { ok: true, domainId: existing.id as string };
  }

  // Plan-limit check.
  const { count, error: countErr } = await supabase
    .from("domains")
    .select("id", { count: "exact", head: true });
  if (countErr) {
    return { ok: false, domainId: null, error: "Could not check your domain count." };
  }
  if ((count ?? 0) >= customer.domain_limit) {
    return {
      ok: false,
      domainId: null,
      error: `You're at your plan's domain limit (${customer.domain_limit}). Upgrade to add more domains.`,
    };
  }

  const { data: inserted, error: insertErr } = await supabase
    .from("domains")
    .insert({ customer_id: customer.id, domain: host })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    // Race condition: another request beat us to the insert.
    if (insertErr?.code === "23505") {
      const { data: retried } = await supabase
        .from("domains")
        .select("id")
        .eq("domain", host)
        .maybeSingle();
      if (retried) return { ok: true, domainId: retried.id as string };
    }
    return { ok: false, domainId: null, error: "Could not save the domain." };
  }
  return { ok: true, domainId: inserted.id as string };
}

// -------------------------------------------------------------------------
// completeOnboardingAction
// Saves queries, competitors, and scan jobs; marks onboarding complete.
// -------------------------------------------------------------------------
export interface CompleteOnboardingInput {
  domainId: string;
  selectedQueries: string[];    // raw query strings, up to query_limit
  competitorDomains: string[];  // up to MAX_COMPETITORS per query
}

export async function completeOnboardingAction(
  input: CompleteOnboardingInput,
): Promise<{ ok: boolean; error?: string }> {
  const { domainId, selectedQueries, competitorDomains } = input;

  if (!domainId) return { ok: false, error: "No domain selected." };
  if (selectedQueries.length === 0) {
    return { ok: false, error: "Select at least one query." };
  }

  // Sanitize queries.
  const cleanQueries = selectedQueries
    .map((q) => q.trim())
    .filter((q) => q.length > 0 && q.length <= MAX_QUERY_LEN)
    .slice(0, 50); // hard cap — plan limit enforced below
  if (cleanQueries.length === 0) {
    return { ok: false, error: "No valid queries provided." };
  }

  // Sanitize competitor domains.
  const cleanCompetitors = competitorDomains
    .map((d) => normalizeHostname(d))
    .filter((d): d is string => d !== null)
    .slice(0, MAX_COMPETITORS);

  const { supabase, customer } = await getCtx();

  // Re-check query limit (defense in depth).
  const { count: existingCount, error: countErr } = await supabase
    .from("customer_queries")
    .select("id", { count: "exact", head: true });
  if (countErr) return { ok: false, error: "Could not check your query count." };

  const slotsRemaining = customer.query_limit - (existingCount ?? 0);
  const queriesToInsert = cleanQueries.slice(0, Math.max(0, slotsRemaining));
  if (queriesToInsert.length === 0) {
    return {
      ok: false,
      error: `You're already at your plan's query limit (${customer.query_limit}).`,
    };
  }

  // Insert queries.
  const queryInsertRows = queriesToInsert.map((q) => ({
    customer_id: customer.id,
    domain_id: domainId,
    query: q,
    is_priority: false,
  }));

  const { data: insertedQueries, error: queriesErr } = await supabase
    .from("customer_queries")
    .insert(queryInsertRows)
    .select("id");

  if (queriesErr || !insertedQueries) {
    return { ok: false, error: "Could not save your queries." };
  }

  const queryIds: string[] = insertedQueries.map(
    (row: { id: string }) => row.id,
  );

  // Insert competitor domains for each new query (if any).
  if (cleanCompetitors.length > 0 && queryIds.length > 0) {
    const competitorRows = queryIds.flatMap((qid) =>
      cleanCompetitors.map((domain) => ({
        query_id: qid,
        competitor_domain: domain,
      })),
    );
    // ON CONFLICT DO NOTHING in case a duplicate sneaks through.
    await supabase.from("query_competitors").upsert(competitorRows, {
      onConflict: "query_id,competitor_domain",
      ignoreDuplicates: true,
    });
  }

  // Insert scan jobs — one per (query_id × engine).
  const jobRows: Array<{
    type: string;
    payload: { query_id: string; engine: Engine; customer_id: string };
    status: string;
  }> = queryIds.flatMap((qid) =>
    SCAN_ENGINES.map((engine) => ({
      type: "scan" as const,
      payload: { query_id: qid, engine, customer_id: customer.id },
      status: "queued" as const,
    })),
  );

  // Use admin client for jobs table (it may not have user-level RLS INSERT
  // policy; service-role bypasses that safely).
  const admin = createAdminClient();
  const { error: jobsErr } = await admin.from("jobs").insert(jobRows);
  if (jobsErr) {
    // Non-fatal: queries are already saved. Log the failure but don't block
    // the user from proceeding — the dispatch cron will pick up queries that
    // have no recent scan job the next time it runs.
    console.error("onboarding: failed to insert scan jobs:", jobsErr.message);
  }

  // Mark onboarding complete — update via admin client so RLS doesn't block.
  await admin
    .from("customers")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", customer.id);

  redirect("/app/dashboard?onboarding=complete");
}

// -------------------------------------------------------------------------
// skipOnboardingAction — skip without saving anything.
// -------------------------------------------------------------------------
export async function skipOnboardingAction(): Promise<void> {
  redirect("/app/dashboard");
}
