"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureDomainAction } from "@/app/app/onboarding/actions";

// Step 1: Confirm or enter the primary domain to monitor.
//
// If the customer already has domains (passed as `existingDomains`), they
// pick from that list or add a new one. If not, they type one in. The
// action saves the domain (idempotent — re-adding is fine) and returns its
// DB id so subsequent steps can attach queries to it.

export interface Step1DomainProps {
  existingDomains: Array<{ id: string; domain: string }>;
  onComplete: (domainId: string, domain: string) => void;
  onSkip: () => void;
}

export function Step1Domain({
  existingDomains,
  onComplete,
  onSkip,
}: Step1DomainProps) {
  const [domainInput, setDomainInput] = React.useState(
    existingDomains[0]?.domain ?? "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await ensureDomainAction(domainInput);
      if (!result.ok || !result.domainId) {
        setError(result.error ?? "Something went wrong.");
      } else {
        onComplete(result.domainId, domainInput.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").split("/")[0].toLowerCase());
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Which domain should we measure?
        </h2>
        <p className="text-sm text-muted-foreground">
          This is the site we&apos;ll track across AI search engines. You can
          add more from the Queries page later.
        </p>
      </div>

      {existingDomains.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">Your domains</p>
          <ul className="space-y-2">
            {existingDomains.map((d) => (
              <li key={d.id}>
                <button
                  type="button"
                  onClick={() => {
                    setDomainInput(d.domain);
                    setError(null);
                  }}
                  className={`w-full text-left rounded-md border px-4 py-2.5 text-sm transition-colors ${
                    domainInput === d.domain
                      ? "border-ring bg-muted font-medium"
                      : "border-border bg-card hover:bg-muted/60"
                  }`}
                >
                  {d.domain}
                </button>
              </li>
            ))}
          </ul>
          <p className="pt-1 text-xs text-muted-foreground">
            Or add a different one below.
          </p>
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="onboarding-domain">Domain</Label>
          <Input
            id="onboarding-domain"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="example.com"
            value={domainInput}
            onChange={(e) => {
              setDomainInput(e.target.value);
              setError(null);
            }}
            required
            maxLength={253}
          />
          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={pending || !domainInput.trim()}>
            {pending ? "Saving…" : "Continue →"}
          </Button>
          <button
            type="button"
            onClick={onSkip}
            className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
          >
            Skip for now
          </button>
        </div>
      </form>
    </div>
  );
}
