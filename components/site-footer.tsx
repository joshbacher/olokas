import Link from "next/link";

// Phase 4.1 — added Privacy and Terms links alongside the existing contact
// email. Layout stays a single flex-wrap row: copyright on the left,
// secondary nav on the right. On narrow viewports the right-hand nav
// wraps under the copyright cleanly (gap-y keeps spacing readable).

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-6 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 text-xs text-muted-foreground">
      <span>&copy; {new Date().getFullYear()} Olokas</span>
      <nav
        aria-label="Footer"
        className="flex flex-wrap items-center gap-x-4 gap-y-2"
      >
        <Link
          href="/privacy"
          className="hover:text-foreground transition-colors"
        >
          Privacy
        </Link>
        <Link
          href="/terms"
          className="hover:text-foreground transition-colors"
        >
          Terms
        </Link>
        <a
          href="mailto:hello@olokas.com"
          className="hover:text-foreground transition-colors"
        >
          hello@olokas.com
        </a>
      </nav>
    </footer>
  );
}
