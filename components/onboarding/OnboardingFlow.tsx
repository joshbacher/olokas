"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Step1Domain } from "./Step1Domain";
import { Step2Queries } from "./Step2Queries";
import { Step3Competitors } from "./Step3Competitors";
import { Step4Schedule } from "./Step4Schedule";
import { skipOnboardingAction } from "@/app/app/onboarding/actions";

// OnboardingFlow — multi-step client component.
//
// Manages step state entirely via useState (no URL routing per step — the
// spec says local state). The four steps are:
//   1. Confirm or add primary domain
//   2. Select starter queries from AI suggestions
//   3. Optional: add competitor domains
//   4. Review + schedule first scan
//
// "Skip for now" on any step calls skipOnboardingAction(), which redirects
// server-side to /app/dashboard. The absence of onboarding_completed_at in
// the customers row is the implicit "not completed" signal.

type Step = 1 | 2 | 3 | 4;

export interface OnboardingFlowProps {
  existingDomains: Array<{ id: string; domain: string }>;
  queryLimit: number;
}

const STEP_LABELS: Record<Step, string> = {
  1: "Domain",
  2: "Queries",
  3: "Competitors",
  4: "Schedule",
};

export function OnboardingFlow({
  existingDomains,
  queryLimit,
}: OnboardingFlowProps) {
  const router = useRouter();
  const [step, setStep] = React.useState<Step>(1);
  const [domainId, setDomainId] = React.useState<string>("");
  const [domain, setDomain] = React.useState<string>("");
  const [selectedQueries, setSelectedQueries] = React.useState<string[]>([]);
  const [competitorDomains, setCompetitorDomains] = React.useState<string[]>([]);

  async function handleSkip() {
    // skipOnboardingAction triggers a server-side redirect to /app/dashboard.
    // Call it then navigate defensively in case the redirect doesn't fire.
    try {
      await skipOnboardingAction();
    } catch {
      router.push("/app/dashboard");
    }
  }

  function handleStep1Complete(id: string, resolvedDomain: string) {
    setDomainId(id);
    setDomain(resolvedDomain);
    setStep(2);
  }

  function handleStep2Complete(queries: string[]) {
    setSelectedQueries(queries);
    setStep(3);
  }

  function handleStep3Complete(competitors: string[]) {
    setCompetitorDomains(competitors);
    setStep(4);
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      {/* Progress indicator */}
      <nav aria-label="Onboarding progress" className="flex items-center gap-2">
        {([1, 2, 3, 4] as Step[]).map((s) => (
          <React.Fragment key={s}>
            <div
              className={`flex items-center gap-2 ${
                step === s
                  ? "text-foreground"
                  : s < step
                    ? "text-muted-foreground"
                    : "text-muted-foreground/40"
              }`}
              aria-current={step === s ? "step" : undefined}
            >
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold border ${
                  step === s
                    ? "border-accent bg-accent text-accent-foreground"
                    : s < step
                      ? "border-muted-foreground/30 bg-muted"
                      : "border-muted-foreground/20 bg-transparent"
                }`}
              >
                {s < step ? "✓" : s}
              </span>
              <span className="hidden text-sm sm:inline">{STEP_LABELS[s]}</span>
            </div>
            {s < 4 ? (
              <span
                aria-hidden="true"
                className={`flex-1 h-px max-w-[40px] ${
                  s < step ? "bg-muted-foreground/30" : "bg-muted-foreground/10"
                }`}
              />
            ) : null}
          </React.Fragment>
        ))}
      </nav>

      {/* Step content */}
      <div>
        {step === 1 ? (
          <Step1Domain
            existingDomains={existingDomains}
            onComplete={handleStep1Complete}
            onSkip={handleSkip}
          />
        ) : step === 2 ? (
          <Step2Queries
            domain={domain}
            queryLimit={queryLimit}
            onComplete={handleStep2Complete}
            onBack={() => setStep(1)}
            onSkip={handleSkip}
          />
        ) : step === 3 ? (
          <Step3Competitors
            selectedQueries={selectedQueries}
            onComplete={handleStep3Complete}
            onBack={() => setStep(2)}
            onSkip={handleSkip}
          />
        ) : (
          <Step4Schedule
            domain={domain}
            domainId={domainId}
            selectedQueries={selectedQueries}
            competitorDomains={competitorDomains}
            onBack={() => setStep(3)}
            onSkip={handleSkip}
          />
        )}
      </div>
    </div>
  );
}
