// Hand-rolled, email-safe React template for the free-audit report email.
//
// Phase 2.6 — this component is the canonical source of truth for the
// email's layout. It's a real React component (typed against `AuditReport`)
// so future migration to the `react-email` package in Phase 5 is a swap of
// rendering strategy, not a rewrite of structure.
//
// Runtime note: Next.js 14 forbids `react-dom/server` imports anywhere in
// the app/ graph. We therefore render outbound email HTML via a parallel
// pure-string builder in `lib/audit/render-email.ts` whose markup mirrors
// this component 1:1. When this file changes, update the string builder
// to match. Phase 5 swaps both for `react-email` and the parallel path
// goes away.
//
// Email constraints we honor here:
//   - layout uses <table> elements only (no flex / grid / divs as containers)
//   - all styling is inline (clients ignore <style> tags + CSS variables)
//   - typography is system-font-only (no @font-face)
//   - max width clamps at 600px (the de-facto Outlook-friendly cap)
//   - colors are hex, not hsl(), to dodge legacy clients
//   - no client-side JS, no images served off the marketing domain that
//     aren't already there
//
// The component is plain server-renderable React (no "use client", no hooks).
import * as React from "react";
import type { AuditReport, EnginePerf } from "@/lib/audit/mock-report";

// Light-theme palette translated from globals.css to hex so email clients
// that ignore CSS vars still render correctly.
const COLOR = {
  pageBg: "#f4f1ea",
  surface: "#ffffff",
  text: "#121212",
  muted: "#54514c",
  border: "#e3dfd6",
  borderStrong: "#cdc8bd",
  brand: "#ff6b35",
  destructive: "#dc2626",
  mixed: "#6b6b6b",
  brandSoftBg: "#fff3ec",
} as const;

const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const MAX_WIDTH_PX = 600;

const ENGINE_LABELS: Readonly<Record<keyof AuditReport["perEngine"], string>> =
  {
    chatgpt: "ChatGPT",
    perplexity: "Perplexity",
    googleAio: "Google AI Overviews",
    claude: "Claude",
  };

type ScoreBand = "strong" | "mixed" | "weak";

function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "strong";
  if (score >= 45) return "mixed";
  return "weak";
}

const BAND_LABEL: Readonly<Record<ScoreBand, string>> = {
  strong: "Strong",
  mixed: "Mixed",
  weak: "Weak",
};

const BAND_COLOR: Readonly<Record<ScoreBand, string>> = {
  strong: COLOR.brand,
  mixed: COLOR.mixed,
  weak: COLOR.destructive,
};

export type FreeAuditReportEmailProps = {
  /** The mock or real audit report to summarize. */
  report: AuditReport;
  /** Public URL the recipient can revisit to see the full report. */
  reportUrl?: string;
  /** Marketing-site origin used for the CTA link. */
  baseUrl?: string;
};

/**
 * Email-safe React component. Render via `react-dom/server`'s
 * `renderToStaticMarkup` to produce the HTML that the eventual Resend call
 * will send. The wrapping `<html>/<body>` shell is added by the render
 * helper; this component returns only the visible body so it can also be
 * embedded in tools that expect a fragment.
 */
export function FreeAuditReportEmail({
  report,
  reportUrl,
  baseUrl = "https://olokas.com",
}: FreeAuditReportEmailProps) {
  const overallBand = scoreBand(report.geoScore);
  const queryCount = report.queries.length;
  const queryNoun = queryCount === 1 ? "query" : "queries";
  const ctaUrl = `${baseUrl.replace(/\/$/, "")}/pricing`;

  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={{
        width: "100%",
        backgroundColor: COLOR.pageBg,
        margin: 0,
        padding: 0,
        borderCollapse: "collapse",
      }}
    >
      <tbody>
        <tr>
          <td align="center" style={{ padding: "32px 16px" }}>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              width={MAX_WIDTH_PX}
              style={{
                width: "100%",
                maxWidth: `${MAX_WIDTH_PX}px`,
                backgroundColor: COLOR.surface,
                border: `1px solid ${COLOR.border}`,
                borderRadius: "8px",
                fontFamily: FONT_STACK,
                color: COLOR.text,
              }}
            >
              <tbody>
                <BrandHeaderRow />
                <HeroRow
                  report={report}
                  queryCount={queryCount}
                  queryNoun={queryNoun}
                />
                <OverallScoreRow score={report.geoScore} band={overallBand} />
                <ByEngineRow report={report} />
                <IssuesAndWinsRow report={report} />
                {reportUrl ? <ViewReportRow reportUrl={reportUrl} /> : null}
                <CtaRow ctaUrl={ctaUrl} domain={report.domain} />
                <DisclaimerRow />
              </tbody>
            </table>

            <FooterTable baseUrl={baseUrl} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function BrandHeaderRow() {
  return (
    <tr>
      <td
        style={{
          padding: "20px 24px 16px",
          borderBottom: `1px solid ${COLOR.border}`,
        }}
      >
        <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
          <tbody>
            <tr>
              <td
                width={22}
                height={22}
                style={{
                  width: "22px",
                  height: "22px",
                  backgroundColor: COLOR.brand,
                  borderRadius: "11px",
                  fontSize: 0,
                  lineHeight: "22px",
                }}
              >
                &nbsp;
              </td>
              <td style={{ paddingLeft: "10px" }}>
                <span
                  style={{
                    fontSize: "16px",
                    fontWeight: 600,
                    letterSpacing: "-0.01em",
                    color: COLOR.text,
                  }}
                >
                  Olokas
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function HeroRow({
  report,
  queryCount,
  queryNoun,
}: {
  report: AuditReport;
  queryCount: number;
  queryNoun: string;
}) {
  return (
    <tr>
      <td style={{ padding: "24px 24px 8px" }}>
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: COLOR.muted,
          }}
        >
          Audit ready
        </p>
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
          Your audit for {report.domain}
        </h1>
        <p
          style={{
            margin: "10px 0 0",
            fontSize: "14px",
            lineHeight: "1.55",
            color: COLOR.muted,
          }}
        >
          We ran your {queryCount} {queryNoun} against ChatGPT, Perplexity,
          Google AI Overviews, and Claude. Here&apos;s the snapshot.
        </p>
      </td>
    </tr>
  );
}

function OverallScoreRow({ score, band }: { score: number; band: ScoreBand }) {
  return (
    <tr>
      <td style={{ padding: "16px 24px 4px" }}>
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          style={{
            width: "100%",
            backgroundColor: COLOR.brandSoftBg,
            borderRadius: "6px",
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "16px 18px" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "11px",
                    fontWeight: 500,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: COLOR.muted,
                  }}
                >
                  Overall GEO score
                </p>
                <table
                  role="presentation"
                  cellPadding={0}
                  cellSpacing={0}
                  border={0}
                >
                  <tbody>
                    <tr>
                      <td style={{ paddingTop: "6px" }}>
                        <span
                          style={{
                            fontSize: "36px",
                            lineHeight: "1",
                            fontWeight: 600,
                            letterSpacing: "-0.02em",
                            color: COLOR.text,
                          }}
                        >
                          {score}
                        </span>
                        <span
                          style={{
                            paddingLeft: "6px",
                            fontSize: "13px",
                            color: COLOR.muted,
                          }}
                        >
                          / 100
                        </span>
                      </td>
                      <td style={{ paddingLeft: "12px", paddingTop: "8px" }}>
                        <BandPill band={band} />
                      </td>
                    </tr>
                  </tbody>
                </table>
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: "12px",
                    lineHeight: "1.55",
                    color: COLOR.muted,
                  }}
                >
                  Average across all four engines, weighted by citation depth.
                </p>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function BandPill({ band }: { band: ScoreBand }) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "3px 10px",
        backgroundColor: BAND_COLOR[band],
        color: "#ffffff",
        borderRadius: "999px",
        fontSize: "11px",
        fontWeight: 600,
        letterSpacing: "0.02em",
        whiteSpace: "nowrap",
      }}
    >
      {BAND_LABEL[band]}
    </span>
  );
}

function ByEngineRow({ report }: { report: AuditReport }) {
  const keys = Object.keys(ENGINE_LABELS) as Array<keyof typeof ENGINE_LABELS>;
  return (
    <tr>
      <td style={{ padding: "20px 24px 4px" }}>
        <p
          style={{
            margin: "0 0 10px",
            fontSize: "11px",
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: COLOR.muted,
          }}
        >
          By engine
        </p>
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          style={{
            width: "100%",
            borderCollapse: "separate",
            borderSpacing: "0 8px",
          }}
        >
          <tbody>
            {keys.map((key) => (
              <EngineRow
                key={key}
                label={ENGINE_LABELS[key]}
                perf={report.perEngine[key]}
              />
            ))}
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function EngineRow({ label, perf }: { label: string; perf: EnginePerf }) {
  const band = scoreBand(perf.score);
  return (
    <tr>
      <td
        style={{
          padding: "12px 14px",
          border: `1px solid ${COLOR.border}`,
          borderRadius: "6px",
          backgroundColor: COLOR.surface,
        }}
      >
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td>
                <span
                  style={{
                    fontSize: "14px",
                    fontWeight: 500,
                    color: COLOR.text,
                  }}
                >
                  {label}
                </span>
              </td>
              <td align="right" style={{ whiteSpace: "nowrap" }}>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: BAND_COLOR[band],
                  }}
                >
                  {perf.score}
                </span>
                <span
                  style={{
                    paddingLeft: "8px",
                    fontSize: "12px",
                    color: COLOR.muted,
                  }}
                >
                  {perf.targetAppeared ? "cited" : "no citation"}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function IssuesAndWinsRow({ report }: { report: AuditReport }) {
  return (
    <tr>
      <td style={{ padding: "16px 24px 4px" }}>
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          style={{ width: "100%" }}
        >
          <tbody>
            <tr>
              <td style={{ paddingBottom: "8px" }}>
                <SectionHeading>Top issues</SectionHeading>
                <BulletList
                  items={report.topIssues}
                  bulletColor={COLOR.destructive}
                />
              </td>
            </tr>
            <tr>
              <td style={{ paddingTop: "12px" }}>
                <SectionHeading>What&apos;s working</SectionHeading>
                <BulletList
                  items={report.topWins}
                  bulletColor={COLOR.brand}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <p
      style={{
        margin: "0 0 8px",
        fontSize: "13px",
        fontWeight: 600,
        color: COLOR.text,
      }}
    >
      {children}
    </p>
  );
}

function BulletList({
  items,
  bulletColor,
}: {
  items: readonly string[];
  bulletColor: string;
}) {
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={{ width: "100%" }}
    >
      <tbody>
        {items.map((item, idx) => (
          <tr key={idx}>
            <td
              valign="top"
              width={10}
              style={{
                paddingTop: "10px",
                paddingRight: "8px",
                width: "10px",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: "6px",
                  height: "6px",
                  backgroundColor: bulletColor,
                  borderRadius: "999px",
                }}
              >
                &nbsp;
              </span>
            </td>
            <td
              style={{
                paddingTop: "4px",
                fontSize: "13px",
                lineHeight: "1.55",
                color: COLOR.text,
              }}
            >
              {item}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ViewReportRow({ reportUrl }: { reportUrl: string }) {
  return (
    <tr>
      <td style={{ padding: "16px 24px 0" }}>
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            lineHeight: "1.55",
            color: COLOR.muted,
          }}
        >
          View the full report:{" "}
          <a
            href={reportUrl}
            style={{
              color: COLOR.text,
              textDecoration: "underline",
              wordBreak: "break-all",
            }}
          >
            {reportUrl}
          </a>
        </p>
      </td>
    </tr>
  );
}

function CtaRow({ ctaUrl, domain }: { ctaUrl: string; domain: string }) {
  return (
    <tr>
      <td style={{ padding: "20px 24px" }}>
        <table
          role="presentation"
          cellPadding={0}
          cellSpacing={0}
          border={0}
          width="100%"
          style={{
            width: "100%",
            backgroundColor: COLOR.pageBg,
            border: `1px solid ${COLOR.borderStrong}`,
            borderRadius: "6px",
          }}
        >
          <tbody>
            <tr>
              <td style={{ padding: "16px 18px" }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 600,
                    color: COLOR.text,
                  }}
                >
                  One snapshot isn&apos;t enough.
                </p>
                <p
                  style={{
                    margin: "6px 0 14px",
                    fontSize: "13px",
                    lineHeight: "1.55",
                    color: COLOR.muted,
                  }}
                >
                  Answers re-rank weekly. Track {domain} across all four
                  engines and see what changes.
                </p>
                <a
                  href={ctaUrl}
                  style={{
                    display: "inline-block",
                    padding: "10px 16px",
                    backgroundColor: COLOR.text,
                    color: "#ffffff",
                    fontSize: "13px",
                    fontWeight: 500,
                    textDecoration: "none",
                    borderRadius: "6px",
                  }}
                >
                  Monitor this domain weekly for $39/mo →
                </a>
              </td>
            </tr>
          </tbody>
        </table>
      </td>
    </tr>
  );
}

function DisclaimerRow() {
  return (
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
          Snapshot taken just now. Engines re-rank on every prompt — a single
          scan is a starting point, not a verdict.
        </p>
      </td>
    </tr>
  );
}

function FooterTable({ baseUrl }: { baseUrl: string }) {
  const home = baseUrl.replace(/\/$/, "");
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width={MAX_WIDTH_PX}
      style={{
        width: "100%",
        maxWidth: `${MAX_WIDTH_PX}px`,
        marginTop: "16px",
      }}
    >
      <tbody>
        <tr>
          <td
            align="center"
            style={{
              padding: "12px 16px 0",
              fontFamily: FONT_STACK,
              fontSize: "11px",
              lineHeight: "1.55",
              color: COLOR.muted,
            }}
          >
            You&apos;re receiving this because you ran a free audit at{" "}
            <a
              href={home}
              style={{ color: COLOR.muted, textDecoration: "underline" }}
            >
              olokas.com
            </a>
            . No account required, no list signup — just this report.
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export default FreeAuditReportEmail;
