// src/app/onboarding/page.tsx

"use client";

import React from "react";
import OnboardingRenderer from "./OnboardingRenderer";
import sitaraOnboardingSpec from "@/config/sitara_onboarding_schema.json";
import type { Spec } from "./onboardingShared";

const spec = sitaraOnboardingSpec as Spec;

export default function Page() {
  const [answers, setAnswers] = React.useState<Record<string, any>>({});

  return (
    <OnboardingRenderer
      spec={spec}
      initialAnswers={answers}
      onChange={setAnswers}
      // Final submit – we’ve already saved to Kora step-by-step,
      // so nothing extra is required here for MVP.
      onSubmit={async () => {
        // Placeholder for future:
        // e.g. notify backend, trigger email to compliance, etc.
        // No window.alert here (popup removed).
      }}
    />
  );
}
