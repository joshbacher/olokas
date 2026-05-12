"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { createAdminClient, createClient } from "@/lib/supabase/server";

// Server actions for /app/settings.
//
// Auth model mirrors app/app/queries/actions.ts:
//   - The anon-key Supabase ssr client (createClient) carries the user's
//     session cookie. We confirm a real session via supabase.auth.getUser()
//     before touching anything destructive.
//   - The admin client (createAdminClient) is only used where RLS would
//     otherwise block us — specifically the auth.admin.deleteUser() call,
//     which requires the service role.
//
// The billing-portal flow is intentionally *not* implemented here as a
// server action — the spec assigns it to /api/portal (Phase 3.11) so both
// this page and any future external entry point share one Stripe code path.
// The Settings page's "Manage subscription" client component does a fetch
// to that route and follows the returned { url }; until 3.11 lands the
// route still returns 501 and the client shows an inline message.

// ---------------------------------------------------------------------------
// Delete account
// ---------------------------------------------------------------------------

// Result shape returned by deleteAccountAction. On success the action calls
// redirect("/?goodbye=1") and the throw-on-redirect short-circuits before
// we ever return — but TypeScript still wants the type, and useFormState
// expects a stable value for the not-yet-submitted initial render.
export interface DeleteAccountResult {
  ok: boolean;
  error?: string;
  // When the typed confirmation didn't match the account email we set
  // `fieldError` so the form can highlight that one input rather than
  // showing a generic banner.
  fieldError?: "confirm_email";
}

const DeleteSchema = z.object({
  confirm_email: z.string().trim().email().max(320),
});

export const DELETE_INITIAL: DeleteAccountResult = { ok: false };

export async function deleteAccountAction(
  _prev: DeleteAccountResult,
  formData: FormData,
): Promise<DeleteAccountResult> {
  // 1. Re-verify auth from scratch — server actions don't inherit the
  //    layout's auth check, and a hostile actor could in theory POST
  //    directly to this action endpoint.
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return { ok: false, error: "Your session has expired. Please sign in again." };
  }

  // 2. Parse the form. The "type your email to confirm" pattern is
  //    deliberate: it forces explicit user intent, defeats accidental
  //    button clicks, and matches the convention users see on GitHub /
  //    Stripe / Vercel.
  const parsed = DeleteSchema.safeParse({
    confirm_email: formData.get("confirm_email"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldError: "confirm_email",
      error: "Enter a valid email address to confirm.",
    };
  }

  if (parsed.data.confirm_email.toLowerCase() !== user.email.toLowerCase()) {
    return {
      ok: false,
      fieldError: "confirm_email",
      error: "That doesn't match the email on this account.",
    };
  }

  // 3. Delete via the auth admin API. The customers table FK is
  //    REFERENCES auth.users(id) ON DELETE CASCADE (see
  //    supabase/migrations/0001_initial.sql line 14), so dropping the
  //    auth.users row also drops the customers row, and every table
  //    keyed off customer_id cascades from there. No manual fan-out
  //    needed.
  //
  //    Side note for Phase 3.12 / future cleanup: if a customer has a
  //    live Stripe subscription, we should ideally cancel it before
  //    deletion to stop the billing clock. For now, we surface the
  //    Stripe customer id in the audit trail via a console.warn so the
  //    operator has signal; Phase 5+ can wire a real "cancel then
  //    delete" step.
  const admin = createAdminClient();
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);
  if (deleteError) {
    console.error("[settings] account deletion failed", {
      userId: user.id,
      message: deleteError.message,
    });
    return {
      ok: false,
      error:
        "We couldn't delete the account just now. Please try again in a moment.",
    };
  }

  // 4. Sign out so the now-invalid session cookie is cleared. The user
  //    record is gone; subsequent requests with the stale cookie would
  //    just resolve to no-user, but clearing it now keeps the cookie
  //    jar tidy and avoids middleware refresh churn.
  await supabase.auth.signOut();

  // 5. Bounce to the marketing home with a goodbye marker. The query
  //    param is opportunistic — the home page can choose to honor it
  //    with a one-line confirmation banner; if not, the redirect still
  //    works.
  redirect("/?goodbye=1");
}
