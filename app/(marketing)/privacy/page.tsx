import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

// Phase 4.1 — Privacy Policy.
//
// PLACEHOLDER COPY. This page exists so the footer link resolves to a real
// route and so the document captures the data flow as currently designed
// (Supabase for auth + data, Stripe for payments, Resend for transactional
// email, SerpAPI / Perplexity / Anthropic for scan engines). It is NOT
// drafted by a lawyer and should be reviewed by counsel before any
// commercial launch. Operator todo notice is rendered at the top of the
// page so visitors aren't misled in the meantime.
//
// Tone matches the rest of the marketing surface — direct, plain language,
// no boilerplate "your privacy matters to us" filler. Where US-only or
// EU-only language would be needed at scale, we describe the intent and
// flag that the final text needs to be locale-aware.

const LAST_UPDATED_DISPLAY = "May 18, 2026";
const LAST_UPDATED_ISO = "2026-05-18";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Olokas collects, uses, and shares data — what we store, who we send it to, and how to delete it.",
  alternates: { canonical: "https://olokas.com/privacy" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "article",
    url: "https://olokas.com/privacy",
    siteName: "Olokas",
    title: "Privacy Policy · Olokas",
    description:
      "How Olokas collects, uses, and shares data. Plain-English summary of what we store and who we send it to.",
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
    title: "Privacy Policy · Olokas",
    description:
      "How Olokas collects, uses, and shares data. Plain-English summary.",
    images: ["/og-default.png"],
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <SiteNav className="mb-[6vh]" />

      <article>
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">
            Privacy Policy
          </h1>
          <p className="text-[13px] uppercase tracking-wide text-muted-foreground/80">
            Last updated{" "}
            <time dateTime={LAST_UPDATED_ISO}>{LAST_UPDATED_DISPLAY}</time>
          </p>
        </header>

        <aside
          role="note"
          className="mb-10 rounded-md border border-border bg-muted/30 p-4 text-[13px] leading-[1.55] text-muted-foreground"
        >
          <strong className="font-semibold text-foreground">
            Heads up — placeholder copy.
          </strong>{" "}
          This document describes how Olokas is built to handle data and is
          accurate to the current implementation. It has not yet been
          reviewed by a lawyer. If you&apos;re relying on this for
          compliance reasons, please email{" "}
          <a
            href="mailto:hello@olokas.com"
            className="underline hover:text-foreground"
          >
            hello@olokas.com
          </a>
          .
        </aside>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            The short version
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            Olokas runs AI-search visibility scans for paying customers and
            free audit users. To do that we store an account record (email,
            plan), the domains and queries you ask us to track, and the
            answers we get back from each AI engine. We share the minimum
            with the sub-processors listed below to make the product work.
            We do not sell your data, run ad targeting, or train models on
            it. You can delete your account and underlying data at any
            time.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            What we collect
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            We collect three kinds of data:
          </p>
          <dl className="space-y-4 text-[15px] leading-[1.65] text-muted-foreground">
            <div>
              <dt className="font-semibold text-foreground">
                Account data.
              </dt>
              <dd>
                Your email address (used for sign-in via magic link), the
                plan you&apos;re on, and timestamps for sign-up and last
                activity. If you subscribe, your Stripe customer and
                subscription IDs.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Workspace data.
              </dt>
              <dd>
                The domains you ask us to monitor, the queries you assign
                to each domain, and the scan results we collect from
                ChatGPT, Perplexity, Google AI Overviews, and Claude on
                your behalf. Reports we generate from that data are stored
                so you can re-open them.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Operational data.
              </dt>
              <dd>
                Server-side logs that record request metadata (route,
                status, timing) for debugging and abuse prevention. We do
                not run third-party browser analytics, ad pixels, or
                fingerprinting scripts.
              </dd>
            </div>
          </dl>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            How we use it
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            We use the data above to:
          </p>
          <ul className="ml-5 list-disc space-y-2 text-[15px] leading-[1.65] text-muted-foreground">
            <li>Run the scans you&apos;ve configured.</li>
            <li>Produce reports and email them to you on schedule.</li>
            <li>
              Process payments, send receipts, and handle subscription
              lifecycle events.
            </li>
            <li>
              Respond when you write in, and detect abuse (rate limits,
              spam, scraping).
            </li>
          </ul>
          <p className="mt-4 text-[15px] leading-[1.65] text-muted-foreground">
            We do not use your queries, scan results, or reports to train
            machine-learning models. We do not sell or rent your data to
            third parties.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Sub-processors
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            Olokas is built on top of the following services. Each one
            receives the minimum data needed for its job:
          </p>
          <dl className="space-y-4 text-[15px] leading-[1.65] text-muted-foreground">
            <div>
              <dt className="font-semibold text-foreground">
                Supabase (auth + database).
              </dt>
              <dd>
                Stores your account, queries, domains, scan results, and
                reports. Hosted in the EU.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Stripe (payments).
              </dt>
              <dd>
                Handles checkout, recurring billing, and the customer
                portal. We never see your card number — Stripe holds it.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Vercel (hosting).
              </dt>
              <dd>
                Serves the marketing site and the signed-in app. Edge logs
                are retained for a short window for debugging.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Resend (transactional email).
              </dt>
              <dd>
                Sends magic-link emails, weekly reports, and account
                notifications.
              </dd>
            </div>
            <div>
              <dt className="font-semibold text-foreground">
                Anthropic, OpenAI, Perplexity, SerpAPI (scan engines).
              </dt>
              <dd>
                Receive the queries you&apos;ve configured at scan time.
                We send the query text, not your account email. Each
                provider&apos;s own retention policy applies to the
                request on their side.
              </dd>
            </div>
          </dl>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Data retention
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            While your account is active, we keep your workspace data
            indefinitely so historical reports stay meaningful. If you
            cancel, we keep the data for 30 days in case you reactivate,
            then delete it. If you delete your account, we remove your
            data within 30 days, except where we&apos;re required to keep
            certain records (for example, invoice records for tax
            compliance).
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Your rights
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            Depending on where you live, you may have the right to access
            the data we hold about you, ask us to correct or delete it,
            export it in a portable format, or object to particular
            processing. Concretely, the things we&apos;ll do on request:
          </p>
          <ul className="ml-5 list-disc space-y-2 text-[15px] leading-[1.65] text-muted-foreground">
            <li>
              Send you a copy of your account, queries, and scan history
              in JSON.
            </li>
            <li>
              Delete your account and all linked data (see retention
              above).
            </li>
            <li>
              Stop sending marketing emails (you can also use the
              unsubscribe link on any email).
            </li>
          </ul>
          <p className="mt-4 text-[15px] leading-[1.65] text-muted-foreground">
            Email{" "}
            <a
              href="mailto:hello@olokas.com"
              className="underline hover:text-foreground"
            >
              hello@olokas.com
            </a>{" "}
            from the address on your account and we&apos;ll handle it
            within 30 days. EU/UK users have the right to lodge a
            complaint with their local data-protection authority.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Cookies and tracking
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            We use a small number of strictly-necessary cookies to keep
            you signed in (Supabase session cookies). We don&apos;t run
            third-party analytics, advertising, or cross-site tracking
            pixels. No banner is shown because nothing requires consent
            beyond what makes the product work.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            International transfers
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            Olokas serves users globally. Some sub-processors host data
            outside the EU/UK. Where required, transfers rely on the
            relevant Standard Contractual Clauses or equivalent mechanism
            between us and the sub-processor.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Children
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            Olokas is a B2B product not directed at children. We do not
            knowingly collect data from anyone under 16. If you believe a
            minor has created an account, please email us and we&apos;ll
            delete it.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Changes to this policy
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            We&apos;ll update the &ldquo;Last updated&rdquo; date at the
            top whenever we change anything substantive. For material
            changes that affect how we use existing data, we&apos;ll
            email account holders before the change takes effect.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            Contact
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            Privacy questions, deletion requests, or anything else
            covered here:{" "}
            <a
              href="mailto:hello@olokas.com"
              className="underline hover:text-foreground"
            >
              hello@olokas.com
            </a>
            . See also our{" "}
            <Link
              href="/terms"
              className="underline hover:text-foreground"
            >
              Terms of Service
            </Link>
            .
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
