import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// /auth/callback — handles the redirect target from a magic-link email.
//
// Supabase sends the user here with `?code=...` (PKCE) or `?token_hash=...`
// (older OTP flow). We exchange whichever is present for a session, then
// redirect to /app/dashboard, or to /app/onboarding if no customers row exists
// yet (per spec 3.1 — covers cases where the handle_new_user trigger didn't
// run; 3.4 will add a server-side ensure step as a redundant safety net).
//
// On any auth error we redirect to /login with a small reason hint so the
// page can display a friendly retry rather than a stack trace.

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type"); // "email" | "magiclink" | etc.
  const next = url.searchParams.get("next");

  const errorParam = url.searchParams.get("error");
  const errorDescription = url.searchParams.get("error_description");
  if (errorParam) {
    return redirectWithReason(
      request,
      "/login",
      errorDescription || errorParam || "auth_error"
    );
  }

  if (!code && !tokenHash) {
    return redirectWithReason(request, "/login", "missing_code");
  }

  let exchangeError: string | null = null;
  try {
    const supabase = createClient();
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) exchangeError = error.message;
    } else if (tokenHash) {
      const { error } = await supabase.auth.verifyOtp({
        type: (type as "email" | "magiclink" | "recovery" | "invite") ||
          "email",
        token_hash: tokenHash,
      });
      if (error) exchangeError = error.message;
    }
  } catch (err) {
    exchangeError =
      err instanceof Error ? err.message : "auth_exchange_failed";
  }

  if (exchangeError) {
    return redirectWithReason(request, "/login", exchangeError);
  }

  // Decide where to send the user. Default = /app/dashboard. If the caller
  // passed a `next` param (used by the auth-guard redirect in 3.3), honor it
  // when it's a same-origin path. Otherwise, check whether the customers row
  // already exists; if not, route to onboarding so the user can finish setup
  // (and the 3.4 ensure step can backfill the row).
  let destination = "/app/dashboard";
  if (next && next.startsWith("/") && !next.startsWith("//")) {
    destination = next;
  } else {
    const isFirstLogin = await detectFirstLogin();
    if (isFirstLogin) destination = "/app/onboarding";
  }

  return NextResponse.redirect(new URL(destination, request.url));
}

async function detectFirstLogin(): Promise<boolean> {
  // Returns true when no customers row exists for the freshly-authed user.
  // The handle_new_user trigger normally creates this row on auth.users
  // insert, so the common path is "row exists -> dashboard". If the trigger
  // fails (or this is a brand-new account in a stale environment), we fall
  // through to onboarding instead of the dashboard so the user isn't stranded.
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData.user?.id;
    if (!userId) return false;
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (error) {
      // If the lookup itself errored, prefer dashboard — not first-login.
      return false;
    }
    return data == null;
  } catch {
    return false;
  }
}

function redirectWithReason(
  request: NextRequest,
  path: string,
  reason: string
): NextResponse {
  const target = new URL(path, request.url);
  target.searchParams.set("reason", reason.slice(0, 200));
  return NextResponse.redirect(target);
}
