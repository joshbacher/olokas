export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-border pt-6 flex flex-wrap justify-between gap-3 text-xs text-muted-foreground">
      <span>&copy; {new Date().getFullYear()} Olokas</span>
      <a
        href="mailto:hello@olokas.com"
        className="hover:text-foreground transition-colors"
      >
        hello@olokas.com
      </a>
    </footer>
  );
}
