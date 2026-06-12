/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { Suspense, useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useSearchParams, useRouter } from "next/navigation";
import OnboardingRenderer from "@/components/onboarding/OnboardingRenderer";
import sitaraSchema from "@/config/sitara_onboarding_schema.json";
import type { Spec } from "@/components/onboarding/onboardingShared";
import { submitApplication } from "@/lib/koraClient";
import EntryScreen from "@/components/onboarding/EntryScreen";
import AccountTypeSelection from "@/components/onboarding/AccountTypeSelection";
import BusinessContext from "@/components/onboarding/BusinessContext";
import BeforeYouBegin from "@/components/onboarding/BeforeYouBegin";
const spec = sitaraSchema as unknown as Spec;

type PreFormStep = "entry" | "account-type" | "business-context" | "checklist" | "done";

function OnboardPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  const viewId = searchParams.get("view");
  const mode = searchParams.get("mode");

  const [initialAnswers, setInitialAnswers] = useState<Record<string, any>>({});
  const [initialStepId, setInitialStepId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(!!(resumeId || viewId));
  const [resolvedAppId, setResolvedAppId] = useState<string | null>(null);

  const [preFormStep, setPreFormStep] = useState<PreFormStep>("entry");
  const [preFormAccountType, setPreFormAccountType] = useState<"personal" | "business" | null>(null);
  const [preFormCountry, setPreFormCountry] = useState<string | null>(null);
  const [preFormRole, setPreFormRole] = useState<"signatory" | "employee" | null>(null);

  useEffect(() => {
    if (mode === "login") {
      router.replace("/login");
      return;
    }
    async function loadApplication() {
      if (resumeId || viewId) {
        const appId = resumeId || viewId;
        setIsLoading(true);
        try {
          const res = await fetch(`/api/kora/applications/${appId}/resume`, { credentials: "include" });
          if (!res.ok) throw new Error("Failed to load application");
          const data = await res.json();
          const isSubmitted = data.status === "submitted";
          setInitialAnswers({
            koraApplicationId: String(data.application_id),
            koraTenantId: String(data.tenant_id),
            ...(data.applicant_id ? { koraApplicantId: String(data.applicant_id) } : {}),
            ...(data.draft_answers || {}),
            accountType: data.account_type,
            _passedLogin: true,
            _applicationSubmitted: isSubmitted,
          });
          setInitialStepId(isSubmitted ? "submit" : (data.current_step_id || null));
          setIsReadOnly(!data.can_edit);
          setResolvedAppId(appId);
          setPreFormStep("done");
        } catch {
          try {
            const stored = localStorage.getItem("sitara_onboarding_answers_v1");
            if (stored) setInitialAnswers(JSON.parse(stored));
          } catch {}
        } finally {
          setIsLoading(false);
        }
      } else {
        const savedAppId = typeof window !== "undefined" ? localStorage.getItem("kora_active_app_sitara") : null;
        if (savedAppId) {
          const token = typeof window !== "undefined" ? localStorage.getItem("kora_access_token") : null;
          setIsLoading(true);
          try {
            const res = await fetch(`/api/kora/applications/${savedAppId}/resume`, {
              credentials: "include",
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            });
            if (res.ok) {
              const data = await res.json();
              setInitialAnswers({
                ...(data.draft_answers || {}),
                koraApplicationId: String(data.application_id),
                koraTenantId: String(data.tenant_id),
                ...(data.applicant_id ? { koraApplicantId: String(data.applicant_id) } : {}),
                accountType: data.account_type,
                _passedLogin: true,
                _applicationSubmitted: data.status === "submitted",
              });
              setInitialStepId(data.current_step_id || "identity");
              setIsReadOnly(!data.can_edit);
              setResolvedAppId(savedAppId);
              setPreFormStep("done");
            } else {
              localStorage.removeItem("kora_active_app_sitara");
            }
          } finally {
            setIsLoading(false);
          }
        }
      }
    }
    loadApplication();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId, viewId, mode]);

  const handleSubmit = React.useCallback(async (data: Record<string, any>) => {
    const applicationId = data.koraApplicationId;
    if (!applicationId) throw new Error("Cannot submit — missing application ID");
    await submitApplication(applicationId);
  }, []);

  const handleAccountTypeSelect = (type: "personal" | "business") => {
    setPreFormAccountType(type);
    setPreFormStep(type === "business" ? "business-context" : "checklist");
  };

  const handleBusinessContextContinue = (country: string, role: "signatory" | "employee") => {
    setPreFormCountry(country);
    setPreFormRole(role);
    setPreFormStep("checklist");
  };

  const handlePreFormStart = () => {
    const accountTypeValue = preFormAccountType === "personal" ? "individual" : "business";
    setInitialAnswers((prev) => ({
      ...prev,
      accountType: accountTypeValue,
      ...(preFormRole ? { signingRole: preFormRole } : {}),
      _passedAccountSelection: true,
    }));
    setInitialStepId("login");
    setPreFormStep("done");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">Loading application…</div>
      </div>
    );
  }

  const isResuming = !!(resumeId || viewId);
  const showPreForm = !isResuming && preFormStep !== "done";

  return (
    <div className="min-h-screen bg-black text-neutral-100">
      <Navbar variant="focus" />

      <main className="px-4 pb-12 pt-16 md:px-8">
        {showPreForm ? (
          <div className="mx-auto max-w-md pt-6">
            {preFormStep === "entry" && (
              <EntryScreen
                onNew={() => setPreFormStep("account-type")}
                onContinue={() => {
                  const token = typeof window !== "undefined" ? localStorage.getItem("kora_access_token") : null;
                  router.push(token ? "/dashboard" : "/login");
                }}
              />
            )}
            {preFormStep === "account-type" && (
              <AccountTypeSelection onSelect={handleAccountTypeSelect} />
            )}
            {preFormStep === "business-context" && (
              <BusinessContext onContinue={handleBusinessContextContinue} onBack={() => setPreFormStep("account-type")} />
            )}
            {preFormStep === "checklist" && preFormAccountType === "personal" && (
              <BeforeYouBegin accountType="personal" onStart={handlePreFormStart} onBack={() => setPreFormStep("account-type")} />
            )}
            {preFormStep === "checklist" && preFormAccountType === "business" && preFormCountry && preFormRole && (
              <BeforeYouBegin accountType="business" country={preFormCountry} role={preFormRole} onStart={handlePreFormStart} onBack={() => setPreFormStep("business-context")} />
            )}
          </div>
        ) : (
          <OnboardingRenderer
            spec={spec}
            onSubmit={handleSubmit}
            initialAnswers={initialAnswers}
            initialStepId={initialStepId}
            applicationId={resolvedAppId || resumeId || viewId || undefined}
            readOnly={isReadOnly}
          />
        )}
      </main>
    </div>
  );
}

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-neutral-400">Loading…</div>
      </div>
    }>
      <OnboardPageInner />
    </Suspense>
  );
}
