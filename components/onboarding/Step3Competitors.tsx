"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Step 3: Optionally add competitor domains.
//
// The user can add up to 5 competitor domains. These will be associated with
// every query they selected in step 2 (stored as query_competitors rows).
// This step is entirely optional — clicking "Continue" with no competitors
// is fine.

const MAX_COMPETITORS = 5;

export interface Step3CompetitorsProps {
  selectedQueries: string[];
  onComplete: (competitorDomains: string[]) => void;
  onBack: () => void;
  onSkip: () => void;
}

export function Step3Competitors({
  selectedQueries,
  onComplete,
  onBack,
  onSkip,
}: Step3CompetitorsProps) {
  const [inputs, setInputs] = React.useState<string[]>([""]);
  const [error, setError] = React.useState<string | null>(null);

  function addSlot() {
    if (inputs.length < MAX_COMPETITORS) {
      setInputs((prev) => [...prev, ""]);
    }
  }

  function removeSlot(i: number) {
    setInputs((prev) => prev.filter((_, idx) => idx !== i));
  }

  function updateSlot(i: number, value: string) {
    setInputs((prev) => prev.map((v, idx) => (idx === i ? value : v)));
    setError(null);
  }

  function handleContinue() {
    const clean = inputs.map((v) => v.trim()).filter((v) => v.length > 0);
    onComplete(clean);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Add competitor domains{" "}
          <span className="text-muted-foreground font-normal">(optional)</span>
        </h2>
        <p className="text-sm text-muted-foreground">
          We&apos;ll track whether these sites show up in the same AI search
          results as yours — useful for benchmarking. Applies to all{" "}
          {selectedQueries.length} quer
          {selectedQueries.length === 1 ? "y" : "ies"} you selected.
        </p>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {inputs.map((val, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex-1 space-y-1">
              <Label htmlFor={`competitor-${i}`} className="sr-only">
                Competitor domain {i + 1}
              </Label>
              <Input
                id={`competitor-${i}`}
                type="text"
                inputMode="url"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={`competitor${i + 1}.com`}
                value={val}
                onChange={(e) => updateSlot(i, e.target.value)}
                maxLength={253}
              />
            </div>
            {inputs.length > 1 ? (
              <button
                type="button"
                onClick={() => removeSlot(i)}
                aria-label={`Remove competitor ${i + 1}`}
                className="text-muted-foreground hover:text-destructive transition-colors text-sm px-2 py-1"
              >
                ✕
              </button>
            ) : null}
          </div>
        ))}

        {inputs.length < MAX_COMPETITORS ? (
          <button
            type="button"
            onClick={addSlot}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
          >
            + Add another competitor
          </button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Maximum {MAX_COMPETITORS} competitors per query.
          </p>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" variant="outline" size="sm" onClick={onBack}>
          ← Back
        </Button>
        <Button type="button" onClick={handleContinue}>
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
