// Phase 5.1 — welcome email template.
//
// Sent right after a user signs up (post-Checkout for paid plans, or
// post-magic-link for any first-time login). The job is to land them in
// /app/onboarding fast — that flow walks them through adding their first
// domain + queries (Phase 3.13). Keep the email short, factual, and
// link-driven.
import * as React from "react";
import {
  COLOR,
  EmailShell,
  BrandHeaderRow,
  EyebrowText,
  BodyParagraph,
  CtaButton,
  BulletList,
  FooterBlock,
  trimSlash,
  DEFAULT_BASE_URL,
} from "./_shared";

export type WelcomeEmailProps = {
  /** First name or email handle for the greeting. */
  recipientName: string;
  /** Plan label shown in the eyebrow ("Starter", "Pro", "Agency", "Free"). */
  planLabel: string;
  /** Marketing-site origin used for CTA links. Defaults to olokas.com. */
  baseUrl?: string;
};

const NEXT_STEPS: readonly string[] = [
  "Add your primary domain.",
  "Drop in 5–10 customer-style queries (we'll suggest a starter set).",
  "Optionally name 2–3 competitors per query.",
  "Schedule the first scan — results land in your dashboard within an hour.",
];

export function WelcomeEmail({
  recipientName,
  planLabel,
  baseUrl = DEFAULT_BASE_URL,
}: WelcomeEmailProps) {
  const home = trimSlash(baseUrl);
  const onboardingUrl = `${home}/app/onboarding`;
  const docsUrl = `${home}/blog`;

  return (
    <EmailShell footer={<FooterBlock baseUrl={baseUrl} />}>
      <BrandHeaderRow />

      <tr>
        <td style={{ padding: "24px 24px 8px" }}>
          <EyebrowText>{planLabel} plan · welcome</EyebrowText>
          <h1
            style={{
              margin: "8px 0 0",
              fontSize: "22px",
              lineHeight: "1.2",
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: COLOR.text,
            }}
          >
            Welcome, {recipientName}.
          </h1>
          <BodyParagraph muted>
            Thanks for signing up. Olokas tracks how your domain shows up in
            ChatGPT, Perplexity, Google AI Overviews, and Claude — and what
            changes week to week.
          </BodyParagraph>
          <BodyParagraph muted>
            The fastest way to see something useful is to add your first
            query. The four steps below take under five minutes.
          </BodyParagraph>
        </td>
      </tr>

      <tr>
        <td style={{ padding: "16px 24px 4px" }}>
          <BulletList items={NEXT_STEPS} bulletColor={COLOR.brand} />
        </td>
      </tr>

      <tr>
        <td style={{ padding: "20px 24px 8px" }}>
          <CtaButton href={onboardingUrl}>Add your first query →</CtaButton>
        </td>
      </tr>

      <tr>
        <td style={{ padding: "8px 24px 24px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              lineHeight: "1.55",
              color: COLOR.muted,
            }}
          >
            Want to read first?{" "}
            <a
              href={docsUrl}
              style={{
                color: COLOR.text,
                textDecoration: "underline",
              }}
            >
              What Olokas measures
            </a>{" "}
            walks through the GEO score and how citations are weighted.
          </p>
        </td>
      </tr>
    </EmailShell>
  );
}

export default WelcomeEmail;
