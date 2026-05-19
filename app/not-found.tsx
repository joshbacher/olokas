import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { Button } from "@/components/ui/button";

// Phase 4.2 — Custom 404 / not-found page.
//
// Replaces Next.js's default 404 surface with a branded page that matches
// the rest of the marketing routes (SiteNav at top, SiteFooter at bottom,
// same column width and vertical rhythm as /privacy and /terms). Brand
// mark sits centered between the nav and the headline so the page reads
// as Olokas's own surface even when the visitor arrived from a stale or
// mistyped URL — not a generic framework error.
//
// Copy stays dry per the brand voice (bible §4): we don't know whether
// the link is broken on our end or never existed, and we don't pretend to.
// Two CTAs surface the only two destinations a lost visitor would
// reasonably want: back to home, or straight into the free audit.
//
// Metadata: noindex/nofollow — search engines should never index a 404.
// Title still flows through the root layout's `template`, producing
// "Page not found · Olokas" in the browser tab.

export const metadata: Metadata = {
  title: "Page not found",
  description: "That link goes somewhere we haven't built. Or it never existed.",
  robots: { index: false, follow: false },
  alternates: { canonical: "https://olokas.com/" },
};

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[620px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <SiteNav className="mb-[10vh]" />

      <section className="flex flex-1 flex-col items-center text-center">
        <BrandMark className="mb-9" />

        <p className="mb-3 text-[13px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
          404
        </p>

        <h1 className="mb-5 text-[clamp(28px,5vw,40px)] font-semibold leading-[1.15] tracking-tight">
          Page not found
        </h1>

        <p className="mb-9 max-w-[460px] text-[16px] leading-[1.55] text-muted-foreground">
          That link goes somewhere we haven&apos;t built. Or it never existed.
          Hard to say.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button asChild>
            <Link href="/">Back to home</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/audit">Run a free audit</Link>
          </Button>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
