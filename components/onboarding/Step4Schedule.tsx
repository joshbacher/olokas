"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { completeOnboardingAction } from "@/app/app/onboarding/actions";

// Step 4: Review + schedule first scan.
//
// Shows a summary of what the user set up (domain, queries, competitors),
// then calls completeOnboardingAction() on confirm. The server action inserts
// queries, competitor rows, and scan jobs, then redirects to
// /app/dashboard?onboarding=complete. This component does not do any
// navigation itself — the server action redirect handles it.

const SCAN_ENGINES = ["ChatGPT", "Perplexity", "Google AIO", "Claude"] as const;

export interface Step4ScheduleProps {
  domain: string;
  domainId: string;
  selectedQueries: string[];
  competitorDomains: string[];
  onBack: () => void;
  onSkip: () => void;
}

export function Step4Schedule({
  domain,
  domainId,
  selectedQueries,
  competitorDomains,
  onBack,
  onSkip,
}: Step4ScheduleProps) {
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSchedule() {
    setError(null);
    setPending(true);
    try {
      const result = await completeOnboardingAction({
        domainId,
        selectedQueries,
        competitorDomains,
      });
      // If we reach here without redirect, the action returned an error.
      if (result && !result.ok) {
        setError(result.error ?? "Something went wrong. Try again.");
        setPending(false);
      }
      // On success the server action redirects — no client navigation needed.
    } catch (e) {
      // Next.js redirect() throws a NEXT_REDIRECT error internally; that's
      // expected and means success. Anything else is a real error.
      const msg = e instanceof Error ? e.message : "";
      if (!msg.includes("NEXT_REDIRECT")) {
        setError("Something went wrong. Try again.");
        setPending(false);
      }
    }
  }

  const totalJobs = selectedQueries.length * 4; // 4 engines

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Ready to schedule your first scan
        </h2>
        <p className="text-sm text-muted-foreground">
          Here&apos;s what we&apos;ll set up. Scans run in the background and
          results show up in your dashboard within the hour.
        </p>
      </div>

      <div className="rounded-lg border bg-card divide-y divide-border">
        {/* Domain */}
        <div className="px-5 py-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-1">
              Domain
            </p>
            <p className="text-sm font-medium">{domain}</p>
          </div>
        </div>

        {/* Queries */}
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Queries ({selectedQueries.length})
          </p>
          <ul className="space-y-1">
            {selectedQueries.map((q, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-start gap-1.5">
                <span className="text-muted-foreground select-none">·</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Competitors */}
        {competitorDomains.length > 0 ? (
          <div className="px-5 py-4">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
              Competitors ({competitorDomains.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {competitorDomains.map((d, i) => (
                <Badge key={i} variant="outline">
                  {d}
                </Badge>
              ))}
            </div>
          </div>
        ) : null}

        {/* Engines */}
        <div className="px-5 py-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">
            Engines scanned
          </p>
          <div className="flex flex-wrap gap-1.5">
            {SCAN_ENGINES.map((e) => (
              <Badge key={e} variant="secondary">
                {e}
              </Badge>
            ))}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {totalJobs} scan job{totalJobs === 1 ? "" : "s"} queued.
          </p>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack} disabled={pending}>
          ← Back
        </Button>
        <Button type="button" onClick={handleSchedule} disabled={pending}>
          {pending ? "Scheduling…" : "Start your first scan →"}
        </Button>
        <button
          type="button"
          onClick={onSkip}
          disabled={pending}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors disabled:opacity-50"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
