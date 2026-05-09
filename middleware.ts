import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

// Root middleware. Runs on every matched request before layouts/handlers,
// giving Supabase a chance to refresh the auth cookie. We delegate the work
// to the helper in lib/supabase/middleware.ts and never redirect from here —
// route guards live in layouts (e.g. app/app/layout.tsx).
export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Skip Next.js internals and common static asset extensions so we don't
  // burn an Edge invocation refreshing cookies for /favicon.ico or chunked
  // JS/CSS. Anything that looks like a real route still goes through.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|woff|woff2|ttf|otf)$).*)",
  ],
};
