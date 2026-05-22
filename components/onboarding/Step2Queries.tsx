"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestQueriesForDomainAction } from "@/app/app/onboarding/actions";

// Step 2: Select starter queries from AI-generated suggestions.
//
// On mount, calls suggestQueriesForDomainAction(domain) to fetch up to 10
// query suggestions. All are selected by default — the user unchecks the
// ones they don't want. They can also edit individual suggestions inline.
//
// At least one must be selected to proceed. The parent component will later
// enforce plan limits (query_limit) before inserting.

export interface Step2QueriesProps {
  domain: string;
  queryLimit: number;
  onComplete: (selectedQueries: string[]) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function Step2Queries({
  domain,
  queryLimit,
  onComplete,
  onBack,
  onSkip,
}: Step2QueriesProps) {
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<boolean[]>([]);
  const [edited, setEdited] = React.useState<string[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    setLoading(true);
    suggestQueriesForDomainAction(domain)
      .then((results) => {
        if (cancelled) return;
        setSuggestions(results);
        setSelected(results.map(() => true));
        setEdited(results.map((r) => r));
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load suggestions. You can type queries manually below.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [domain]);

  function toggleIndex(i: number) {
    setSelected((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function editQuery(i: number, value: string) {
    setEdited((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function handleContinue() {
    const picked = edited
      .filter((_, i) => selected[i])
      .map((q) => q.trim())
      .filter((q) => q.length > 0);
    if (picked.length === 0) {
      setError("Select at least one query to continue.");
      return;
    }
    // Respect plan query_limit — silently truncate (the action enforces it
    // server-side too, but a client-side note is kinder).
    onComplete(picked.slice(0, queryLimit));
  }

  const selectedCount = selected.filter(Boolean).length;

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">
            Finding starter queries for {domain}…
          </h2>
          <p className="text-sm text-muted-foreground">
            Analysing your site to suggest the right questions.
          </p>
        </div>
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 rounded-md bg-muted animate-pulse"
              style={{ width: `${70 + (i % 3) * 10}%` }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Select queries to track
        </h2>
        <p className="text-sm text-muted-foreground">
          These are what we&apos;ll ask AI search engines — checking whether{" "}
          <span className="font-medium text-foreground">{domain}</span> shows
          up. Edit any suggestion or uncheck the ones you don&apos;t want.
          {queryLimit < 10 ? (
            <span className="ml-1">
              Your plan allows {queryLimit} quer{queryLimit === 1 ? "y" : "ies"}.
            </span>
          ) : null}
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <ul className="space-y-2">
        {suggestions.map((_, i) => (
          <li
            key={i}
            className={`flex items-center gap-3 rounded-md border px-4 py-3 transition-colors ${
              selected[i]
                ? "border-ring/50 bg-muted/40"
                : "border-border bg-card opacity-60"
            }`}
          >
            <input
              id={`query-checkbox-${i}`}
              type="checkbox"
              checked={selected[i] ?? false}
              onChange={() => {
                toggleIndex(i);
                setError(null);
              }}
              className="h-4 w-4 shrink-0 rounded border-input accent-accent cursor-pointer"
              aria-label={`Select query: ${edited[i]}`}
            />
            <Input
              type="text"
              value={edited[i] ?? ""}
              onChange={(e) => editQuery(i, e.target.value)}
              disabled={!selected[i]}
              maxLength={500}
              className="border-0 bg-transparent p-0 h-auto text-sm focus-visible:ring-0 focus-visible:ring-offset-0 disabled:opacity-40"
              aria-label={`Edit query ${i + 1}`}
            />
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted-foreground">
        {selectedCount} of {suggestions.length} selected
        {queryLimit < suggestions.length && selectedCount > queryLimit ? (
          <span className="text-amber-600 ml-1">
            (only the first {queryLimit} will be saved — your plan limit)
          </span>
        ) : null}
      </p>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={selectedCount === 0}
        >
          Continue →
        </Button>
        <button
          type="button"
          onClick={onSkip}
          className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
