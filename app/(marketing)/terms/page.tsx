import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";

// Phase 4.1 — Terms of Service.
//
// PLACEHOLDER COPY. As with /privacy, this exists so the footer link
// resolves and so the document captures the commercial relationship as
// currently designed (monthly subscription, plan-tiered limits, customer-
// owned content). Operator must have counsel review before commercial
// launch — surfaced via the same `role="note"` callout the privacy page
// uses.
//
// Tone matches the rest of the marketing surface: plain language,
// short sentences, no fake-formal flourishes. Section ordering follows
// the order someone would actually want to read in: what the service is,
// what an account is, what you can and can't do with it, money, support,
// warranty/liability boilerplate, governing law placeholder, contact.

const LAST_UPDATED_DISPLAY = "May 18, 2026";
const LAST_UPDATED_ISO = "2026-05-18";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "The agreement between you and Olokas — what the service does, what an account is, payment terms, acceptable use, and the usual disclaimers.",
  alternates: { canonical: "https://olokas.com/terms" },
  robots: { index: true, follow: true },
  openGraph: {
    type: "article",
    url: "https://olokas.com/terms",
    siteName: "Olokas",
    title: "Terms of Service · Olokas",
    description:
      "The agreement between you and Olokas — service description, payment, acceptable use, disclaimers.",
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
    title: "Terms of Service · Olokas",
    description:
      "The agreement between you and Olokas — service, payment, acceptable use, disclaimers.",
    images: ["/og-default.png"],
  },
};

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-[720px] flex-col px-7 pb-[6vh] pt-[8vh]">
      <SiteNav className="mb-[6vh]" />

      <article>
        <header className="mb-8">
          <h1 className="mb-2 text-3xl font-semibold tracking-tight">
            Terms of Service
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
          These terms describe the commercial relationship as currently
          designed. They have not yet been reviewed by a lawyer and are
          subject to change before commercial launch. If you have a
          specific question, email{" "}
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
            1. The service
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            Olokas (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a
            subscription web app and a free single-domain audit at{" "}
            <Link
              href="/audit"
              className="underline hover:text-foreground"
            >
              /audit
            </Link>{" "}
            that measures how AI search engines (ChatGPT, Perplexity,
            Google AI Overviews, Claude, and others as they emerge)
            answer customer-style queries about a domain. By creating an
            account or submitting a free audit, you (&ldquo;you&rdquo;,
            &ldquo;the customer&rdquo;) agree to these terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            2. Accounts
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            You need a working email address to create an account. Sign-in
            is by magic link — there is no password to manage. You&apos;re
            responsible for keeping access to that inbox; anyone who can
            read it can sign in as you.
          </p>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            One account per person or legal entity. You may not share an
            account across people who would each separately need one
            under their employer&apos;s plan.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            3. Acceptable use
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            You agree not to:
          </p>
          <ul className="ml-5 list-disc space-y-2 text-[15px] leading-[1.65] text-muted-foreground">
            <li>
              Submit queries or domain targets that are illegal, abusive,
              or that would breach a third party&apos;s rights.
            </li>
            <li>
              Use the service to harass, defame, or impersonate any
              person or organization.
            </li>
            <li>
              Probe, scan, or reverse-engineer the service to find
              vulnerabilities outside a responsibly-disclosed program
              with us.
            </li>
            <li>
              Resell access, sublicense, or operate the service on
              someone else&apos;s behalf in a way that would otherwise
              require an Agency plan.
            </li>
            <li>
              Attempt to exceed plan limits (queries, domains, API rate)
              through scripting or multiple accounts.
            </li>
          </ul>
          <p className="mt-4 text-[15px] leading-[1.65] text-muted-foreground">
            We may suspend or terminate accounts that violate these
            rules. For obvious abuse we will act quickly; for grey areas
            we&apos;ll usually write to you first.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            4. Subscriptions, payment, and refunds
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            Paid plans are billed monthly or annually via Stripe. Prices
            and plan limits are listed on the{" "}
            <Link
              href="/pricing"
              className="underline hover:text-foreground"
            >
              pricing page
            </Link>
            . Payment is due at the start of each billing period. If a
            payment fails we will retry for up to seven days and email
            you; if it still hasn&apos;t cleared we&apos;ll downgrade
            the account to read-only until billing is restored.
          </p>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            You can cancel at any time from the customer portal linked
            in account settings. Cancellation takes effect at the end of
            the period you&apos;ve already paid for; we don&apos;t
            prorate refunds for unused time on monthly plans. Annual
            plans are not refundable mid-period except where required
            by law.
          </p>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            We may change prices for future billing periods. We&apos;ll
            email you at least 30 days before any price change affects
            your subscription.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            5. Your content; our content
          </h2>
          <p className="mb-3 text-[15px] leading-[1.65] text-muted-foreground">
            You retain all rights to the domains, queries, and any
            material you provide. You grant us a limited license to
            process that material for the purpose of running the
            service — running scans, generating reports, and sending
            you the outputs.
          </p>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            We retain all rights to the Olokas software, the report
            structure, the engine-comparison methodology, our brand,
            and the marketing site copy. The reports themselves are
            yours to use however you like, including republishing
            them.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            6. Third-party AI engines
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            Olokas reports on what third-party AI engines say about a
            domain. We don&apos;t control those engines. Answers
            change over time as the underlying models, indexes, and
            policies of each provider change. We make no warranty that
            a particular result will persist, reproduce, or improve in
            response to any action you take.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            7. Service availability
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            We aim for high availability but do not currently publish a
            formal SLA. Scheduled maintenance windows are kept short
            and pre-announced where possible. Scans that fail because
            of provider-side outages are retried automatically; if a
            report is delayed beyond its normal cadence we&apos;ll say
            so on the dashboard.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            8. Disclaimers
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            The service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo; without warranties of any kind, express or
            implied, including warranties of merchantability, fitness
            for a particular purpose, and non-infringement. We do not
            warrant that scans are exhaustive, that reports are
            complete, or that following our suggestions will improve
            any specific business outcome.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            9. Limitation of liability
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            To the maximum extent permitted by law, our total
            liability arising out of or related to the service is
            limited to the greater of (a) the amount you paid us in
            the twelve months preceding the claim, or (b) one hundred
            US dollars. We are not liable for indirect, incidental,
            consequential, or punitive damages, or for lost profits,
            lost revenue, or lost data.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            10. Termination
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            You can terminate by cancelling your subscription and
            deleting your account from settings. We can terminate or
            suspend your account if you breach these terms, if your
            payment is uncollectable, or if continuing to provide
            service to you would expose us to material legal risk.
            Upon termination, your right to use the service ends and
            your data is handled per the retention rules in the{" "}
            <Link
              href="/privacy"
              className="underline hover:text-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            11. Changes to these terms
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            We may update these terms from time to time. The
            &ldquo;Last updated&rdquo; date at the top reflects the
            most recent revision. For material changes we&apos;ll
            email account holders at least 30 days before the change
            takes effect. Continued use of the service after the
            effective date means you accept the revised terms.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            12. Governing law
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            These terms are governed by the laws of the jurisdiction
            in which Olokas is incorporated, without regard to its
            conflict-of-law principles. The specific jurisdiction and
            venue will be set in the final, counsel-reviewed version
            of these terms before commercial launch.
          </p>
        </section>

        <section className="mb-8">
          <h2 className="mb-3 text-xl font-semibold tracking-tight">
            13. Contact
          </h2>
          <p className="text-[15px] leading-[1.65] text-muted-foreground">
            Questions about these terms:{" "}
            <a
              href="mailto:hello@olokas.com"
              className="underline hover:text-foreground"
            >
              hello@olokas.com
            </a>
            . See also our{" "}
            <Link
              href="/privacy"
              className="underline hover:text-foreground"
            >
              Privacy Policy
            </Link>
            .
          </p>
        </section>
      </article>

      <SiteFooter />
    </main>
  );
}
