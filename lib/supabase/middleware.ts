import {
  createServerClient,
  type CookieMethodsServer,
} from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Per @supabase/ssr docs, every request needs an opportunity to refresh the
// auth cookie before it reaches a server component / route handler that
// depends on `supabase.auth.getUser()`. We do that here.
//
// Notes:
// - This helper does NOT redirect. Layouts (e.g. /app/layout.tsx) own routing
//   decisions; this just keeps the session cookie fresh.
// - Supabase's official guidance is "do not run code between createServerClient
//   and supabase.auth.getUser() in middleware." The cookie write must follow
//   immediately. Don't add awaits or branching in between.
// - We forward the current pathname as an `x-pathname` request header so
//   server layouts (which otherwise have no first-class access to the path)
//   can compose accurate `?next=` redirect-back targets in auth guards. This
//   is set BEFORE createServerClient so it doesn't violate the "no code
//   between createServerClient and getUser" rule.
// - When env vars are missing (e.g. preview deploys without Supabase wiring,
//   or `next build` running without local env), pass through silently. The
//   server.ts client throws on missing env in that case, but middleware
//   should not 500 every request — it just stops refreshing.
export async function updateSession(request: NextRequest) {
  const forwardedHeaders = new Headers(request.headers);
  forwardedHeaders.set("x-pathname", request.nextUrl.pathname);

  let supabaseResponse = NextResponse.next({
    request: { headers: forwardedHeaders },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return supabaseResponse;
  }

  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return request.cookies.getAll();
    },
    setAll(cookiesToSet) {
      // Mirror cookies onto the inbound request so server components see
      // the refreshed values within the same request lifecycle.
      cookiesToSet.forEach(({ name, value }) => {
        request.cookies.set(name, value);
      });
      // Rebuild the response with the mutated request (preserving our
      // forwarded x-pathname header), then re-emit Set-Cookie headers so
      // the browser stores them.
      supabaseResponse = NextResponse.next({
        request: { headers: forwardedHeaders },
      });
      cookiesToSet.forEach(({ name, value, options }) => {
        supabaseResponse.cookies.set(name, value, options);
      });
    },
  };

  const supabase = createServerClient(url, key, { cookies: cookieMethods });

  // IMPORTANT: do not insert code between createServerClient() and getUser().
  // This call is what triggers the cookie refresh when the access token is
  // close to expiry; anything async-y in between can cause the refreshed
  // cookies to land on a stale response object.
  await supabase.auth.getUser();

  return supabaseResponse;
}
