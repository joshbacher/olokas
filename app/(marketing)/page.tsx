import type { Metadata } from "next";
import { EmailSignup } from "@/components/email-signup";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

// Phase 6.4 — home metadata. The root layout (`app/layout.tsx`) already
// carries default openGraph/twitter values that apply when a route doesn't
// override them, but we set explicit per-page metadata here so the home
// page has a concrete canonical URL plus a branded og:image (the same
// `/og-default.png` shared across marketing surfaces that don't have a
// purpose-built preview).
export const metadata: Metadata = {
  title: {
    absolute: "Olokas — AI search visibility, measured",
  },
  description:
    "Olokas monitors how ChatGPT, Perplexity, Google AI Overviews, and Claude answer questions about your business. Weekly scans across all four engines. Email report every Monday. $39/month.",
  alternates: { canonical: "https://olokas.com/" },
  openGraph: {
    type: "website",
    url: "https://olokas.com/",
    siteName: "Olokas",
    title: "Olokas — AI search visibility, measured",
    description:
      "Weekly scans of ChatGPT, Perplexity, Google AI Overviews, and Claude. One-page report on whether your domain shows up — and what's said when it does.",
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
    title: "Olokas — AI search visibility, measured",
    description:
      "Weekly scans of ChatGPT, Perplexity, Google AI Overviews, and Claude. One-page report.",
    images: ["/og-default.png"],
  },
};

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[620px] flex-col px-7 pb-[6vh] pt-[14vh] sm:px-7">
      <SiteNav className="mb-[8vh]" />

      <section>
        <h1 className="mb-6 text-[clamp(28px,5vw,40px)] font-semibold leading-[1.15] tracking-tight">
          Your customers are asking AI about your business. We tell you what it
          says back.
        </h1>

        <p className="mb-9 max-w-[540px] text-[18px] leading-[1.55] text-muted-foreground">
          Olokas monitors how{" "}
          <strong className="font-semibold text-foreground">
            ChatGPT, Perplexity, Google AI Overviews, and Claude
          </strong>{" "}
          answer questions about your business. Weekly scans across all four
          engines. Email report every Monday.{" "}
          <strong className="font-semibold text-foreground">
            $39/month, launching soon.
          </strong>
        </p>

        <EmailSignup />
        <p className="mb-12 mt-4 text-[13px] text-muted-foreground">
          No spam. One email when we launch. Unsubscribe in one click.
        </p>
      </section>

      <section className="mt-auto border-t border-border pt-8">
        <h2 className="mb-3 text-[15px] font-semibold">
          What Olokas does, plainly
        </h2>
        <p className="mb-3 text-sm leading-[1.55] text-muted-foreground">
          AI search engines now answer the questions your customers used to type
          into Google. If your competitors keep showing up in those answers and
          you don&apos;t, that&apos;s a problem you can&apos;t see without
          measuring it.
        </p>
        <p className="mb-3 text-sm leading-[1.55] text-muted-foreground">
          Every week, Olokas:
        </p>
        <ul className="mb-3 list-disc pl-[18px] text-sm leading-[1.55] text-muted-foreground">
          <li>
            Runs your target queries against ChatGPT, Perplexity, Google AI
            Overviews, and Claude
          </li>
          <li>
            Records whether your domain appeared, where, and what was said about
            you
          </li>
          <li>Tracks which competitors are showing up instead</li>
          <li>Sends you a one-page report with the top issues to fix</li>
        </ul>
        <p className="text-sm leading-[1.55] text-muted-foreground">
          That&apos;s it. We don&apos;t write your content, build your site, or
          pretend to be an agency. We measure one thing well.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
