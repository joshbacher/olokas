// Phase 5.1 — weekly-report email template.
//
// Rendered for every active subscriber once a week. Summarizes the last
// scan window's GEO scores per engine, week-over-week deltas, and the
// 3-5 biggest changes (queries that gained or lost visibility).
//
// Like FreeAuditReport.tsx, this is a plain server-renderable React
// component with inline styles, table-only layout, and a 600px cap.
// Phase 5 will wire it to react-email + Resend; for now the props it
// expects are the contract callers must satisfy.
//
// Design constants and primitives come from `./shared` so all the new
// templates stay visually consistent. FreeAuditReport.tsx keeps its own
// inline copies (it shipped first; we don't refactor done work).
import * as React from "react";
import {
  COLOR,
  ENGINE_LABELS,
  EmailShell,
  BrandHeaderRow,
  EyebrowText,
  SectionHeading,
  BodyParagraph,
  CtaButton,
  CalloutCard,
  FooterBlock,
  type EngineKey,
  scoreBand,
  BAND_COLOR,
  trimSlash,
  DEFAULT_BASE_URL,
} from "./_shared";

export type WeeklyReportEnginePerf = {
  /** 0–100 GEO score for this engine, this week. */
  score: number;
  /** Score from the prior week, used to compute the delta arrow. */
  previousScore: number | null;
  /** Number of queries where the customer's domain appeared in citations. */
  citedQueries: number;
};

export type WeeklyReportChange = {
  /** Customer-facing query text. */
  query: string;
  /** Direction of the change. */
  direction: "up" | "down";
  /** Magnitude of the change in GEO points (always non-negative). */
  delta: number;
};

export type WeeklyReportProps = {
  /** First name or email handle for the greeting. */
  recipientName: string;
  /** Domain this report covers (e.g. "example.com"). */
  domain: string;
  /** Period end date as "YYYY-MM-DD" or a human-friendly label. */
  periodLabel: string;
  /** Average GEO score across all four engines, this week. */
  geoScore: number;
  /** Average GEO score from the prior week (null on the first send). */
  previousGeoScore: number | null;
  /** Per-engine performance for the week. */
  perEngine: Record<EngineKey, WeeklyReportEnginePerf>;
  /** Top 3-5 query movers, sorted by absolute delta desc. */
  topChanges: readonly WeeklyReportChange[];
  /** Marketing-site origin used for CTA links. Defaults to olokas.com. */
  baseUrl?: string;
};

const ENGINE_ORDER: readonly EngineKey[] = [
  "chatgpt",
  "perplexity",
  "googleAio",
  "claude",
];

function formatDelta(delta: number | null): string {
  if (delta === null) return "—";
  if (delta === 0) return "no change";
  const arrow = delta > 0 ? "▲" : "▼";
  return `${arrow} ${Math.abs(delta)}`;
}

function deltaColor(delta: number | null): string {
  if (delta === null) return COLOR.muted;
  if (delta > 0) return COLOR.success;
  if (delta < 0) return COLOR.destructive;
  return COLOR.muted;
}

export function WeeklyReportEmail({
  recipientName,
  domain,
  periodLabel,
  geoScore,
  previousGeoScore,
  perEngine,
  topChanges,
  baseUrl = DEFAULT_BASE_URL,
}: WeeklyReportProps) {
  const home = trimSlash(baseUrl);
  const dashboardUrl = `${home}/app/dashboard`;
  const overallDelta =
    previousGeoScore === null ? null : geoScore - previousGeoScore;

  return (
    <EmailShell footer={<FooterBlock baseUrl={baseUrl} />}>
      <BrandHeaderRow />

      <tr>
        <td style={{ padding: "24px 24px 8px" }}>
          <EyebrowText>Weekly report — {periodLabel}</EyebrowText>
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
            Hi {recipientName}, here&apos;s {domain} this week.
          </h1>
          <BodyParagraph muted>
            Visibility across ChatGPT, Perplexity, Google AI Overviews, and
            Claude. Compared to last week&apos;s scan.
          </BodyParagraph>
        </td>
      </tr>

      <tr>
        <td style={{ padding: "16px 24px 4px" }}>
          <CalloutCard tone="brand">
            <EyebrowText>Overall GEO score</EyebrowText>
            <table role="presentation" cellPadding={0} cellSpacing={0} border={0}>
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
                      {geoScore}
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
                  <td style={{ paddingLeft: "12px", paddingTop: "10px" }}>
                    <span
                      style={{
                        fontSize: "13px",
                        fontWeight: 600,
                        color: deltaColor(overallDelta),
                      }}
                    >
                      {formatDelta(overallDelta)}
                    </span>
                    <span
                      style={{
                        paddingLeft: "6px",
                        fontSize: "12px",
                        color: COLOR.muted,
                      }}
                    >
                      vs. last week
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </CalloutCard>
        </td>
      </tr>

      <tr>
        <td style={{ padding: "20px 24px 4px" }}>
          <SectionHeading>By engine</SectionHeading>
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
              {ENGINE_ORDER.map((key) => {
                const perf = perEngine[key];
                const band = scoreBand(perf.score);
                const engineDelta =
                  perf.previousScore === null
                    ? null
                    : perf.score - perf.previousScore;
                return (
                  <tr key={key}>
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
                                {ENGINE_LABELS[key]}
                              </span>
                              <span
                                style={{
                                  paddingLeft: "8px",
                                  fontSize: "12px",
                                  color: COLOR.muted,
                                }}
                              >
                                cited on {perf.citedQueries}{" "}
                                {perf.citedQueries === 1 ? "query" : "queries"}
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
                                  color: deltaColor(engineDelta),
                                }}
                              >
                                {formatDelta(engineDelta)}
                              </span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </td>
      </tr>

      {topChanges.length > 0 ? (
        <tr>
          <td style={{ padding: "20px 24px 4px" }}>
            <SectionHeading>Biggest movers</SectionHeading>
            <table
              role="presentation"
              cellPadding={0}
              cellSpacing={0}
              border={0}
              width="100%"
              style={{ width: "100%" }}
            >
              <tbody>
                {topChanges.map((change, idx) => (
                  <tr key={idx}>
                    <td
                      style={{
                        paddingTop: "10px",
                        fontSize: "13px",
                        lineHeight: "1.55",
                        color: COLOR.text,
                      }}
                    >
                      {change.query}
                    </td>
                    <td
                      align="right"
                      style={{
                        paddingTop: "10px",
                        fontSize: "13px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                        color:
                          change.direction === "up"
                            ? COLOR.success
                            : COLOR.destructive,
                      }}
                    >
                      {change.direction === "up" ? "▲" : "▼"} {change.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      ) : (
        <tr>
          <td style={{ padding: "20px 24px 4px" }}>
            <SectionHeading>Biggest movers</SectionHeading>
            <BodyParagraph muted marginTop="0px" size="13px">
              No queries moved more than a couple of points this week. Steady
              week.
            </BodyParagraph>
          </td>
        </tr>
      )}

      <tr>
        <td style={{ padding: "20px 24px" }}>
          <CalloutCard tone="neutral">
            <p
              style={{
                margin: 0,
                fontSize: "14px",
                fontWeight: 600,
                color: COLOR.text,
              }}
            >
              See it in context
            </p>
            <BodyParagraph muted marginTop="6px" size="13px">
              Per-query history and citation breakdowns live in your dashboard.
            </BodyParagraph>
            <div style={{ paddingTop: "12px" }}>
              <CtaButton href={dashboardUrl}>Open dashboard →</CtaButton>
            </div>
          </CalloutCard>
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
            One scan per week per engine. Engines re-rank constantly — week-
            over-week deltas smooth most of the noise out.
          </p>
        </td>
      </tr>
    </EmailShell>
  );
}

export default WeeklyReportEmail;
