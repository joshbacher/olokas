import type { Metadata } from "next";
import Link from "next/link";
import { BrandMark } from "@/components/brand-mark";
import { MagicLinkForm } from "@/components/auth/magic-link-form";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Create your Olokas account with a one-time magic link. No password needed.",
  alternates: { canonical: "https://olokas.com/signup" },
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <div>
      <Link href="/" aria-label="Olokas — home">
        <BrandMark />
      </Link>
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        Create your Olokas account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send a one-time sign-in link. Your
        account is created the first time you click it.
      </p>

      <MagicLinkForm mode="sign-up" />

      <p className="mt-8 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="text-foreground underline underline-offset-2 hover:text-accent"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
