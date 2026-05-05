import type { Metadata } from "next";
import { AuditForm } from "@/components/audit-form";
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

      <section className="mb-8">
        <h1 className="mb-3 text-3xl font-semibold tracking-tight">
          Free AI search audit
        </h1>
        <p className="max-w-[580px] text-[15px] leading-[1.55] text-muted-foreground">
          One scan across ChatGPT, Perplexity, Google AI Overviews, and Claude.
          We&apos;ll tell you whether your domain shows up, who&apos;s showing
          up instead, and what the engines are saying about you. Email report,
          one page.
        </p>
      </section>

      <section>
        <AuditForm />
      </section>

      <SiteFooter />
    </main>
  );
}
