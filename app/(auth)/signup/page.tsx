import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = { title: "Sign up" };

export default function SignupPage() {
  return (
    <div>
      <BrandMark />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        Create your Olokas account
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signups go through Stripe Checkout (no free signups beyond the
        single-domain audit). Implementation arrives with Phase 3.
      </p>
    </div>
  );
}
