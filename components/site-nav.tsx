import Link from "next/link";
import { headers } from "next/headers";
import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

// Phase 4.0 — shared marketing navigation.
//
// One <SiteNav /> renders at the top of every marketing route (home, audit,
// pricing, blog index + posts, vs/[competitor]). BrandMark links back to /,
// the center-right nav lists the three primary marketing destinations, and
// "Sign in" sits rightmost. Below the sm breakpoint (640px) the center nav
// collapses so the bar stays readable on phones — BrandMark + Sign in only.
//
// Current-page state is derived from the `x-pathname` request header that
// root middleware forwards (see lib/supabase/middleware.ts). Same pattern
// the /app/* layout already uses for its own active-link styling. When the
// header is missing (very early in a fresh deploy, or in some test
// environments) we treat every link as inactive rather than guessing.
//
// Active-match rules per link:
// - Exact match for "/" so the BrandMark only highlights on the home page.
// - Prefix match for the three nav items so post pages like
//   /blog/what-is-geo correctly highlight "Blog", and /vs/semrush leaves
//   no nav item highlighted (no top-level "vs" entry in the bar).

const PRIMARY_LINKS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/pricing", label: "Pricing" },
  { href: "/audit", label: "Audit" },
  { href: "/blog", label: "Blog" },
];

function isActive(currentPath: string | null, href: string): boolean {
  if (!currentPath) return false;
  if (href === "/") return currentPath === "/";
  return currentPath === href || currentPath.startsWith(href + "/");
}

export function SiteNav({ className }: { className?: string }) {
  const headerStore = headers();
  const currentPath = headerStore.get("x-pathname");

  return (
    <nav
      aria-label="Primary"
      className={cn(
        "flex items-center justify-between gap-4",
        className,
      )}
    >
      <Link
        href="/"
        aria-label="Olokas — home"
        aria-current={isActive(currentPath, "/") ? "page" : undefined}
        className="flex items-center"
      >
        <BrandMark />
      </Link>

      <div className="flex items-center gap-5 sm:gap-6">
        <ul className="hidden items-center gap-5 sm:flex">
          {PRIMARY_LINKS.map((item) => {
            const active = isActive(currentPath, item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "text-sm font-medium transition-colors",
                    active
                      ? "text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <Link
          href="/login"
          aria-current={isActive(currentPath, "/login") ? "page" : undefined}
          className={cn(
            "text-sm font-medium transition-colors",
            isActive(currentPath, "/login")
              ? "text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          Sign in
        </Link>
      </div>
    </nav>
  );
}
