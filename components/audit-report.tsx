import * as React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { AuditReport, EnginePerf } from "@/lib/audit/mock-report";

// Phase 2.4 — renders an `AuditReport` produced by `generateMockReport`.
// All data is mock. The component is intentionally framework-light: no
// charts, no animations, no client interactivity yet (the share button
// arrives in 2.5). Brand voice is direct and a little dry — no "amazing
// insights!" copy.

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

// Map score bands to badge variants the project already supports. Accent is
// the brand orange — used for "strong"; secondary for "mixed"; destructive
// for "weak".
const BAND_VARIANT: Readonly<
  Record<ScoreBand, "accent" | "secondary" | "destructive">
> = {
  strong: "accent",
  mixed: "secondary",
  weak: "destructive",
};

export function AuditReportView({ report }: { report: AuditReport }) {
  const queryCount = report.queries.length;
  const queryNoun = queryCount === 1 ? "query" : "queries";

  return (
    <section className="flex flex-col gap-8" aria-label="Audit report">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Audit for {report.domain}
        </h1>
        <p className="max-w-[580px] text-[15px] leading-[1.55] text-muted-foreground">
          We ran your {queryCount} {queryNoun} against ChatGPT, Perplexity,
          Google AI Overviews, and Claude. Here&apos;s what they said.
        </p>
      </header>

      <OverallScoreCard score={report.geoScore} />

      <section
        className="flex flex-col gap-3"
        aria-labelledby="audit-by-engine-heading"
      >
        <h2
          id="audit-by-engine-heading"
          className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground"
        >
          By engine
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(Object.keys(ENGINE_LABELS) as Array<
            keyof typeof ENGINE_LABELS
          >).map((key) => (
            <EngineCard
              key={key}
              label={ENGINE_LABELS[key]}
              perf={report.perEngine[key]}
              targetDomain={report.domain}
            />
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top issues</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5 text-[13px] leading-[1.55]">
              {report.topIssues.map((issue, idx) => (
                <li key={idx} className="flex gap-2">
                  <span
                    className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-destructive"
                    aria-hidden="true"
                  />
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What&apos;s working</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2.5 text-[13px] leading-[1.55]">
              {report.topWins.map((win, idx) => (
                <li key={idx} className="flex gap-2">
                  <span
                    className="mt-[7px] h-1.5 w-1.5 flex-none rounded-full bg-accent"
                    aria-hidden="true"
                  />
                  <span>{win}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

      <UpgradeCta domain={report.domain} />

      <p className="text-xs text-muted-foreground">
        Snapshot taken just now. Engines re-rank on every prompt — a single
        scan is a starting point, not a verdict.
      </p>
    </section>
  );
}

function OverallScoreCard({ score }: { score: number }) {
  const band = scoreBand(score);
  return (
    <Card>
      <CardContent className="flex flex-col gap-2 p-6">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Overall GEO score
        </p>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="text-5xl font-semibold tabular-nums tracking-tight">
            {score}
          </span>
          <span className="text-sm text-muted-foreground">/ 100</span>
          <Badge variant={BAND_VARIANT[band]} className="ml-1">
            {BAND_LABEL[band]}
          </Badge>
        </div>
        <p className="text-[13px] leading-[1.55] text-muted-foreground">
          Average across all four engines, weighted by citation depth.
        </p>
      </CardContent>
    </Card>
  );
}

function EngineCard({
  label,
  perf,
  targetDomain,
}: {
  label: string;
  perf: EnginePerf;
  targetDomain: string;
}) {
  const band = scoreBand(perf.score);
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium">{label}</p>
          <Badge variant={BAND_VARIANT[band]}>{perf.score}</Badge>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
          <span
            aria-hidden="true"
            className={
              "inline-block h-1.5 w-1.5 rounded-full " +
              (perf.targetAppeared ? "bg-accent" : "bg-muted-foreground/40")
            }
          />
          <span>
            {perf.targetAppeared
              ? "Your domain appeared in citations"
              : "Your domain didn't appear"}
          </span>
        </div>
        <div className="flex flex-col gap-1.5 border-t border-border pt-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            Top citations
          </p>
          <ol className="flex flex-col gap-1 font-mono text-[12px] leading-[1.55] text-muted-foreground">
            {perf.citations.map((c, idx) => {
              const isTarget = c === targetDomain;
              return (
                <li
                  key={idx}
                  className={
                    isTarget
                      ? "font-medium text-foreground"
                      : undefined
                  }
                >
                  <span className="mr-1 tabular-nums">{idx + 1}.</span>
                  {c}
                </li>
              );
            })}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}

function UpgradeCta({ domain }: { domain: string }) {
  return (
    <Card className="border-foreground/30 bg-secondary/40">
      <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="text-base font-semibold tracking-tight">
            One snapshot isn&apos;t enough.
          </p>
          <p className="max-w-[420px] text-[13px] leading-[1.55] text-muted-foreground">
            Answers re-rank weekly. Track {domain} across all four engines and
            see what changes.
          </p>
        </div>
        <a
          href="/pricing"
          className="inline-flex items-center justify-center whitespace-nowrap rounded-md bg-foreground px-4 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Monitor this domain weekly for $39/mo →
        </a>
      </CardContent>
    </Card>
  );
}
