import type { Metadata } from "next";
import { AuditStatusView } from "@/components/audit-status-view";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

// Phase 2.5 will add og:image and a richer share-friendly metadata block.
// For 2.3 a plain title is enough.
export const metadata: Metadata = {
  title: "Your AI search audit",
  description:
    "Olokas runs your free AI search audit across ChatGPT, Perplexity, Google AI Overviews, and Claude.",
  robots: {
    index: false,
    follow: false,
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
