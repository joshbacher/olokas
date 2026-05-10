"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { createClient } from "@/lib/supabase/server";

import type { QueriesActionResult } from "./action-types";

// Server actions for /app/queries.
//
// Auth model: every action calls supabase.auth.getUser() to confirm the
// session, then the anon-key client is used for the actual mutation — the
// RLS policies on `domains` and `customer_queries` (see
// supabase/migrations/0001_initial.sql) scope every read/write to
// auth.uid() = customer_id, so a user cannot touch another customer's row
// even if they hand-craft a request with a forged id.
//
// Plan-limit enforcement: the page already chooses between rendering the
// add-form or the upgrade CTA based on the current count, but the action
// re-checks the count itself before INSERT — defense in depth against a
// stale page render or someone replaying a captured request.
//
// All actions return a QueriesActionResult shape compatible with
// useFormState, so the corresponding client form can render an inline
// error without a redirect-and-toast hop.
//
// Returned errors avoid leaking Supabase / pg error details to the
// client; we map a small set of expected failures to friendly copy and
// fall back to a generic "could not …" otherwise.

const HOST_REGEX = /^[a-z0-9.-]+\.[a-z]{2,}$/;
const MAX_QUERY_LENGTH = 500;
const MAX_DOMAIN_LENGTH = 253;

// normalizeHostname strips protocol, trailing path, and a leading "www.",
// then validates the remaining hostname. Mirrors the audit form's
// approach (components/audit-form.tsx) so users get consistent behavior:
// pasting "https://www.example.com/" stores "example.com".
function normalizeHostname(raw: string): string | null {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const url = new URL(candidate);
    const host = url.hostname.replace(/^www\./, "");
    if (!HOST_REGEX.test(host)) return null;
    if (host.length > MAX_DOMAIN_LENGTH) return null;
    return host;
  } catch {
    return null;
  }
}

// getCtx confirms there's an authed user and returns the anon-key
// Supabase client (RLS-scoped) plus the customer record. ensureCustomerRecord
// is React.cache()'d so a layout call earlier in the same request is free
// to dedupe; server actions get a fresh request context, so this hits the
// DB once per action invocation.
async function getCtx() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    throw new Error("Not authenticated");
  }
  const customer = await ensureCustomerRecord(user.id, user.email);
  return { supabase, customer };
}

// ---------------------------------------------------------------------------
// Domains
// ---------------------------------------------------------------------------

const AddDomainSchema = z.object({
  domain: z.string().min(1).max(MAX_DOMAIN_LENGTH),
});

export async function addDomainAction(
  _prevState: QueriesActionResult,
  formData: FormData,
): Promise<QueriesActionResult> {
  const parsed = AddDomainSchema.safeParse({
    domain: formData.get("domain"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Enter a domain." };
  }
  const host = normalizeHostname(parsed.data.domain);
  if (!host) {
    return { ok: false, error: "That doesn't look like a valid domain." };
  }

  const { supabase, customer } = await getCtx();

  // Plan-limit guard. RLS already scopes the count to this customer, so
  // we don't need an explicit .eq("customer_id", …).
  const { count, error: countErr } = await supabase
    .from("domains")
    .select("id", { count: "exact", head: true });
  if (countErr) {
    return { ok: false, error: "Could not check your domain count." };
  }
  if ((count ?? 0) >= customer.domain_limit) {
    return {
      ok: false,
      error: `You're at your plan's domain limit (${customer.domain_limit}).`,
    };
  }

  const { error } = await supabase.from("domains").insert({
    customer_id: customer.id,
    domain: host,
  });
  if (error) {
    // 23505 = unique_violation; the migration's UNIQUE (customer_id,
    // domain) constraint produces this when a user re-adds an existing
    // domain.
    if (error.code === "23505") {
      return { ok: false, error: "You're already monitoring that domain." };
    }
    return { ok: false, error: "Could not add the domain." };
  }

  revalidatePath("/app/queries");
  return { ok: true };
}

const DeleteDomainSchema = z.object({ id: z.string().uuid() });

export async function deleteDomainAction(
  _prevState: QueriesActionResult,
  formData: FormData,
): Promise<QueriesActionResult> {
  const parsed = DeleteDomainSchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { ok: false, error: "Invalid domain reference." };
  }

  const { supabase } = await getCtx();
  // RLS limits this delete to rows owned by the authed customer; the
  // ON DELETE CASCADE on customer_queries.domain_id and on
  // scan_results.query_id (which itself cascades from customer_queries)
  // takes care of dependent rows.
  const { error } = await supabase
    .from("domains")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: "Could not delete the domain." };
  }

  revalidatePath("/app/queries");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

const AddQuerySchema = z.object({
  domainId: z.string().uuid({ message: "Select a domain." }),
  query: z
    .string()
    .min(1, { message: "Enter a query." })
    .max(MAX_QUERY_LENGTH, {
      message: `Keep queries under ${MAX_QUERY_LENGTH} characters.`,
    }),
  isPriority: z.string().optional(),
});

export async function addQueryAction(
  _prevState: QueriesActionResult,
  formData: FormData,
): Promise<QueriesActionResult> {
  const rawQuery = formData.get("query");
  const parsed = AddQuerySchema.safeParse({
    domainId: formData.get("domainId"),
    query: typeof rawQuery === "string" ? rawQuery.trim() : "",
    isPriority: formData.get("isPriority"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { supabase, customer } = await getCtx();

  const { count, error: countErr } = await supabase
    .from("customer_queries")
    .select("id", { count: "exact", head: true });
  if (countErr) {
    return { ok: false, error: "Could not check your query count." };
  }
  if ((count ?? 0) >= customer.query_limit) {
    return {
      ok: false,
      error: `You're at your plan's query limit (${customer.query_limit}).`,
    };
  }

  // Belt-and-suspenders: confirm the domain belongs to this customer
  // before inserting. RLS would also catch this (the FK reference plus
  // the domains policy), but a friendly error beats a generic FK
  // violation.
  const { data: domainRow, error: domainErr } = await supabase
    .from("domains")
    .select("id")
    .eq("id", parsed.data.domainId)
    .maybeSingle();
  if (domainErr) {
    return { ok: false, error: "Could not verify the domain." };
  }
  if (!domainRow) {
    return { ok: false, error: "That domain isn't on your account." };
  }

  const { error } = await supabase.from("customer_queries").insert({
    customer_id: customer.id,
    domain_id: parsed.data.domainId,
    query: parsed.data.query,
    is_priority: parsed.data.isPriority === "on",
  });
  if (error) {
    return { ok: false, error: "Could not add the query." };
  }

  revalidatePath("/app/queries");
  return { ok: true };
}

const UpdateQuerySchema = z.object({
  id: z.string().uuid(),
  query: z
    .string()
    .min(1, { message: "Enter a query." })
    .max(MAX_QUERY_LENGTH, {
      message: `Keep queries under ${MAX_QUERY_LENGTH} characters.`,
    }),
  isPriority: z.string().optional(),
});

export async function updateQueryAction(
  _prevState: QueriesActionResult,
  formData: FormData,
): Promise<QueriesActionResult> {
  const rawQuery = formData.get("query");
  const parsed = UpdateQuerySchema.safeParse({
    id: formData.get("id"),
    query: typeof rawQuery === "string" ? rawQuery.trim() : "",
    isPriority: formData.get("isPriority"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Invalid input.",
    };
  }

  const { supabase } = await getCtx();
  const { error } = await supabase
    .from("customer_queries")
    .update({
      query: parsed.data.query,
      is_priority: parsed.data.isPriority === "on",
    })
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: "Could not update the query." };
  }

  revalidatePath("/app/queries");
  return { ok: true };
}

const DeleteQuerySchema = z.object({ id: z.string().uuid() });

export async function deleteQueryAction(
  _prevState: QueriesActionResult,
  formData: FormData,
): Promise<QueriesActionResult> {
  const parsed = DeleteQuerySchema.safeParse({ id: formData.get("id") });
  if (!parsed.success) {
    return { ok: false, error: "Invalid query reference." };
  }

  const { supabase } = await getCtx();
  // CASCADE on scan_results.query_id removes historical scans for the
  // deleted query.
  const { error } = await supabase
    .from("customer_queries")
    .delete()
    .eq("id", parsed.data.id);
  if (error) {
    return { ok: false, error: "Could not delete the query." };
  }

  revalidatePath("/app/queries");
  return { ok: true };
}
