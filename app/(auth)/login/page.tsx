import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MagicLinkForm } from "@/components/auth/magic-link-form";

export const metadata: Metadata = {
  title: "Sign in",
  description:
    "Sign in to Olokas with a one-time magic link. No password needed.",
  alternates: { canonical: "https://olokas.com/login" },
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <div>
      <Link href="/" aria-label="Olokas — home">
        <BrandMark />
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        Sign in to Olokas
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        We&apos;ll email you a one-time link. Open it on this device to sign
        in.
      </p>

      <MagicLinkForm mode="sign-in" />

      <p className="mt-8 text-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/signup"
          className="text-foreground underline underline-offset-2 hover:text-accent"
        >
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}
