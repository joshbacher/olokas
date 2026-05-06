"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AUDIT_FACTS } from "@/lib/audit/facts";

const POLL_INTERVAL_MS = 3_000;
const POLL_TIMEOUT_MS = 90_000;
const FACT_ROTATE_MS = 6_000;

type Phase = "polling" | "ready";

type ViewState = {
  phase: Phase;
  elapsedMs: number;
  factIndex: number;
};

const initialState: ViewState = {
  phase: "polling",
  elapsedMs: 0,
  factIndex: 0,
};

export function AuditStatusView({ auditId }: { auditId: string }) {
  const [state, setState] = React.useState<ViewState>(initialState);

  // Polling: hit the (stubbed) status endpoint every few seconds while we
  // wait for the audit to "complete". The client carries the 90s timer; the
  // endpoint's response is ignored for 2.3 because it's still a stub.
  React.useEffect(() => {
    const start = Date.now();
    let cancelled = false;
    let lastFetch: Promise<unknown> | null = null;

    const interval = window.setInterval(() => {
      if (cancelled) return;
      const elapsedMs = Date.now() - start;

      lastFetch = fetch(`/api/audit/${auditId}/status`, {
        method: "GET",
        headers: { Accept: "application/json" },
        cache: "no-store",
      }).catch(() => null);

      if (elapsedMs >= POLL_TIMEOUT_MS) {
        setState((s) => ({ ...s, phase: "ready", elapsedMs }));
        window.clearInterval(interval);
        return;
      }
      setState((s) => ({ ...s, elapsedMs }));
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      // Discard any in-flight result; we don't want to setState after unmount.
      void lastFetch;
    };
  }, [auditId]);

  // Rotate the did-you-know cards on a separate timer so they advance even
  // if a poll is slow.
  React.useEffect(() => {
    const interval = window.setInterval(() => {
      setState((s) => ({
        ...s,
        factIndex: (s.factIndex + 1) % AUDIT_FACTS.length,
      }));
    }, FACT_ROTATE_MS);
    return () => window.clearInterval(interval);
  }, []);

  const percent = Math.min(
    100,
    Math.round((state.elapsedMs / POLL_TIMEOUT_MS) * 100)
  );

  if (state.phase === "ready") {
    return <AuditReadyMock auditId={auditId} />;
  }

  return (
    <section className="flex flex-col gap-8">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Running your audit…
        </h1>
        <p className="max-w-[580px] text-[15px] leading-[1.55] text-muted-foreground">
          We&apos;re asking ChatGPT, Perplexity, Google AI Overviews, and
          Claude your queries. This usually takes about a minute and a half.
          You can leave this tab open or come back later — the report sticks
          around at this URL.
        </p>
      </header>

      <div
        className="flex flex-col gap-2"
        aria-label="Audit progress"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        role="progressbar"
      >
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full bg-foreground transition-[width] duration-500 ease-out"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          {percent}% — running across four engines
        </p>
      </div>

      <FactCard index={state.factIndex} />

      <p className="text-xs text-muted-foreground">
        Audit ID:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          {auditId}
        </code>
      </p>
    </section>
  );
}

function FactCard({ index }: { index: number }) {
  const fact = AUDIT_FACTS[index % AUDIT_FACTS.length];
  return (
    <Card aria-live="polite">
      <CardContent className="flex flex-col gap-2 p-5">
        <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          Did you know
        </p>
        <p className="text-sm font-medium leading-snug">{fact.title}</p>
        <p className="text-[13px] leading-[1.55] text-muted-foreground">
          {fact.body}
        </p>
      </CardContent>
    </Card>
  );
}

function AuditReadyMock({ auditId }: { auditId: string }) {
  return (
    <section className="flex flex-col gap-6">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">
          Your audit is ready.
        </h1>
        <p className="max-w-[580px] text-[15px] leading-[1.55] text-muted-foreground">
          The full report renders here in the next build step. For now this is
          a placeholder so the flow is wired end to end.
        </p>
      </header>
      <p className="text-xs text-muted-foreground">
        Audit ID:{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
          {auditId}
        </code>
      </p>
    </section>
  );
}
