// Phase 5.1 — failed-payment email template.
//
// Three cadences, escalating in tone:
//   - day1  : "heads up, your card was declined — no action needed yet"
//   - day3  : "still declined, please update your payment method"
//   - day7  : "final notice before access is paused"
//
// All three share structure; copy + tone vary per variant. The CTA is a
// link to the Stripe Customer Portal, surfaced through `/api/portal`
// once the user is authenticated. We don't deep-link to Stripe directly
// because the portal session URL is short-lived and per-user — the email
// always sends them through our authed redirect.
//
// Phase 5 wires the actual send path; this template only formats. The
// recovery cron (Phase 7) decides which variant to fire based on days
// since first failure.
import * as React from "react";
import {
  COLOR,
  EmailShell,
  BrandHeaderRow,
  EyebrowText,
  BodyParagraph,
  CtaButton,
  CalloutCard,
  FooterBlock,
  trimSlash,
  DEFAULT_BASE_URL,
} from "./_shared";

export type FailedPaymentVariant = "day1" | "day3" | "day7";

export type FailedPaymentEmailProps = {
  /** First name or email handle for the greeting. */
  recipientName: string;
  /** Which cadence this send is. Drives tone and headline. */
  variant: FailedPaymentVariant;
  /** Plan name (e.g. "Pro") shown in the eyebrow. */
  planLabel: string;
  /**
   * Amount that failed, including currency, e.g. "$99.00". Optional —
   * falls back to a generic line when omitted.
   */
  amountLabel?: string;
  /**
   * Date access will be paused if not resolved (variant=day7 only).
   * Format: "May 14" or similar.
   */
  pausesOnLabel?: string;
  /** Marketing-site origin used for CTA links. Defaults to olokas.com. */
  baseUrl?: string;
};

type VariantCopy = {
  eyebrow: string;
  headline: (name: string) => string;
  lead: (amount: string | undefined) => string;
  detail: string;
  cta: string;
  tone: "neutral" | "warn" | "danger";
};

const VARIANT_COPY: Readonly<Record<FailedPaymentVariant, VariantCopy>> = {
  day1: {
    eyebrow: "Payment issue",
    headline: (name) => `${name}, your last payment didn’t go through.`,
    lead: (amount) =>
      amount
        ? `Stripe couldn’t complete the ${amount} charge for your subscription. It’ll retry automatically over the next few days.`
        : `Stripe couldn’t complete your latest subscription charge. It’ll retry automatically over the next few days.`,
    detail:
      "No action is required yet — but if you know the card has changed, you can update it now and skip the retries.",
    cta: "Update payment method",
    tone: "neutral",
  },
  day3: {
    eyebrow: "Payment retry failed",
    headline: (name) => `${name}, the retry also declined.`,
    lead: (amount) =>
      amount
        ? `Stripe’s retry of the ${amount} charge was declined. Two more attempts are queued, but a card update is the fastest fix.`
        : `Stripe’s retry of your subscription charge was declined. Two more attempts are queued, but a card update is the fastest fix.`,
    detail:
      "If the card is fine, double-check that the billing address and ZIP match what your bank has on file — that’s the most common reason these get rejected.",
    cta: "Update payment method",
    tone: "warn",
  },
  day7: {
    eyebrow: "Final notice",
    headline: (name) => `${name}, access pauses soon.`,
    lead: (amount) =>
      amount
        ? `We’ve made every retry on the ${amount} charge and they’ve all been declined. To keep your account active, update your card before access pauses.`
        : `We’ve made every retry on your subscription charge and they’ve all been declined. To keep your account active, update your card before access pauses.`,
    detail:
      "When access pauses, scans stop and dashboard data is preserved for 30 days. Updating your card resumes scanning immediately.",
    cta: "Update payment now",
    tone: "danger",
  },
};

export function FailedPaymentEmail({
  recipientName,
  variant,
  planLabel,
  amountLabel,
  pausesOnLabel,
  baseUrl = DEFAULT_BASE_URL,
}: FailedPaymentEmailProps) {
  const copy = VARIANT_COPY[variant];
  const home = trimSlash(baseUrl);
  // The portal opens through our authed handler; we never embed a
  // pre-baked Stripe URL because portal session URLs are short-lived
  // and customer-scoped.
  const portalUrl = `${home}/app/settings`;

  return (
    <EmailShell footer={<FooterBlock baseUrl={baseUrl} />}>
      <BrandHeaderRow />

      <tr>
        <td style={{ padding: "24px 24px 8px" }}>
          <EyebrowText>
            {copy.eyebrow} · {planLabel}
          </EyebrowText>
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
            {copy.headline(recipientName)}
          </h1>
          <BodyParagraph>{copy.lead(amountLabel)}</BodyParagraph>
          <BodyParagraph muted>{copy.detail}</BodyParagraph>
        </td>
      </tr>

      {variant === "day7" && pausesOnLabel ? (
        <tr>
          <td style={{ padding: "16px 24px 4px" }}>
            <CalloutCard tone="danger">
              <p
                style={{
                  margin: 0,
                  fontSize: "13px",
                  lineHeight: "1.55",
                  color: COLOR.text,
                }}
              >
                <strong style={{ color: COLOR.destructive }}>
                  Access pauses {pausesOnLabel}
                </strong>{" "}
                if the card isn’t updated. Your data is preserved for 30 days
                after that.
              </p>
            </CalloutCard>
          </td>
        </tr>
      ) : null}

      <tr>
        <td style={{ padding: "20px 24px" }}>
          <CtaButton href={portalUrl}>{copy.cta}</CtaButton>
        </td>
      </tr>

      <tr>
        <td style={{ padding: "0 24px 24px" }}>
          <p
            style={{
              margin: 0,
              fontSize: "11px",
              lineHeight: "1.55",
              color: COLOR.muted,
            }}
          >
            Manage subscription is opened from your settings page using a
            short-lived Stripe portal session. We don’t handle card data
            ourselves.
          </p>
        </td>
      </tr>
    </EmailShell>
  );
}

export default FailedPaymentEmail;
