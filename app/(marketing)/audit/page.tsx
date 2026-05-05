import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Free AI search audit",
  description:
    "Run a free, single-domain AI search visibility audit across ChatGPT, Perplexity, Google AI Overviews, and Claude. One scan per email per week.",
};

export default function AuditPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <header className="mb-[6vh]">
        <BrandMark />
      </header>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">
        Free AI search audit
      </h1>
      <p className="mb-8 max-w-[540px] text-muted-foreground">
        Coming soon. The free audit will run a single scan across all four
        engines and email you a one-page report.
      </p>
      <p className="text-sm text-muted-foreground">
        Tool implementation lands in Phase 2.
      </p>
      <SiteFooter />
    </main>
  );
}
