"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

// Client component for the Billing section's "Manage subscription" action.
//
// On click it POSTs to /api/portal and either:
//   - follows the returned { url } to the Stripe Customer Portal, or
//   - surfaces the route's { error } inline so the user understands why
//     nothing happened.
//
// We keep this small and focused. The actual Stripe portal session
// creation lives in /api/portal (Phase 3.11 implements it; until then
// the route returns 501 and the user sees "Stripe billing portal isn't
// connected yet."). Centralizing the Stripe call in the API route means
// both this page and any future entry point (a deep link from an email,
// a CLI command, an admin tool) share one code path.
//
// useTransition gives us a pending state without yanking focus or
// causing a full page transition; the button label flips to "Opening…"
// while the request is in flight and the link.assign() call ultimately
// takes the user off-site.

interface PortalResponse {
  url?: string;
  error?: string;
}

export function ManageBillingButton({
  disabled,
  disabledLabel,
}: {
  disabled: boolean;
  disabledLabel?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (disabled) {
    return (
      <div className="flex flex-col gap-2">
        <Button type="button" variant="outline" size="sm" disabled>
          Manage subscription
        </Button>
        <p className="text-xs text-muted-foreground">
          {disabledLabel ?? "No subscription yet."}
        </p>
      </div>
    );
  }

  function openPortal() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/portal", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Empty body — the route reads the session from the cookie. We
          // still POST (not GET) because this is a state-mutating call
          // from the Stripe side (creates a new portal session each
          // time).
          body: "{}",
        });
        const payload: PortalResponse = await res
          .json()
          .catch(() => ({ error: "Unexpected response from billing portal." }));
        if (res.ok && payload.url) {
          window.location.assign(payload.url);
          return;
        }
        // 501 (route stub) and 4xx/5xx flow here. We trust the route to
        // return a non-leaky `error` string; if it doesn't, fall back to
        // a generic message rather than displaying the raw status code.
        setError(
          payload.error ??
            "Stripe billing portal isn't reachable right now. Please try again shortly.",
        );
      } catch (err) {
        // Network error / CORS / offline. Don't surface the raw Error
        // text to the user.
        console.error("[settings] portal request failed", err);
        setError(
          "Couldn't reach the billing portal. Please check your connection and try again.",
        );
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div>
        <Button
          type="button"
          variant="default"
          size="sm"
          onClick={openPortal}
          disabled={isPending}
          aria-disabled={isPending || undefined}
        >
          {isPending ? "Opening…" : "Manage subscription"}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
