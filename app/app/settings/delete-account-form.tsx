"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import {
  DELETE_INITIAL,
  deleteAccountAction,
  type DeleteAccountResult,
} from "./actions";

// Client component for the Danger Zone delete-account flow.
//
// Two-stage UX, no shadcn Dialog component (we don't ship one yet — and
// adding it just for one confirmation would expand the bundle for little
// gain). Stage 1 is a single "Delete account" button. Clicking it expands
// an inline panel with the destructive form: explainer copy, an email
// input ("type your email to confirm"), and the irreversible Delete
// button. Cancel collapses the panel back to stage 1.
//
// Submission flow:
//   - useFormState wires the form to deleteAccountAction; the action
//     either redirects on success (the throw-on-redirect short-circuits
//     the state update) or returns { ok: false, error, fieldError? }.
//   - SubmitButton renders a "Deleting…" label while useFormStatus
//     reports pending, so users can't double-click.
//
// Accessibility:
//   - aria-expanded on the toggle reflects the panel state.
//   - aria-invalid + aria-describedby tie the error banner to the input
//     when the typed confirmation is wrong.

export function DeleteAccountForm({ accountEmail }: { accountEmail: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction] = useFormState<DeleteAccountResult, FormData>(
    deleteAccountAction,
    DELETE_INITIAL,
  );

  if (!confirming) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">
          Permanently delete your account and every domain, query, and
          report attached to it. There is no undo.
        </p>
        <div>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            aria-expanded="false"
            onClick={() => setConfirming(true)}
          >
            Delete account
          </Button>
        </div>
      </div>
    );
  }

  const inputId = "settings-delete-confirm";
  const errorId = state.error ? `${inputId}-error` : undefined;
  const fieldHasError = state.fieldError === "confirm_email";

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-foreground">
        This will erase your account, all monitored domains, every query, and
        every stored report. Active subscriptions are not automatically
        cancelled — open the customer portal first if you need to stop
        billing.
      </p>
      <div className="flex flex-col gap-2">
        <Label htmlFor={inputId} className="text-sm">
          Type{" "}
          <span className="font-medium text-foreground">{accountEmail}</span>{" "}
          to confirm
        </Label>
        <Input
          id={inputId}
          name="confirm_email"
          type="email"
          autoComplete="off"
          aria-invalid={fieldHasError || undefined}
          aria-describedby={errorId}
          required
          className={cn(
            "max-w-md",
            fieldHasError && "border-destructive focus-visible:ring-destructive",
          )}
        />
        {state.error ? (
          <p
            id={errorId}
            role="alert"
            className="text-xs text-destructive"
          >
            {state.error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <SubmitButton />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setConfirming(false)}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="destructive"
      size="sm"
      disabled={pending}
      aria-disabled={pending || undefined}
    >
      {pending ? "Deleting…" : "Delete account permanently"}
    </Button>
  );
}
