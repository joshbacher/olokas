// Phase 2.6 — server-side render helper for the free-audit report email.
//
// Output is a pure HTML string identical in structure to the React template
// in `emails/FreeAuditReport.tsx`. We don't go through `react-dom/server`
// because Next.js 14 forbids that import anywhere in the app/ graph; the
// React component still exists as the canonical source of truth for layout
// (and is what we'll feed to the `react-email` package in Phase 5), but the
// runtime path is a hand-rolled string builder.
//
// Email constraints we mirror from the React template:
//   - layout uses <table> elements only
//   - all styling is inline (clients ignore <style> tags + CSS variables)
//   - typography is system-font-only
//   - max width clamps at 600px
//   - colors are hex, not hsl()
//
// The helper is server-only (it produces HTML for outbound email). Real
// dispatch via Resend lives in Phase 5; this route only renders.

import type { AuditReport, EnginePerf } from "@/lib/audit/mock-report";

export type RenderedAuditEmail = {
  /** Email subject line. */
  subject: string;
  /** Preheader text — the snippet most clients show next to the subject. */
  preview: string;
  /** Full HTML payload (DOCTYPE + html). Safe to drop into a Resend `html` field. */
  html: string;
};

export type RenderFreeAuditEmailOptions = {
  /** Public URL the recipient can revisit to see the full report. */
  reportUrl?: string;
  /** Marketing-site origin used for the CTA link. */
  baseUrl?: string;
};

const DEFAULT_BASE_URL = "https://olokas.com";

// Light-theme palette translated from globals.css to hex so email clients
// that ignore CSS vars still render correctly. Mirrors the constants in
// `emails/FreeAuditReport.tsx` 1:1 — keep them in sync.
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

/** Subject line — short, factual, plain-text safe. */
function buildSubject(report: AuditReport): string {
  return `Your Olokas audit for ${report.domain} — GEO ${report.geoScore}/100`;
}

/** Preheader — limited to ~110 chars so it doesn't get truncated. */
function buildPreview(report: AuditReport): string {
  const cited = Object.values(report.perEngine).filter(
    (e) => e.targetAppeared
  ).length;
  const totalEngines = 4;
  return `Score ${report.geoScore}/100. Cited on ${cited} of ${totalEngines} engines: ChatGPT, Perplexity, Google AI Overviews, Claude.`;
}

/**
 * Render the email to its final HTML payload. Pure: same input -> same output.
 */
export function renderFreeAuditReportEmail(
  report: AuditReport,
  options?: RenderFreeAuditEmailOptions
): RenderedAuditEmail {
  const baseUrl = (options?.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const reportUrl = options?.reportUrl;

  const body = renderEmailBody(report, { baseUrl, reportUrl });
  const subject = buildSubject(report);
  const preview = buildPreview(report);

  // Outlook + Gmail-tolerant shell. The preview span is the standard
  // hidden-preheader trick: zero opacity + zero font size + zero line
  // height keeps it out of the visible body but still feeds the snippet
  // most clients show.
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light" />
    <meta name="supported-color-schemes" content="light" />
    <title>${escapeHtml(subject)}</title>
  </head>
  <body style="margin:0;padding:0;background-color:${COLOR.pageBg};">
    <span style="display:none !important;visibility:hidden;mso-hide:all;font-size:0;line-height:0;max-height:0;max-width:0;opacity:0;overflow:hidden;">${escapeHtml(
      preview
    )}</span>
    ${body}
  </body>
</html>`;

  return { subject, preview, html };
}

function renderEmailBody(
  report: AuditReport,
  ctx: { baseUrl: string; reportUrl?: string }
): string {
  const overallBand = scoreBand(report.geoScore);
  const queryCount = report.queries.length;
  const queryNoun = queryCount === 1 ? "query" : "queries";
  const ctaUrl = `${ctx.baseUrl}/pricing`;

  const innerRows = [
    brandHeaderRow(),
    heroRow(report, queryCount, queryNoun),
    overallScoreRow(report.geoScore, overallBand),
    byEngineRow(report),
    issuesAndWinsRow(report),
    ctx.reportUrl ? viewReportRow(ctx.reportUrl) : "",
    ctaRow(ctaUrl, report.domain),
    disclaimerRow(),
  ]
    .filter(Boolean)
    .join("");

  const innerTable = `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${MAX_WIDTH_PX}" style="${inline(
    {
      width: "100%",
      maxWidth: `${MAX_WIDTH_PX}px`,
      backgroundColor: COLOR.surface,
      border: `1px solid ${COLOR.border}`,
      borderRadius: "8px",
      fontFamily: FONT_STACK,
      color: COLOR.text,
    }
  )}"><tbody>${innerRows}</tbody></table>`;

  const footer = footerTable(ctx.baseUrl);

  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${inline(
    {
      width: "100%",
      backgroundColor: COLOR.pageBg,
      margin: "0",
      padding: "0",
      borderCollapse: "collapse",
    }
  )}"><tbody><tr><td align="center" style="${inline({
    padding: "32px 16px",
  })}">${innerTable}${footer}</td></tr></tbody></table>`;
}

function brandHeaderRow(): string {
  return `<tr><td style="${inline({
    padding: "20px 24px 16px",
    borderBottom: `1px solid ${COLOR.border}`,
  })}"><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td width="22" height="22" style="${inline(
    {
      width: "22px",
      height: "22px",
      backgroundColor: COLOR.brand,
      borderRadius: "11px",
      fontSize: "0",
      lineHeight: "22px",
    }
  )}">&nbsp;</td><td style="${inline({
    paddingLeft: "10px",
  })}"><span style="${inline({
    fontSize: "16px",
    fontWeight: "600",
    letterSpacing: "-0.01em",
    color: COLOR.text,
  })}">Olokas</span></td></tr></tbody></table></td></tr>`;
}

function heroRow(
  report: AuditReport,
  queryCount: number,
  queryNoun: string
): string {
  return `<tr><td style="${inline({
    padding: "24px 24px 8px",
  })}"><p style="${inline({
    margin: "0",
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLOR.muted,
  })}">Audit ready</p><h1 style="${inline({
    margin: "8px 0 0",
    fontSize: "22px",
    lineHeight: "1.2",
    fontWeight: "600",
    letterSpacing: "-0.01em",
    color: COLOR.text,
  })}">Your audit for ${escapeHtml(report.domain)}</h1><p style="${inline({
    margin: "10px 0 0",
    fontSize: "14px",
    lineHeight: "1.55",
    color: COLOR.muted,
  })}">We ran your ${queryCount} ${queryNoun} against ChatGPT, Perplexity, Google AI Overviews, and Claude. Here&rsquo;s the snapshot.</p></td></tr>`;
}

function overallScoreRow(score: number, band: ScoreBand): string {
  return `<tr><td style="${inline({
    padding: "16px 24px 4px",
  })}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${inline(
    {
      width: "100%",
      backgroundColor: COLOR.brandSoftBg,
      borderRadius: "6px",
    }
  )}"><tbody><tr><td style="${inline({
    padding: "16px 18px",
  })}"><p style="${inline({
    margin: "0",
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLOR.muted,
  })}">Overall GEO score</p><table role="presentation" cellpadding="0" cellspacing="0" border="0"><tbody><tr><td style="${inline(
    { paddingTop: "6px" }
  )}"><span style="${inline({
    fontSize: "36px",
    lineHeight: "1",
    fontWeight: "600",
    letterSpacing: "-0.02em",
    color: COLOR.text,
  })}">${score}</span><span style="${inline({
    paddingLeft: "6px",
    fontSize: "13px",
    color: COLOR.muted,
  })}"> / 100</span></td><td style="${inline({
    paddingLeft: "12px",
    paddingTop: "8px",
  })}">${bandPill(band)}</td></tr></tbody></table><p style="${inline({
    margin: "8px 0 0",
    fontSize: "12px",
    lineHeight: "1.55",
    color: COLOR.muted,
  })}">Average across all four engines, weighted by citation depth.</p></td></tr></tbody></table></td></tr>`;
}

function bandPill(band: ScoreBand): string {
  return `<span style="${inline({
    display: "inline-block",
    padding: "3px 10px",
    backgroundColor: BAND_COLOR[band],
    color: "#ffffff",
    borderRadius: "999px",
    fontSize: "11px",
    fontWeight: "600",
    letterSpacing: "0.02em",
    whiteSpace: "nowrap",
  })}">${BAND_LABEL[band]}</span>`;
}

function byEngineRow(report: AuditReport): string {
  const keys = Object.keys(ENGINE_LABELS) as Array<keyof typeof ENGINE_LABELS>;
  const engines = keys
    .map((key) => engineRow(ENGINE_LABELS[key], report.perEngine[key]))
    .join("");
  return `<tr><td style="${inline({
    padding: "20px 24px 4px",
  })}"><p style="${inline({
    margin: "0 0 10px",
    fontSize: "11px",
    fontWeight: "500",
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    color: COLOR.muted,
  })}">By engine</p><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${inline(
    {
      width: "100%",
      borderCollapse: "separate",
      borderSpacing: "0 8px",
    }
  )}"><tbody>${engines}</tbody></table></td></tr>`;
}

function engineRow(label: string, perf: EnginePerf): string {
  const band = scoreBand(perf.score);
  return `<tr><td style="${inline({
    padding: "12px 14px",
    border: `1px solid ${COLOR.border}`,
    borderRadius: "6px",
    backgroundColor: COLOR.surface,
  })}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${inline(
    { width: "100%" }
  )}"><tbody><tr><td><span style="${inline({
    fontSize: "14px",
    fontWeight: "500",
    color: COLOR.text,
  })}">${escapeHtml(label)}</span></td><td align="right" style="${inline({
    whiteSpace: "nowrap",
  })}"><span style="${inline({
    fontSize: "13px",
    fontWeight: "600",
    color: BAND_COLOR[band],
  })}">${perf.score}</span><span style="${inline({
    paddingLeft: "8px",
    fontSize: "12px",
    color: COLOR.muted,
  })}">${perf.targetAppeared ? "cited" : "no citation"}</span></td></tr></tbody></table></td></tr>`;
}

function issuesAndWinsRow(report: AuditReport): string {
  return `<tr><td style="${inline({
    padding: "16px 24px 4px",
  })}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${inline(
    { width: "100%" }
  )}"><tbody><tr><td style="${inline({
    paddingBottom: "8px",
  })}">${sectionHeading("Top issues")}${bulletList(
    report.topIssues,
    COLOR.destructive
  )}</td></tr><tr><td style="${inline({
    paddingTop: "12px",
  })}">${sectionHeading("What&rsquo;s working")}${bulletList(
    report.topWins,
    COLOR.brand
  )}</td></tr></tbody></table></td></tr>`;
}

function sectionHeading(text: string): string {
  return `<p style="${inline({
    margin: "0 0 8px",
    fontSize: "13px",
    fontWeight: "600",
    color: COLOR.text,
  })}">${text}</p>`;
}

function bulletList(items: readonly string[], bulletColor: string): string {
  const rows = items
    .map(
      (item) => `<tr><td valign="top" width="10" style="${inline({
        paddingTop: "10px",
        paddingRight: "8px",
        width: "10px",
      })}"><span style="${inline({
        display: "inline-block",
        width: "6px",
        height: "6px",
        backgroundColor: bulletColor,
        borderRadius: "999px",
      })}">&nbsp;</span></td><td style="${inline({
        paddingTop: "4px",
        fontSize: "13px",
        lineHeight: "1.55",
        color: COLOR.text,
      })}">${escapeHtml(item)}</td></tr>`
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${inline(
    { width: "100%" }
  )}"><tbody>${rows}</tbody></table>`;
}

function viewReportRow(reportUrl: string): string {
  return `<tr><td style="${inline({
    padding: "16px 24px 0",
  })}"><p style="${inline({
    margin: "0",
    fontSize: "13px",
    lineHeight: "1.55",
    color: COLOR.muted,
  })}">View the full report: <a href="${escapeAttr(
    reportUrl
  )}" style="${inline({
    color: COLOR.text,
    textDecoration: "underline",
    wordBreak: "break-all",
  })}">${escapeHtml(reportUrl)}</a></p></td></tr>`;
}

function ctaRow(ctaUrl: string, domain: string): string {
  return `<tr><td style="${inline({
    padding: "20px 24px",
  })}"><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="${inline(
    {
      width: "100%",
      backgroundColor: COLOR.pageBg,
      border: `1px solid ${COLOR.borderStrong}`,
      borderRadius: "6px",
    }
  )}"><tbody><tr><td style="${inline({
    padding: "16px 18px",
  })}"><p style="${inline({
    margin: "0",
    fontSize: "14px",
    fontWeight: "600",
    color: COLOR.text,
  })}">One snapshot isn&rsquo;t enough.</p><p style="${inline({
    margin: "6px 0 14px",
    fontSize: "13px",
    lineHeight: "1.55",
    color: COLOR.muted,
  })}">Answers re-rank weekly. Track ${escapeHtml(
    domain
  )} across all four engines and see what changes.</p><a href="${escapeAttr(
    ctaUrl
  )}" style="${inline({
    display: "inline-block",
    padding: "10px 16px",
    backgroundColor: COLOR.text,
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "500",
    textDecoration: "none",
    borderRadius: "6px",
  })}">Monitor this domain weekly for $39/mo &rarr;</a></td></tr></tbody></table></td></tr>`;
}

function disclaimerRow(): string {
  return `<tr><td style="${inline({
    padding: "0 24px 24px",
  })}"><p style="${inline({
    margin: "0",
    fontSize: "11px",
    lineHeight: "1.55",
    color: COLOR.muted,
  })}">Snapshot taken just now. Engines re-rank on every prompt &mdash; a single scan is a starting point, not a verdict.</p></td></tr>`;
}

function footerTable(baseUrl: string): string {
  const home = baseUrl.replace(/\/$/, "");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="${MAX_WIDTH_PX}" style="${inline(
    {
      width: "100%",
      maxWidth: `${MAX_WIDTH_PX}px`,
      marginTop: "16px",
    }
  )}"><tbody><tr><td align="center" style="${inline({
    padding: "12px 16px 0",
    fontFamily: FONT_STACK,
    fontSize: "11px",
    lineHeight: "1.55",
    color: COLOR.muted,
  })}">You&rsquo;re receiving this because you ran a free audit at <a href="${escapeAttr(
    home
  )}" style="${inline({
    color: COLOR.muted,
    textDecoration: "underline",
  })}">olokas.com</a>. No account required, no list signup &mdash; just this report.</td></tr></tbody></table>`;
}

/** Build an inline `style="..."` value from a JS-style props object. */
function inline(props: Record<string, string>): string {
  return Object.entries(props)
    .map(([k, v]) => `${camelToKebab(k)}:${v}`)
    .join(";");
}

function camelToKebab(s: string): string {
  return s.replace(/([A-Z])/g, "-$1").toLowerCase();
}

/** Escape text content destined for HTML output. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escape values destined for HTML attributes (e.g., href). */
function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
