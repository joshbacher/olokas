"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const QUERY_COUNT = 5;

type FieldErrors = {
  domain?: string;
  email?: string;
  queries?: string;
  submit?: string;
};

function normalizeDomain(value: string): string {
  return value.trim().replace(/\s+/g, "");
}

function isValidDomain(value: string): boolean {
  const v = normalizeDomain(value);
  if (!v) return false;
  // Accept forms like "example.com", "www.example.com", "https://example.com/path"
  try {
    const candidate = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    const url = new URL(candidate);
    const host = url.hostname;
    // Require at least one dot and a TLD of 2+ chars; no spaces.
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host);
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  const v = value.trim();
  // Pragmatic email check; the server will be authoritative.
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

export function AuditForm() {
  const [domain, setDomain] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [queries, setQueries] = React.useState<string[]>(() =>
    Array.from({ length: QUERY_COUNT }, () => "")
  );
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [touched, setTouched] = React.useState(false);

  const validate = React.useCallback((): FieldErrors => {
    const next: FieldErrors = {};
    if (!domain.trim()) {
      next.domain = "Enter the domain you want to audit.";
    } else if (!isValidDomain(domain)) {
      next.domain = "That doesn't look like a valid domain.";
    }
    if (!email.trim()) {
      next.email = "We need an email to send the report to.";
    } else if (!isValidEmail(email)) {
      next.email = "That doesn't look like a valid email.";
    }
    const filled = queries.filter((q) => q.trim().length > 0);
    if (filled.length < 1) {
      next.queries = "Add at least one query you want to test.";
    }
    return next;
  }, [domain, email, queries]);

  function setQueryAt(index: number, value: string) {
    setQueries((prev) => {
      const copy = prev.slice();
      copy[index] = value;
      return copy;
    });
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setTouched(true);
    const v = validate();
    setErrors(v);
    if (Object.keys(v).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        domain: normalizeDomain(domain),
        email: email.trim(),
        queries: queries.map((q) => q.trim()).filter((q) => q.length > 0),
      };
      const resp = await fetch("/api/audit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!resp.ok) {
        // Phase 2.3 will read auditId/statusUrl from the response and redirect.
        // For now, surface a friendly error if the stub returns non-2xx.
        const data: { error?: string } = await resp
          .json()
          .catch(() => ({} as { error?: string }));
        setErrors({
          submit:
            data.error ??
            "We couldn't start your audit. Please try again in a moment.",
        });
        setSubmitting(false);
        return;
      }

      // Phase 2.3 will handle the redirect to the status page.
      // The button stays in its "Starting your audit…" state until then.
    } catch {
      setErrors({
        submit:
          "We couldn't reach the server. Check your connection and try again.",
      });
      setSubmitting(false);
    }
  }

  // Re-validate as the user edits, but only after first submit attempt.
  React.useEffect(() => {
    if (!touched) return;
    setErrors(validate());
  }, [touched, validate]);

  const domainErrorId = errors.domain ? "audit-domain-error" : undefined;
  const emailErrorId = errors.email ? "audit-email-error" : undefined;
  const queriesErrorId = errors.queries ? "audit-queries-error" : undefined;

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-6"
      aria-busy={submitting}
    >
      <div className="flex flex-col gap-2">
        <Label htmlFor="audit-domain">Domain</Label>
        <Input
          id="audit-domain"
          name="domain"
          type="text"
          inputMode="url"
          autoComplete="url"
          placeholder="yourbusiness.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          disabled={submitting}
          aria-invalid={errors.domain ? true : undefined}
          aria-describedby={domainErrorId}
          required
        />
        {errors.domain && (
          <p id="audit-domain-error" className="text-xs text-destructive">
            {errors.domain}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="audit-email">Email</Label>
        <Input
          id="audit-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@yourbusiness.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={emailErrorId}
          required
        />
        {errors.email && (
          <p id="audit-email-error" className="text-xs text-destructive">
            {errors.email}
          </p>
        )}
        <p className="text-xs text-muted-foreground">
          We&apos;ll send the report here. One scan per email per week.
        </p>
      </div>

      <fieldset
        className="flex flex-col gap-3 border-t border-border pt-5"
        aria-describedby={queriesErrorId}
      >
        <legend className="mb-1 text-sm font-medium">
          Queries to test{" "}
          <span className="font-normal text-muted-foreground">
            (at least one)
          </span>
        </legend>
        <p className="text-xs text-muted-foreground">
          The questions your customers might ask AI. We&apos;ll run these
          against ChatGPT, Perplexity, Google AI Overviews, and Claude.
        </p>
        <div className="mt-1 flex flex-col gap-3">
          {queries.map((value, index) => {
            const fieldId = `audit-query-${index + 1}`;
            return (
              <div key={fieldId} className="flex flex-col gap-1.5">
                <Label
                  htmlFor={fieldId}
                  className="text-xs text-muted-foreground"
                >
                  Query {index + 1}
                  {index === 0 && (
                    <span
                      className="ml-1 text-destructive"
                      aria-hidden="true"
                    >
                      *
                    </span>
                  )}
                </Label>
                <Input
                  id={fieldId}
                  name={`query-${index + 1}`}
                  type="text"
                  placeholder={
                    index === 0
                      ? "best invoicing software for freelancers"
                      : "another question your customers ask"
                  }
                  value={value}
                  onChange={(e) => setQueryAt(index, e.target.value)}
                  disabled={submitting}
                  required={index === 0}
                />
              </div>
            );
          })}
        </div>
        {errors.queries && (
          <p
            id="audit-queries-error"
            className="text-xs text-destructive"
          >
            {errors.queries}
          </p>
        )}
      </fieldset>

      {errors.submit && (
        <p role="alert" className="text-sm text-destructive">
          {errors.submit}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Free. No card. One scan per email per week.
        </p>
        <Button
          type="submit"
          disabled={submitting}
          className="sm:w-auto"
          aria-live="polite"
        >
          {submitting ? "Starting your audit…" : "Run free audit"}
        </Button>
      </div>
    </form>
  );
}
