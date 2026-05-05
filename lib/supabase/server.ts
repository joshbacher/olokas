import { createServerClient, type CookieMethodsServer } from "@supabase/ssr";
import { cookies } from "next/headers";

export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll();
    },
    setAll(cookiesToSet) {
      try {
        cookiesToSet.forEach(({ name, value, options }) => {
          cookieStore.set(name, value, options);
        });
      } catch {
        // Server Components can't set cookies. Middleware refreshes the
        // session in those flows — safe to ignore here.
      }
    },
  };
  return createServerClient(url, key, { cookies: cookieMethods });
}

export function createAdminClient() {
  // Service-role client — DO NOT EXPOSE TO BROWSER. Use only in server code
  // where RLS bypass is required (cron jobs, webhooks, admin scripts).
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
    );
  }
  const noopCookies: CookieMethodsServer = {
    getAll: () => [],
    setAll: () => {},
  };
  return createServerClient(url, serviceKey, { cookies: noopCookies });
}
