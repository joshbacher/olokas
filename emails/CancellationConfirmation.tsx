// Phase 5.1 — cancellation-confirmation email template.
//
// Sent when a user cancels their subscription. The subscription stays
// active through the end of the current billing period (`periodEndLabel`).
// This email confirms the cancellation, sets expectations about the
// remaining access window, and offers a reactivation path.
//
// Tone is calm and matter-of-fact — no guilt, no upsell pressure. The
// reactivation link goes through Stripe Customer Portal (via /app/settings)
// rather than a deep Stripe URL, since portal sessions are short-lived.
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

export type CancellationConfirmationEmailProps = {
  /** First name or email handle for the greeting. */
  recipientName: string;
  /** Plan that was cancelled (e.g. "Pro"). */
  planLabel: string;
  /** Date access ends, formatted human-friendly: "May 31, 2026". */
  periodEndLabel: string;
  /** Marketing-site origin used for CTA links. Defaults to olokas.com. */
  baseUrl?: string;
};

export function CancellationConfirmationEmail({
  recipientName,
  planLabel,
  periodEndLabel,
  baseUrl = DEFAULT_BASE_URL,
}: CancellationConfirmationEmailProps) {
  const home = trimSlash(baseUrl);
  const settingsUrl = `${home}/app/settings`;
  const dashboardUrl = `${home}/app/dashboard`;

  return (
    <EmailShell footer={<FooterBlock baseUrl={baseUrl} />}>
      <BrandHeaderRow />

      <tr>
        <td style={{ padding: "24px 24px 8px" }}>
          <EyebrowText>{planLabel} · cancellation confirmed</EyebrowText>
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
            Sorry to see you go, {recipientName}.
          </h1>
          <BodyParagraph muted>
            Your {planLabel} subscription is cancelled. No further charges
            will be made. Your account stays active through {periodEndLabel} —
            scans keep running and dashboard data stays accessible until then.
          </BodyParagraph>
        </td>
      </tr>

      <tr>
        <td style={{ padding: "16px 24px 4px" }}>
          <CalloutCard tone="neutral">
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                lineHeight: "1.55",
                color: COLOR.text,
              }}
            >
              <strong style={{ color: COLOR.text }}>
                Access ends {periodEndLabel}
              </strong>
              <br />
              After that, scans pause and your data is preserved for 30 days.
              You can reactivate any time during that window without losing
              history.
            </p>
          </CalloutCard>
        </td>
      </tr>

      <tr>
        <td style={{ padding: "20px 24px 8px" }}>
          <CtaButton href={settingsUrl}>Reactivate {planLabel}</CtaButton>
          <span style={{ display: "inline-block", width: "8px" }}>&nbsp;</span>
          <CtaButton href={dashboardUrl} variant="secondary">
            Open dashboard
          </CtaButton>
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
            If something didn’t work for you, hit reply — we read every
            response. Your feedback shapes what we ship next.
          </p>
        </td>
      </tr>
    </EmailShell>
  );
}

export default CancellationConfirmationEmail;
