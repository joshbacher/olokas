"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

// MagicLinkForm — single email field + "Send magic link" button.
//
// Calls supabase.auth.signInWithOtp({ email, options: { emailRedirectTo } })
// where emailRedirectTo points at /auth/callback (the route group is invisible
// in the URL, so /auth/callback resolves to app/(auth)/auth/callback/route.ts).
//
// Same form is used on /login and /signup. The two pages render different
// surrounding copy via the `mode` prop, which only changes UI text — Supabase
// magic links create a session on first use whether the user already exists
// or not, so there is no protocol-level distinction between sign-in and
// sign-up. This matches the spec for 3.1.

export type MagicLinkMode = "sign-in" | "sign-up";

type FieldErrors = {
  email?: string;
  submit?: string;
};

function isValidEmail(value: string): boolean {
  const v = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}

function buildEmailRedirectTo(): string | undefined {
  // In the browser we prefer window.location.origin so previews/staging work
  // without env wiring. Fall back to NEXT_PUBLIC_SITE_URL on the server.
  if (typeof window !== "undefined") {
    return `${window.location.origin}/auth/callback`;
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL;
  return fromEnv ? `${fromEnv.replace(/\/$/, "")}/auth/callback` : undefined;
}

export function MagicLinkForm({
  mode = "sign-in",
}: {
  mode?: MagicLinkMode;
}) {
  const [email, setEmail] = React.useState("");
  const [errors, setErrors] = React.useState<FieldErrors>({});
  const [submitting, setSubmitting] = React.useState(false);
  const [sentTo, setSentTo] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErrors({});

    const trimmed = email.trim();
    if (!trimmed) {
      setErrors({ email: "Enter the email you want to use." });
      return;
    }
    if (!isValidEmail(trimmed)) {
      setErrors({ email: "That doesn't look like a valid email." });
      return;
    }

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: buildEmailRedirectTo(),
          // shouldCreateUser is true by default — Supabase creates the
          // auth.users row on first link click if it doesn't exist. The
          // handle_new_user trigger then provisions the customers row.
        },
      });
      if (error) {
        setErrors({
          submit:
            error.message ||
            "Couldn't send the magic link. Please try again in a moment.",
        });
        return;
      }
      setSentTo(trimmed);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Couldn't send the magic link. Please try again in a moment.";
      setErrors({ submit: msg });
    } finally {
      setSubmitting(false);
    }
  }

  if (sentTo) {
    return (
      <div className="mt-8" role="status" aria-live="polite">
        <h2 className="text-lg font-semibold tracking-tight">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We sent a sign-in link to{" "}
          <span className="font-medium text-foreground">{sentTo}</span>. Open
          it on this device to finish signing in.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Didn&apos;t get it? Check spam, or{" "}
          <button
            type="button"
            onClick={() => {
              setSentTo(null);
              setEmail(sentTo);
            }}
            className="underline underline-offset-2 hover:text-foreground"
          >
            try a different email
          </button>
          .
        </p>
      </div>
    );
  }

  const submitLabel =
    mode === "sign-up" ? "Create account" : "Send magic link";
  const submittingLabel =
    mode === "sign-up" ? "Creating…" : "Sending…";

  return (
    <form onSubmit={handleSubmit} className="mt-8 space-y-4" noValidate>
      <div className="space-y-2">
        <Label htmlFor="magic-link-email">Email</Label>
        <Input
          id="magic-link-email"
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@yourbusiness.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          aria-invalid={Boolean(errors.email) || undefined}
          aria-describedby={errors.email ? "magic-link-email-error" : undefined}
        />
        {errors.email ? (
          <p
            id="magic-link-email-error"
            className="text-xs text-destructive"
          >
            {errors.email}
          </p>
        ) : null}
      </div>

      {errors.submit ? (
        <p
          role="alert"
          className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {errors.submit}
        </p>
      ) : null}

      <Button
        type="submit"
        className="w-full"
        disabled={submitting}
      >
        {submitting ? submittingLabel : submitLabel}
      </Button>

      <p className="text-xs text-muted-foreground">
        We&apos;ll email a one-time link. No password needed.
      </p>
    </form>
  );
}
