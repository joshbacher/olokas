import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { ensureCustomerRecord } from "@/lib/customers/ensure";
import { CustomerProvider } from "@/lib/customers/context";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// /app/* shell — real auth guard (replaces the Phase-2 stub).
//
// Behavior:
// - Calls supabase.auth.getUser() up front. If no user is present, redirects
//   to /login with a `?next=` parameter pointing back at the path the user
//   tried to reach, so the auth callback (app/(auth)/auth/callback/route.ts)
//   can deposit them where they meant to go.
// - The current pathname comes from the `x-pathname` header that root
//   middleware forwards (see lib/supabase/middleware.ts). We sanitize it to
//   `/app/...` paths only — never honor an arbitrary `next` value, which
//   would let an attacker redirect post-login to an off-app URL.
// - Once we have a user, ensureCustomerRecord() guarantees a `customers` row
//   exists for them — covers the rare case where the handle_new_user trigger
//   didn't fire — and the row is published to client components further down
//   via <CustomerProvider> (server-component children can call
//   ensureCustomerRecord() directly; React.cache() dedupes the round-trip).
// - Renders a top nav inside the authed shell with brand on the left, the
//   four primary destinations in the middle, and a sign-out form on the right.
// - `dynamic = "force-dynamic"` is explicit (cookies() already makes this
//   layout dynamic, but the directive prevents any prerender ambiguity).

export const dynamic = "force-dynamic";

const NAV_ITEMS: ReadonlyArray<{ href: string; label: string }> = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/queries", label: "Queries" },
  { href: "/app/reports", label: "Reports" },
  { href: "/app/settings", label: "Settings" },
];

async function signOutAction(): Promise<void> {
  "use server";
  // Server action — refreshes its own Supabase client because actions run in
  // their own context, separate from the parent layout render.
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect("/");
}

function safeNextPath(raw: string | null): string {
  if (!raw) return "/app/dashboard";
  // Only allow same-origin paths under /app/. Reject protocol-relative URLs
  // (//evil.com/...) and anything outside the authed shell so a tampered
  // x-pathname header can't be used to bounce users somewhere unexpected.
  if (!raw.startsWith("/")) return "/app/dashboard";
  if (raw.startsWith("//")) return "/app/dashboard";
  if (!raw.startsWith("/app")) return "/app/dashboard";
  return raw;
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const headerStore = headers();
  const currentPath = headerStore.get("x-pathname");

  if (!user) {
    const nextPath = safeNextPath(currentPath);
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  // Magic-link flow always populates user.email; if it's missing the auth
  // flow is in a bad state — bounce out instead of 500-ing on a NOT NULL
  // insert below.
  if (!user.email) {
    redirect("/login?reason=missing_email");
  }

  // Backstop for the handle_new_user trigger. Idempotent — fetches the row if
  // it already exists (the common case), otherwise upserts it via the
  // service-role client.
  const customer = await ensureCustomerRecord(user.id, user.email);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border">
        <div className="mx-auto max-w-[1100px] px-7 h-14 flex items-center justify-between gap-4">
          <Link
            href="/app/dashboard"
            className="flex items-center"
            aria-label="Olokas — dashboard"
          >
            <BrandMark />
          </Link>

          <nav
            aria-label="Primary"
            className="flex items-center gap-1 overflow-x-auto"
          >
            {NAV_ITEMS.map((item) => {
              const active =
                currentPath === item.href ||
                (currentPath !== null &&
                  currentPath.startsWith(item.href + "/"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                    active
                      ? "text-foreground bg-muted"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <form action={signOutAction}>
            <Button type="submit" variant="ghost" size="sm">
              Sign out
            </Button>
          </form>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1100px] px-7 py-[5vh] flex-1">
        <CustomerProvider customer={customer}>{children}</CustomerProvider>
      </main>
    </div>
  );
}
