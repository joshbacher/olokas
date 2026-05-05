import { BrandMark } from "@/components/brand-mark";
import { EmailSignup } from "@/components/email-signup";
import { SiteFooter } from "@/components/site-footer";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[620px] flex-col px-7 pb-[6vh] pt-[14vh] sm:px-7">
      <header className="mb-[8vh]">
        <BrandMark />
      </header>

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
