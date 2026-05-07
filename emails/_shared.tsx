// Shared design tokens and primitives for Olokas email templates.
//
// Phase 5.1 — these constants/helpers are extracted so the four new
// templates (WeeklyReport, Welcome, FailedPayment, CancellationConfirmation)
// stay visually consistent without duplicating palette and shell code.
//
// FreeAuditReport.tsx (shipped in Phase 2.6) intentionally keeps its own
// inlined copies of these tokens so it remains self-contained — that file
// is canonical for the audit email and was already shipped against, so we
// don't refactor it here.
//
// Email constraints honored everywhere these primitives are used:
//   - layout uses <table> elements only (no flex / grid as containers)
//   - all styling is inline (clients ignore <style> tags + CSS variables)
//   - typography is system-font-only (no @font-face)
//   - max width clamps at 600px (Outlook-friendly cap)
//   - colors are hex, not hsl(), to dodge legacy clients
//   - no client-side JS, no images that aren't already on olokas.com
//
// Components are plain server-renderable React (no "use client", no hooks).
import * as React from "react";

/**
 * Light-theme palette translated from globals.css to hex so email clients
 * that ignore CSS vars still render correctly.
 */
export const COLOR = {
  pageBg: "#f4f1ea",
  surface: "#ffffff",
  text: "#121212",
  muted: "#54514c",
  border: "#e3dfd6",
  borderStrong: "#cdc8bd",
  brand: "#ff6b35",
  destructive: "#dc2626",
  success: "#1f7a3a",
  warn: "#a35a00",
  mixed: "#6b6b6b",
  brandSoftBg: "#fff3ec",
} as const;

export const FONT_STACK =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

export const MAX_WIDTH_PX = 600;

export const DEFAULT_BASE_URL = "https://olokas.com";

/** Strip a trailing slash so we can safely append paths. */
export function trimSlash(url: string): string {
  return url.replace(/\/$/, "");
}

/**
 * Outer page shell: full-bleed page background + centered 600px card.
 * Children are placed inside the card's <tbody>; the footer sits below.
 */
export function EmailShell({
  children,
  footer,
}: {
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
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
              <tbody>{children}</tbody>
            </table>
            {footer ?? null}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Brand strip at the top of the card. Mirrors FreeAuditReport's header. */
export function BrandHeaderRow() {
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

/** Standard small "eyebrow" caption — uppercased, tracked, muted. */
export function EyebrowText({ children }: { children: React.ReactNode }) {
  return (
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
      {children}
    </p>
  );
}

/** Section title used inside content rows. */
export function SectionHeading({ children }: { children: React.ReactNode }) {
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

/** Body paragraph. Uniform spacing keeps clients from reflowing oddly. */
export function BodyParagraph({
  children,
  marginTop = "10px",
  size = "14px",
  muted = false,
}: {
  children: React.ReactNode;
  marginTop?: string;
  size?: "13px" | "14px";
  muted?: boolean;
}) {
  return (
    <p
      style={{
        margin: `${marginTop} 0 0`,
        fontSize: size,
        lineHeight: "1.55",
        color: muted ? COLOR.muted : COLOR.text,
      }}
    >
      {children}
    </p>
  );
}

/**
 * Solid CTA button rendered as an <a> for client compatibility. Outlook
 * still accepts inline styles on anchors; we avoid VML for simplicity.
 */
export function CtaButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const bg = variant === "primary" ? COLOR.text : COLOR.surface;
  const fg = variant === "primary" ? "#ffffff" : COLOR.text;
  const border =
    variant === "primary"
      ? `1px solid ${COLOR.text}`
      : `1px solid ${COLOR.borderStrong}`;
  return (
    <a
      href={href}
      style={{
        display: "inline-block",
        padding: "10px 16px",
        backgroundColor: bg,
        color: fg,
        fontSize: "13px",
        fontWeight: 500,
        textDecoration: "none",
        borderRadius: "6px",
        border,
      }}
    >
      {children}
    </a>
  );
}

/**
 * Bullet list with a colored dot. Mirrors FreeAuditReport.tsx pattern so
 * the visual treatment of "issues" / "wins" / "what's next" lists is
 * identical across every email.
 */
export function BulletList({
  items,
  bulletColor = COLOR.brand,
}: {
  items: readonly string[];
  bulletColor?: string;
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

/** Soft attention card used for stat blocks, callouts, etc. */
export function CalloutCard({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "warn" | "danger";
}) {
  const toneMap = {
    neutral: { bg: COLOR.pageBg, border: COLOR.borderStrong },
    brand: { bg: COLOR.brandSoftBg, border: COLOR.brand },
    warn: { bg: "#fff7ec", border: "#e0b270" },
    danger: { bg: "#fdecec", border: "#e6a3a3" },
  } as const;
  const { bg, border } = toneMap[tone];
  return (
    <table
      role="presentation"
      cellPadding={0}
      cellSpacing={0}
      border={0}
      width="100%"
      style={{
        width: "100%",
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: "6px",
      }}
    >
      <tbody>
        <tr>
          <td style={{ padding: "16px 18px" }}>{children}</td>
        </tr>
      </tbody>
    </table>
  );
}

/** Footer block beneath the card — small, muted, with a single home link. */
export function FooterBlock({
  baseUrl = DEFAULT_BASE_URL,
  children,
}: {
  baseUrl?: string;
  children?: React.ReactNode;
}) {
  const home = trimSlash(baseUrl);
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
            {children ?? (
              <>
                Sent by{" "}
                <a
                  href={home}
                  style={{ color: COLOR.muted, textDecoration: "underline" }}
                >
                  Olokas
                </a>
                . You can manage email preferences from your account settings.
              </>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

/** Engine label dictionary used by WeeklyReport. */
export const ENGINE_LABELS = {
  chatgpt: "ChatGPT",
  perplexity: "Perplexity",
  googleAio: "Google AI Overviews",
  claude: "Claude",
} as const;

export type EngineKey = keyof typeof ENGINE_LABELS;

/** Score band classification matching FreeAuditReport.tsx. */
export type ScoreBand = "strong" | "mixed" | "weak";

export function scoreBand(score: number): ScoreBand {
  if (score >= 70) return "strong";
  if (score >= 45) return "mixed";
  return "weak";
}

export const BAND_COLOR: Readonly<Record<ScoreBand, string>> = {
  strong: COLOR.success,
  mixed: COLOR.mixed,
  weak: COLOR.destructive,
};
