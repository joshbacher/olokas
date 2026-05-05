import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Practical posts on AI search visibility, GEO, and how ChatGPT, Perplexity, and Claude pick what to cite.",
};

export default function BlogIndexPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <header className="mb-[6vh]">
        <BrandMark />
      </header>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">Blog</h1>
      <p className="text-muted-foreground">
        First posts publish with Phase 6. Content cadence per business bible §5:
        three posts per week, 1,800+ words, on the GEO keyword clusters.
      </p>
      <SiteFooter />
    </main>
  );
}
