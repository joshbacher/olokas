"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FORMSPREE_ENDPOINT =
  process.env.NEXT_PUBLIC_FORMSPREE_ENDPOINT ??
  "https://formspree.io/f/mkoyrbwk";

export function EmailSignup() {
  const [submitted, setSubmitted] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [email, setEmail] = React.useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    const form = e.currentTarget;
    try {
      const resp = await fetch(form.action, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" },
      });
      if (resp.ok) {
        setSubmitted(true);
      } else {
        // Fall back to a native submit so the user isn't stuck.
        form.submit();
      }
    } catch {
      form.submit();
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div
        role="status"
        className="rounded-md bg-accent px-4 py-3 text-sm font-medium text-accent-foreground"
      >
        Thanks. We&apos;ll email you when Olokas opens for signups.
      </div>
    );
  }

  return (
    <form
      action={FORMSPREE_ENDPOINT}
      method="POST"
      onSubmit={handleSubmit}
      className="flex flex-col gap-2 sm:flex-row sm:gap-2 max-w-md"
      noValidate
    >
      <Input
        type="email"
        name="email"
        placeholder="you@yourbusiness.com"
        required
        autoComplete="email"
        aria-label="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        className="flex-1"
      />
      <Button type="submit" disabled={submitting} className="sm:w-auto">
        {submitting ? "Sending…" : "Notify me"}
      </Button>
    </form>
  );
}
