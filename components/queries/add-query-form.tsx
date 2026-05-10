"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";

import { addQueryAction } from "@/app/app/queries/actions";
import { QUERIES_INITIAL_STATE } from "@/app/app/queries/action-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

// AddQueryForm — domain selector + query text + priority checkbox.
//
// We render a native <select> rather than a Radix Select primitive: it's
// the right element semantically, works without JS, and we don't have
// the Radix Select package installed yet. Styled to match the project's
// Input class set so it sits visually with the other form fields.

interface DomainOption {
  id: string;
  domain: string;
}

function AddQuerySubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add query"}
    </Button>
  );
}

export function AddQueryForm({ domains }: { domains: DomainOption[] }) {
  const [state, formAction] = useFormState(
    addQueryAction,
    QUERIES_INITIAL_STATE,
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  // The page already guards this empty-state case, but we also handle it
  // here so the component is robust if it gets rendered with an empty
  // list (e.g. during a quick double-render after a domain was just
  // deleted).
  if (domains.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add a domain first to start adding queries.
      </p>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-[180px_1fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="add-query-domain">Domain</Label>
          <select
            id="add-query-domain"
            name="domainId"
            required
            defaultValue={domains[0]?.id ?? ""}
            className={cn(
              "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm",
              "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
          >
            {domains.map((d) => (
              <option key={d.id} value={d.id}>
                {d.domain}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="add-query-text">Query</Label>
          <Input
            id="add-query-text"
            name="query"
            type="text"
            required
            maxLength={500}
            placeholder='e.g., "best CRM for small business"'
          />
        </div>
        <AddQuerySubmit />
      </div>
      <label className="flex w-fit items-center gap-2 text-sm text-muted-foreground">
        <input
          type="checkbox"
          name="isPriority"
          className="h-4 w-4 rounded border border-input text-accent focus:ring-2 focus:ring-ring focus:ring-offset-2"
        />
        <span>
          <span className="text-foreground font-medium">Priority</span>{" "}
          — scanned more frequently than the default cadence.
        </span>
      </label>
      {!state.ok && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-muted-foreground">
          Query added.
        </p>
      ) : null}
    </form>
  );
}
