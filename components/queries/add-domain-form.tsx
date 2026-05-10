"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";

import { addDomainAction } from "@/app/app/queries/actions";
import { QUERIES_INITIAL_STATE } from "@/app/app/queries/action-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// AddDomainForm — controlled-form wrapper around the addDomainAction
// server action. The page guards rendering on customer.domain_limit, so
// when this component mounts the user has at least one slot remaining;
// the action itself re-checks the count to stay safe across stale
// renders.

function AddDomainSubmit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? "Adding…" : "Add domain"}
    </Button>
  );
}

export function AddDomainForm() {
  const [state, formAction] = useFormState(
    addDomainAction,
    QUERIES_INITIAL_STATE,
  );
  const formRef = React.useRef<HTMLFormElement>(null);

  // Reset the input after a successful add so the user can immediately
  // type another domain. useFormState's state object is replaced on each
  // submit, so a referential-equality check on `state` is enough to
  // detect "we just got a fresh result".
  React.useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
    }
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="add-domain-input">Domain</Label>
          <Input
            id="add-domain-input"
            name="domain"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder="example.com"
            required
            maxLength={253}
          />
        </div>
        <AddDomainSubmit />
      </div>
      {!state.ok && state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p role="status" className="text-sm text-muted-foreground">
          Domain added.
        </p>
      ) : null}
    </form>
  );
}
