/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import OnboardingRenderer from "@/components/onboarding/OnboardingRenderer";
import sitaraSchema from "@/config/sitara_onboarding_schema.json";
import type { Spec } from "@/components/onboarding/onboardingShared";
import { submitApplication } from "@/lib/koraClient";
import EntryScreen from "@/components/onboarding/EntryScreen";
import AccountTypeSelection from "@/components/onboarding/AccountTypeSelection";
import BusinessContext from "@/components/onboarding/BusinessContext";
import BeforeYouBegin from "@/components/onboarding/BeforeYouBegin";
import ReturningLogin from "@/components/onboarding/ReturningLogin";
import ApplicationStatus from "@/components/onboarding/ApplicationStatus";

const spec = sitaraSchema as unknown as Spec;

type PreFormStep = "entry" | "account-type" | "business-context" | "checklist" | "returning-login" | "status" | "done";

function OnboardPageInner() {
  const searchParams = useSearchParams();
  const resumeId = searchParams.get("resume");
  const viewId = searchParams.get("view");
  const mode = searchParams.get("mode");

  const [initialAnswers, setInitialAnswers] = useState<Record<string, any>>({});
  const [initialStepId, setInitialStepId] = useState<string | null>(null);
  const [isReadOnly, setIsReadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(!!(resumeId || viewId || mode === "login"));
  const [resolvedAppId, setResolvedAppId] = useState<string | null>(null);

  const [preFormStep, setPreFormStep] = useState<PreFormStep>("entry");
  const [preFormAccountType, setPreFormAccountType] = useState<"personal" | "business" | null>(null);
  const [preFormCountry, setPreFormCountry] = useState<string | null>(null);
  const [preFormRole, setPreFormRole] = useState<"signatory" | "employee" | null>(null);
  const [returningApp, setReturningApp] = useState<any | null>(null);
  const [noAppFound, setNoAppFound] = useState(false);

  useEffect(() => {
    async function loadApplication() {
      if (mode === "login") {
        setInitialAnswers({ authMode: "login" });
        setInitialStepId("login");
        setPreFormStep("done");
        setIsLoading(false);
        return;
      }
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
    setPreFormStep("done");
  };

  const handleReturningLoginSuccess = (result: { applications: any[] }) => {
    const match = result.applications[0] ?? null;
    if (match) {
      setReturningApp(match);
      setNoAppFound(false);
    } else {
      setNoAppFound(true);
      setReturningApp(null);
    }
    setPreFormStep("status");
  };

  const handleStatusContinue = async (appId: string) => {
    try {
      const res = await fetch(`/api/kora/applications/${appId}/resume`, { credentials: "include" });
      if (res.ok) {
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
      }
    } catch {
      // fetch error — do not transition
    }
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
        {showPreForm ? (
          <div className="mx-auto max-w-md pt-6">
            {preFormStep === "entry" && (
              <EntryScreen onNew={() => setPreFormStep("account-type")} onContinue={() => setPreFormStep("returning-login")} />
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
            {preFormStep === "returning-login" && (
              <ReturningLogin onSuccess={handleReturningLoginSuccess} onBack={() => setPreFormStep("entry")} />
            )}
            {preFormStep === "status" && noAppFound && (
              <div>
                <h2 className="text-lg font-semibold text-neutral-100 mb-1">No application found</h2>
                <p className="text-sm text-neutral-400 mb-6">We couldn&apos;t find an existing application for this account.</p>
                <button onClick={() => { setPreFormStep("account-type"); setNoAppFound(false); }}
                  className="w-full rounded-xl border border-[#bfa76f] bg-[#bfa76f]/10 px-4 py-2.5 text-sm font-medium text-[#bfa76f] hover:bg-[#bfa76f]/20 transition-colors">
                  Start a new application
                </button>
              </div>
            )}
            {preFormStep === "status" && returningApp && (
              <ApplicationStatus
                status={returningApp.status}
                appId={returningApp.id}
                rejectionReason={returningApp.rejection_reason}
                onContinue={handleStatusContinue}
                onStartNew={() => { setReturningApp(null); setPreFormStep("account-type"); }}
              />
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
