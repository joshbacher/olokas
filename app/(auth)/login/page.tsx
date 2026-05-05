import type { Metadata } from "next";
import { BrandMark } from "@/components/brand-mark";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <BrandMark />
      <h1 className="mt-8 text-2xl font-semibold tracking-tight">
        Sign in to Olokas
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Magic-link sign-in arrives with Phase 3 (Supabase Auth + Resend).
      </p>
    </div>
  );
}
