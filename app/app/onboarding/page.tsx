import type { Metadata } from "next";

export const metadata: Metadata = { title: "Onboarding" };

export default function OnboardingPage() {
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Onboarding</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placeholder — full implementation lands in Phase 3 (or Phase 5 for reports).
      </p>
    </div>
  );
}
