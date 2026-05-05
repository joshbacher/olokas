import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Olokas pricing — Starter $39/mo, Pro $99/mo, Agency $299/mo. AI search visibility monitoring across ChatGPT, Perplexity, Google AI Overviews, and Claude.",
};

export default function PricingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[920px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <header className="mb-[6vh]">
        <BrandMark />
      </header>
      <h1 className="mb-3 text-3xl font-semibold tracking-tight">Pricing</h1>
      <p className="mb-8 max-w-[540px] text-muted-foreground">
        One narrow product, three tiers. Built for self-serve. Pricing details
        coming with launch.
      </p>
      <p className="text-sm text-muted-foreground">
        Tier specifics live in the business bible — full pricing page rolls out
        with Phase 6.
      </p>
      <SiteFooter />
    </main>
  );
}
