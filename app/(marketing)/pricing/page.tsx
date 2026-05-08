import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";
import { SiteFooter } from "@/components/site-footer";
import { PricingTiers } from "@/components/pricing-tiers";
import { PRICING_TIERS, type PricingTier } from "@/lib/pricing/tiers";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Olokas pricing — Starter $39/mo, Pro $99/mo, Agency $299/mo. AI search visibility monitoring across ChatGPT, Perplexity, Google AI Overviews, and Claude.",
  alternates: { canonical: "https://olokas.com/pricing" },
  openGraph: {
    title: "Olokas Pricing",
    description:
      "Three plans for AI search visibility monitoring. Starter $39, Pro $99, Agency $299. Save ~16% annually.",
    url: "https://olokas.com/pricing",
    type: "website",
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
    title: "Olokas Pricing",
    description:
      "Three plans for AI search visibility monitoring. Starter $39, Pro $99, Agency $299.",
    images: ["/og-default.png"],
  },
};

// Phase 6.1 — JSON-LD structured data: one Service per tier with an
// embedded Offer carrying the monthly USD price. Schema.org allows
// either Offer.priceSpecification or Offer.price; we use both so the
// monthly cadence is unambiguous. Every Service is attributed to the
// existing Organization @id from the root layout's @graph so search
// engines can connect the entities.
function buildJsonLd(tiers: ReadonlyArray<PricingTier>) {
  return {
    "@context": "https://schema.org",
    "@graph": tiers.map((tier) => ({
      "@type": "Service",
      "@id": `https://olokas.com/pricing#${tier.id}`,
      name: `Olokas ${tier.name}`,
      description: tier.blurb,
      provider: { "@id": "https://olokas.com/#organization" },
      areaServed: "Worldwide",
      offers: {
        "@type": "Offer",
        price: tier.monthly.price.toFixed(2),
        priceCurrency: "USD",
        url: "https://olokas.com/pricing",
        availability: "https://schema.org/PreOrder",
        priceSpecification: {
          "@type": "UnitPriceSpecification",
          price: tier.monthly.price.toFixed(2),
          priceCurrency: "USD",
          unitCode: "MON",
          referenceQuantity: {
            "@type": "QuantitativeValue",
            value: 1,
            unitCode: "MON",
          },
        },
      },
    })),
  };
}

type FaqItem = {
  question: string;
  answer: string;
};

const FAQS: ReadonlyArray<FaqItem> = [
  {
    question: "What counts as a query?",
    answer:
      "A query is one question you want measured — for example, \"best CRM for small business\" or \"is Olokas worth it.\" Each query runs against ChatGPT, Perplexity, Google AI Overviews, and Claude on your scan cadence. You write the queries; we run them.",
  },
  {
    question: "How are scans actually run?",
    answer:
      "We send each query to each AI engine, record the answer, and parse it for whether your domain appeared, where it was cited, what was said about you, and which competitors showed up instead. Results are stored so you can see week-over-week movement, not just a single snapshot.",
  },
  {
    question: "Can I switch plans or cancel?",
    answer:
      "Yes. Upgrades and downgrades take effect immediately and are prorated against your current billing period. Cancellations keep your account active through the end of the period you've already paid for, and your historical data is preserved for 30 days afterward.",
  },
  {
    question: "Is there a free trial?",
    answer:
      "There's a one-time free audit at /audit — pick a domain, give us five queries, and you'll get a sample report that mirrors what a paid weekly run produces. Beyond that, plans are pay-as-you-go monthly with no contract.",
  },
  {
    question: "What happens if I exceed my plan limits?",
    answer:
      "You won't be hit with overage fees. New queries or domains beyond your plan limit are gently blocked with an upgrade prompt, and existing data keeps running as normal. You move plans when you actually need to, not when a meter says so.",
  },
];

function buildFaqJsonLd(faqs: ReadonlyArray<FaqItem>) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": "https://olokas.com/pricing#faq",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export default function PricingPage() {
  const jsonLd = buildJsonLd(PRICING_TIERS);
  const faqJsonLd = buildFaqJsonLd(FAQS);

  return (
    <main className="mx-auto flex min-h-screen max-w-[1040px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="mb-[6vh]">
        <BrandMark />
      </header>

      <section className="mb-12 max-w-[640px]">
        <h1 className="mb-4 text-[clamp(28px,5vw,40px)] font-semibold leading-[1.15] tracking-tight">
          One narrow product, three sizes.
        </h1>
        <p className="text-[17px] leading-[1.55] text-muted-foreground">
          Every plan watches how ChatGPT, Perplexity, Google AI Overviews, and
          Claude answer questions about your business. The difference between
          plans is how many domains and queries you can track, and how much of
          the data you can pipe into your own tools.
        </p>
      </section>

      <section className="mb-16">
        <PricingTiers />
        <p className="mt-5 text-xs text-muted-foreground">
          Prices in USD. Annual billing is approximately 16% less than paying
          monthly for a full year. Stripe checkout opens with launch — for now,
          plan CTAs route to the free audit so you can see what a real report
          looks like.
        </p>
      </section>

      <section className="mb-16 border-t border-border pt-10">
        <h2 className="mb-6 text-2xl font-semibold tracking-tight">
          Frequently asked
        </h2>
        <dl className="space-y-6">
          {FAQS.map((faq) => (
            <div key={faq.question}>
              <dt className="mb-1.5 text-base font-semibold leading-snug">
                {faq.question}
              </dt>
              <dd className="text-sm leading-[1.6] text-muted-foreground">
                {faq.answer}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <SiteFooter />
    </main>
  );
}
