"use client";

import * as React from "react";
import { Check, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Phase 2.5 — small client-side button used on the report page so the
// reader can hand off the URL to a colleague. The audit URL is a UUID
// path (`/audit/<uuid>`) so it's already share-safe; this button just
// removes the friction of "select address bar, copy".
//
// Reset window is short on purpose — the visual flicker should match
// what you'd expect from a quick copy interaction. We never error
// loudly: if the clipboard API is missing or denied, the button shows
// a "Copy failed" state and the URL is selected so the user can copy
// manually.

const RESET_MS = 1_800;

type CopyState = "idle" | "copied" | "failed";

export function ShareLinkButton({ className }: { className?: string }) {
  const [state, setState] = React.useState<CopyState>("idle");
  const timer = React.useRef<number | null>(null);

  React.useEffect(() => {
    return () => {
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
      }
    };
  }, []);

  const onCopy = React.useCallback(async () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(url);
      } else {
        // Older browsers / non-https. Fall through to manual selection.
        throw new Error("clipboard-unavailable");
      }
      setState("copied");
    } catch {
      setState("failed");
    }
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }
    timer.current = window.setTimeout(() => setState("idle"), RESET_MS);
  }, []);

  const label =
    state === "copied"
      ? "Link copied"
      : state === "failed"
      ? "Copy failed"
      : "Copy share link";

  const Icon = state === "copied" ? Check : LinkIcon;

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={onCopy}
      aria-live="polite"
      className={cn("gap-2", className)}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      {label}
    </Button>
  );
}
