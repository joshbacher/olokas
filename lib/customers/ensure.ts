import "server-only";
import { cache } from "react";

import { createAdminClient } from "@/lib/supabase/server";
import type { CustomerRecord } from "./types";

// ensureCustomerRecord(userId, email)
//
// The Supabase migration installs a `handle_new_user` trigger that creates a
// `public.customers` row for every new auth.users insert. Triggers are
// reliable in steady state but can fail silently in edge cases (RLS
// misconfiguration during a redeploy, the SECURITY DEFINER function losing
// its definer, an INSERT that bypassed the trigger via a service-role
// migration, etc.). Without a customers row, every authed page in /app/* would
// 500 on the first SELECT, so we re-establish the invariant in code as well.
//
// This helper:
//   1. Fetches the customers row by id (the table's PK is the auth.users.id).
//   2. If the row exists, returns it.
//   3. If it doesn't, performs an idempotent upsert (INSERT ... ON CONFLICT (id)
//      DO UPDATE SET email = EXCLUDED.email) using the service-role client so
//      RLS can't block the recovery insert.
//
// It uses React's `cache()` so multiple server-component callers within the
// same request share a single round-trip — the layout calls this once for its
// own auth check, and child pages can call it again via useCustomer-on-server
// patterns or directly without re-querying.
//
// Service-role-only by design: the helper has implicit RLS bypass, so callers
// must validate that `userId` matches the authenticated user before invoking.
// The /app/* layout does that by reading user.id from supabase.auth.getUser()
// before calling here.
export const ensureCustomerRecord = cache(
  async (userId: string, email: string): Promise<CustomerRecord> => {
    if (!userId) {
      throw new Error("ensureCustomerRecord: userId is required");
    }
    if (!email) {
      // The customers.email column is NOT NULL UNIQUE. Without an email we
      // can't satisfy the schema, and it's a sign auth is misconfigured.
      throw new Error(
        `ensureCustomerRecord: email is required (userId=${userId})`,
      );
    }

    const admin = createAdminClient();

    // 1. Try to read the existing row first — the common case.
    const { data: existing, error: selectError } = await admin
      .from("customers")
      .select("*")
      .eq("id", userId)
      .maybeSingle<CustomerRecord>();

    if (selectError) {
      throw new Error(
        `ensureCustomerRecord: select failed for user ${userId}: ${selectError.message}`,
      );
    }
    if (existing) {
      return existing;
    }

    // 2. Row missing — recover by upserting. ON CONFLICT (id) DO UPDATE
    //    handles the rare race where the trigger fires between our select and
    //    our insert: the upsert returns the row that's now there. We
    //    deliberately update only `email` on conflict so we don't blow away
    //    plan/status/limits the trigger or webhook may have set after we
    //    started this request.
    const { data: inserted, error: upsertError } = await admin
      .from("customers")
      .upsert(
        { id: userId, email },
        { onConflict: "id", ignoreDuplicates: false },
      )
      .select("*")
      .single<CustomerRecord>();

    if (upsertError || !inserted) {
      throw new Error(
        `ensureCustomerRecord: upsert failed for user ${userId}: ${
          upsertError?.message ?? "no row returned"
        }`,
      );
    }
    return inserted;
  },
);
