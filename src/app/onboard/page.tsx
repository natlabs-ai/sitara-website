"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OnboardingRenderer from "@/components/onboarding/OnboardingRenderer";
import sitaraSchema from "@/config/sitara_onboarding_schema.json";
import type { Spec } from "@/components/onboarding/onboardingShared";
import { submitApplication } from "@/lib/koraClient";

const spec = sitaraSchema as Spec;

export default function OnboardPage() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  const viewId = searchParams.get("view");

  const [initialAnswers, setInitialAnswers] = React.useState<Record<string, any>>({});
  const [initialStepId, setInitialStepId] = React.useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    async function loadApplication() {
      if (!resumeId && !viewId) return;
      const appId = resumeId || viewId;
      setIsLoading(true);
      try {
        const res = await fetch(`/api/kora/applications/${appId}/resume`);
        if (!res.ok) throw new Error("Failed to load application");
        const data = await res.json();
        setInitialAnswers({
          ...data.draft_answers || {},
          _applicationSubmitted: data.status === "submitted",
        });
        setInitialStepId(data.current_step_id);
        setIsReadOnly(!data.can_edit);
      } catch {
        try {
          const stored = localStorage.getItem("sitara_onboarding_answers_v1");
          if (stored) setInitialAnswers(JSON.parse(stored));
        } catch {}
      } finally {
        setIsLoading(false);
      }
    }
    loadApplication();
  }, [resumeId, viewId]);

  const handleSubmit = React.useCallback(async (data: Record<string, any>) => {
    const applicationId = data.koraApplicationId;
    if (!applicationId) throw new Error("Cannot submit — missing application ID");
    await submitApplication(applicationId);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">Loading application…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <header className="flex items-center justify-between border-b border-neutral-900 px-6 py-4">
        <Link
          href="/"
          className="flex items-center gap-2 text-xs text-neutral-300 hover:text-neutral-100"
        >
          <span className="text-sm">←</span>
          <span>Back to site</span>
        </Link>
        <div className="text-xs font-semibold tracking-[0.45em] text-neutral-200">
          S&nbsp;I&nbsp;T&nbsp;A&nbsp;R&nbsp;A
        </div>
      </header>

      <main className="px-4 pb-12 pt-6 md:px-8">
        <OnboardingRenderer
          spec={spec}
          onSubmit={handleSubmit}
          initialAnswers={initialAnswers}
          initialStepId={initialStepId}
          applicationId={resumeId || viewId || undefined}
          readOnly={isReadOnly}
        />
      </main>
    </div>
  );
}
