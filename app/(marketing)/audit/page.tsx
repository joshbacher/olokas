import type { Metadata } from "next";
import { AuditForm } from "@/components/audit-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

// Phase 6.4 — audit landing metadata. Per-audit pages (`/audit/[auditId]`)
// already carry their own metadata + share-friendly OG image. The landing
// page uses the shared marketing OG default and exposes a canonical URL so
// search engines never index query-stringed variants of the form.
export const metadata: Metadata = {
  title: "Free AI search audit",
  description:
    "Run a free, single-domain AI search visibility audit across ChatGPT, Perplexity, Google AI Overviews, and Claude. One scan per email per week.",
  alternates: { canonical: "https://olokas.com/audit" },
  openGraph: {
    type: "website",
    url: "https://olokas.com/audit",
    siteName: "Olokas",
    title: "Free AI search audit · Olokas",
    description:
      "One scan across ChatGPT, Perplexity, Google AI Overviews, and Claude. We'll tell you whether your domain shows up — and what's said when it does.",
    images: [
      {
        url: "/og-default.png",
        width: 1200,
        height: 630,
        alt: "Olokas — AI search visibility, measured",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Free AI search audit · Olokas",
    description:
      "One scan across ChatGPT, Perplexity, Google AI Overviews, and Claude.",
    images: ["/og-default.png"],
  },
};

export default function AuditPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <SiteNav className="mb-[6vh]" />

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
