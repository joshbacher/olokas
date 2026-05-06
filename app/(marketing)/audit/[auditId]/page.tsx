import type { Metadata } from "next";
import { AuditStatusView } from "@/components/audit-status-view";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

// Phase 2.5 — share-friendly metadata for individual audit reports.
//
// The audit ID is a UUID, the URL is publicly accessible, and the report
// page is meant to be passed around (Slack, X, LinkedIn). We expose a
// static OG image (`/og-audit.png` — branded placeholder; per-domain
// generated previews are a later phase) and matching twitter:summary_large_image.
//
// We keep `robots: noindex/nofollow` deliberately. Each audit URL is a
// per-customer artifact; we don't want them in Google's index, but we do
// want them to render nicely when shared.
export const metadata: Metadata = {
  title: "Your AI search audit",
  description:
    "Olokas runs your free AI search audit across ChatGPT, Perplexity, Google AI Overviews, and Claude.",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    type: "website",
    siteName: "Olokas",
    title: "Olokas Audit Report",
    description:
      "How ChatGPT, Perplexity, Google AI Overviews, and Claude answer questions about this domain.",
    images: [
      {
        url: "/og-audit.png",
        width: 1200,
        height: 630,
        alt: "Olokas Audit Report",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Olokas Audit Report",
    description:
      "How ChatGPT, Perplexity, Google AI Overviews, and Claude answer questions about this domain.",
    images: ["/og-audit.png"],
  },
};

export default function AuditByIdPage({
  params,
}: {
  params: { auditId: string };
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <header className="mb-[6vh]">
        <BrandMark />
      </header>

      <AuditStatusView auditId={params.auditId} />

      <SiteFooter />
    </main>
  );
}
