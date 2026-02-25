// src/app/onboarding/OnboardingRenderer.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  createApplication,
  createApplicantProfile,
  resolveOnboarding,
  upsertCompanyProfile, // NEW
  login, // NEW - for authentication
  type AccountType,
  type OnboardingResolveRequest,
  type OnboardingResolveResponse,
  type EvidencePackResponse,
} from "@/lib/koraClient";

import { countries } from "@/data/countries";

import {
  GOLD,
  GOLD_BG_SOFT,
  Owner,
  Spec,
  Step,
  visibleByRules,
  DEV_MODE,
} from "./onboardingShared";
import { FieldRenderer } from "./FieldRenderer";
import { AccountStep } from "./steps/AccountStep";
import { OwnershipStep } from "./steps/OwnershipStep";
import { IdentityStep } from "./steps/IdentityStep";
import { ProfileStep } from "./steps/ProfileStep";
import BusinessDocumentsStep from "./steps/BusinessDocumentsStep";
import RelationshipProfileStep from "./steps/RelationshipProfileStep";
import AuthorisedPeopleStep from "./steps/AuthorisedPeopleStep";
import ReviewSubmitStep from "./steps/ReviewSubmitStep";
import RiskDeclarationsStep from "./steps/RiskDeclarationsStep";
import PersonalReviewStep from "./steps/PersonalReviewStep";

// ✅ NEW: Questions step (business only)
import QuestionsStep from "./steps/QuestionsStep";
// UI component library
import { Button } from "@/components/ui";

/** ---------- Helpers ---------- */
function safeText(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  return String(v);
}

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function formatMaybe(v: any): string {
  const s = safeText(v);
  return s ? s : "Not provided";
}

function formatMaybeSpecified(v: any): string {
  const s = safeText(v);
  return s ? s : "Not specified";
}

function asArray(v: any): string[] {
  if (Array.isArray(v)) return v.filter(Boolean).map((x) => String(x));
  return [];
}

// Treat any non-empty docs structure as "provided"
function hasDocs(val: any): boolean {
  if (!val) return false;

  if (typeof val === "object" && !Array.isArray(val)) {
    if (Array.isArray((val as any).docs)) return (val as any).docs.length > 0;
    return Object.keys(val).length > 0;
  }

  if (Array.isArray(val)) return val.length > 0;
  if (typeof val === "string") return val.trim().length > 0;
  return false;
}

function answeredPill(value: any): { label: string; tone: "ok" | "warn" } {
  const s = safeText(value).toLowerCase();
  if (!s) return { label: "Not answered", tone: "warn" };
  if (s === "yes" || s === "no")
    return { label: s === "yes" ? "Yes" : "No", tone: "ok" };
  return { label: safeText(value), tone: "ok" };
}

function asBoolStrict(v: any): boolean | null {
  return typeof v === "boolean" ? v : null;
}

/** ---------- Main Component ---------- */
export default function OnboardingRenderer({
  spec,
  onSubmit,
  initialAnswers,
  onChange,
  onStepChange,
  applicationId,
  initialStepId,
  readOnly = false,
}: {
  spec: Spec;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  initialAnswers?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onStepChange?: (index: number, step: Step) => void;
  applicationId?: string;
  initialStepId?: string | null;
  readOnly?: boolean;
}) {
  const router = useRouter();

  const STORAGE_KEY = "sitara_onboarding_answers_v1";

  // Determine if we're resuming an application (vs creating new)
  const isResuming = !!initialStepId || !!applicationId;

  // Initialize step index based on initialStepId if provided
  const [stepIdx, setStepIdx] = React.useState(() => {
    if (!initialStepId) return 0;
    const index = spec.steps.findIndex(s => s.id === initialStepId);
    return index >= 0 ? index : 0;
  });
  const [answers, setAnswers] = React.useState<Record<string, any>>(
    initialAnswers || {},
  );
  const [isSubmittingStep, setIsSubmittingStep] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = React.useState(
    initialAnswers?._applicationSubmitted || false
  );

  // Save & Return state (silent by default, only shows errors)
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Validation reveal state: controls when required field indicators are shown
  // Set to true when user clicks Next and validation fails; reset on step change
  const [showValidationErrors, setShowValidationErrors] = React.useState(false);

  // Use applicationId from prop or from answers state
  const effectiveApplicationId = applicationId || (answers.koraApplicationId as string | undefined);

  // Hydrate answers from localStorage (client-only) if initialAnswers not provided
  React.useEffect(() => {
    if (typeof window === "undefined") return;

    if (initialAnswers && Object.keys(initialAnswers).length > 0) return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        setAnswers(parsed);
      }
    } catch (e) {
      console.warn("Failed to read onboarding draft from localStorage", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist answers to localStorage
  React.useEffect(() => {
    if (typeof window === "undefined" || readOnly) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers ?? {}));
    } catch (e) {
      console.warn("Failed to persist onboarding draft to localStorage", e);
    }
  }, [answers, readOnly]);

  // Reset validation errors when step changes
  React.useEffect(() => {
    setShowValidationErrors(false);
  }, [stepIdx]);

  // Save draft to backend (silent on success, shows error on failure)
  const saveDraft = React.useCallback(async (currentAnswers: Record<string, any>, currentStep: Step) => {
    if (!effectiveApplicationId || readOnly) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/kora/applications/${effectiveApplicationId}/draft`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_step_id: currentStep.id,
          draft_answers: currentAnswers,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        console.error('Failed to save draft:', error);
        setSaveError("We couldn't save your progress. Please check your connection.");
        return;
      }

      // Success: clear any previous error (silent - no UI feedback)
      setSaveError(null);

      // Also update localStorage as backup
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(currentAnswers));
        localStorage.setItem(`${STORAGE_KEY}_step`, currentStep.id);
      }
    } catch (e) {
      console.error('Save error:', e);
      setSaveError("We couldn't save your progress. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }, [effectiveApplicationId, readOnly, STORAGE_KEY]);

  const saveAndExit = React.useCallback(async () => {
    if (!effectiveApplicationId || readOnly) return;

    const currentStep = spec.steps[stepIdx];
    if (!currentStep) return;

    try {
      setIsSaving(true);
      const res = await fetch(`/api/kora/applications/${effectiveApplicationId}/draft`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_step_id: currentStep.id,
          draft_answers: answers,
        }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({}));
        console.error('Failed to save draft:', error);
        setSaveError("We couldn't save your progress. Please check your connection.");
        return;
      }

      // Success: clear error and navigate away silently
      setSaveError(null);

      // Also update localStorage as backup
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(answers));
        localStorage.setItem(`${STORAGE_KEY}_step`, currentStep.id);
      }

      // Redirect to dashboard
      router.push('/dashboard');
    } catch (e) {
      console.error('Save and exit error:', e);
      setSaveError("We couldn't save your progress. Please check your connection.");
    } finally {
      setIsSaving(false);
    }
  }, [effectiveApplicationId, readOnly, stepIdx, spec.steps, answers, router, STORAGE_KEY]);

  const visibleSteps = React.useMemo(() => {
    const isBusiness = answers.accountType === "business";
    const isBasicBusinessPath =
      isBusiness &&
      (answers.businessFlow === "basic" ||
        answers.onboardingResolution?.low_risk_service_provider === true);

    return spec.steps.filter((s) => {
      // When resuming an application, skip account selection and login steps
      // (these are only for creating new applications)
      if (effectiveApplicationId && (s.id === "accountSelection" || s.id === "login")) {
        return false;
      }

      // Hide Questions step on Basic business path
      if (isBasicBusinessPath && s.id === "questionnaire") return false;

      // Force Documents step to always show for business accounts
      if (isBusiness && s.id === "companyDetails") return true;

      return visibleByRules(s.showIf, answers);
    });
  }, [spec.steps, answers, effectiveApplicationId]);

  const step = spec.steps[stepIdx];
  const isCurrentVisible = visibleSteps.some((s) => s.id === step.id);

  React.useEffect(() => {
    if (!isCurrentVisible) {
      const forward = visibleSteps.find(
        (s) => spec.steps.findIndex((x) => x.id === s.id) >= stepIdx,
      );
      if (forward) {
        setStepIdx(spec.steps.findIndex((x) => x.id === forward.id));
      } else if (visibleSteps.length > 0) {
        setStepIdx(
          spec.steps.findIndex(
            (x) => x.id === visibleSteps[visibleSteps.length - 1].id,
          ),
        );
      } else {
        setStepIdx(0);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [answers, isCurrentVisible, visibleSteps.length]);

  const visibleIdx = Math.max(
    0,
    visibleSteps.findIndex((s) => s.id === step.id),
  );
  const _visibleTotal = visibleSteps.length; void _visibleTotal;

  React.useEffect(() => {
    onChange?.(answers);
  }, [answers, onChange]);

  React.useEffect(() => {
    onStepChange?.(visibleIdx, step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visibleIdx, step.id]);

  function setValue(id: string, val: any) {
    setAnswers((prev) => ({ ...prev, [id]: val }));
  }

  async function goToVisibleIndex(nextVisibleIdx: number) {
    const target = visibleSteps[nextVisibleIdx];
    if (!target) return;

    // Save before navigating (user preference: save on step navigation)
    if (effectiveApplicationId && !readOnly) {
      await saveDraft(answers, step);
    }

    const absolute = spec.steps.findIndex((s) => s.id === target.id);
    if (absolute >= 0) setStepIdx(absolute);
  }

  function next() {
    if (visibleIdx < visibleSteps.length - 1) goToVisibleIndex(visibleIdx + 1);
  }

  function prev() {
    if (visibleIdx > 0) goToVisibleIndex(visibleIdx - 1);
  }

  /** Final submit handler (Submit button on the last step) */
  async function handleSubmit() {
    // If already submitted, don't submit again
    if (hasSubmitted || answers._applicationSubmitted) {
      return;
    }

    setGlobalError(null);
    try {
      setIsSubmittingStep(true);
      await Promise.resolve(onSubmit(answers));

      // Update both local state and answers to persist the submitted flag
      setHasSubmitted(true);
      setAnswers((prev) => ({ ...prev, _applicationSubmitted: true }));
    } catch (e: any) {
      console.error("onSubmit handler failed", e);
      setGlobalError(
        e?.message || "We couldn't submit your application. Please try again.",
      );
    } finally {
      setIsSubmittingStep(false);
    }
  }

  const canGoNext = (() => {
    if (step.id === "accountSelection") {
      const isBusiness = answers.accountType === "business";
      const isEmployee = answers.signingRole === "employee";

      if (!answers.accountType) return false;

      if (isBusiness && isEmployee) {
        const hasFirst =
          typeof answers.signatoryFirstName === "string" &&
          answers.signatoryFirstName.trim().length > 0;
        const hasLast =
          typeof answers.signatoryLastName === "string" &&
          answers.signatoryLastName.trim().length > 0;
        const hasEmail =
          typeof answers.signatoryEmail === "string" &&
          answers.signatoryEmail.trim().length > 0;

        return hasFirst && hasLast && hasEmail && !isSubmittingStep;
      }

      return !isSubmittingStep;
    }

    if (step.id === "login") {
      const mode = answers.authMode || 'signup';

      if (mode === 'login') {
        // Login: only email and password required
        return (
          !!answers.email &&
          !!answers.password &&
          !isSubmittingStep
        );
      } else {
        // Signup: all fields required (existing logic)
        return (
          !!answers.email &&
          !!answers.phone &&
          !!answers.password &&
          !!answers.confirmPassword &&
          answers.passwordMatch !== false &&
          !isSubmittingStep
        );
      }
    }

    if (step.id === "identity") {
      const isUAE = answers.countryOfResidence === "United Arab Emirates";

      // Source of truth for "Passport/ID received" is the saved Document ID.
      const hasPassportDoc =
        !!answers.passportDocId ||
        !!answers.identityDocId ||
        !!answers.idDocumentDocId;

      const hasEidFiles =
        !isUAE ||
        (Array.isArray(answers.emiratesIdFront__files) &&
          answers.emiratesIdFront__files.length > 0 &&
          Array.isArray(answers.emiratesIdBack__files) &&
          answers.emiratesIdBack__files.length > 0);

      const isBusiness = answers.accountType === "business";
      const showPoA = !isBusiness;
      const hasPoA = showPoA ? !!answers.proofOfAddressDocId : true;

      return (
        // Do not block on extraction status; block on evidence (doc id)
        !!answers.countryOfResidence &&
        hasPassportDoc &&
        hasEidFiles &&
        hasPoA &&
        !isSubmittingStep
      );
    }

    if (step.id === "profile") {
      const hasOccupation =
        typeof answers.occupation === "string" &&
        answers.occupation.trim().length > 0;
      const hasSource =
        typeof answers.sourceOfIncome === "string" &&
        answers.sourceOfIncome.trim().length > 0;
      const services = Array.isArray(answers.selectedServices)
        ? (answers.selectedServices as unknown[])
        : [];
      const hasServices = services.length > 0;

      return hasOccupation && hasSource && hasServices && !isSubmittingStep;
    }

    // Risk declarations step (individual accounts only)
    if (step.id === "riskDeclarations") {
      const hasPepAnswer = typeof answers.ind_pepSelf === "boolean";
      const hasSanctionsAnswer = typeof answers.ind_sanctionsSelf === "boolean";
      const hasThirdPartyAnswer = typeof answers.ind_thirdPartyUse === "boolean";

      return hasPepAnswer && hasSanctionsAnswer && hasThirdPartyAnswer && !isSubmittingStep;
    }

    // Step 4 (Business model): Country + deterministic questions (required)
    if (step.id === "corporateSetup") {
      const hasCountry =
        typeof answers.incCountry === "string" &&
        answers.incCountry.trim().length > 0;

      const q1 = asBoolStrict(answers.takes_ownership_of_metals);
      const q2 = asBoolStrict(answers.holds_client_assets_or_funds);
      const q3 = asBoolStrict(answers.acts_as_intermediary);

      if (!hasCountry) return false;
      if (q1 === null || q2 === null || q3 === null) return false;

      if (q2 === true) {
        const sf = asBoolStrict(answers.settlement_facilitation);
        if (sf === null) return false;
      }

      return !isSubmittingStep;
    }

    // Business documents
    if (step.id === "companyDetails") {
      // DEV: allow skipping required uploads during testing
      if (DEV_MODE) return !isSubmittingStep;

      const hasLegal = hasDocs(answers.legal_existence_files);
      const hasRegisteredAddress = hasDocs(answers.registered_address_files);
      const hasTax = hasDocs(answers.tax_registration_files);

      return hasLegal && hasRegisteredAddress && hasTax && !isSubmittingStep;
    }

    // Relationship (business-only)
    if (step.id === "relationship") {
      const direction =
        typeof answers.transaction_direction === "string" &&
        answers.transaction_direction.trim().length > 0;

      const products = Array.isArray(answers.relationship_products)
        ? (answers.relationship_products as string[])
        : [];
      const hasProducts = products.length > 0;

      const frequency =
        typeof answers.relationship_frequency === "string" &&
        answers.relationship_frequency.trim().length > 0;

      const valueBand =
        typeof answers.relationship_value_band_usd === "string" &&
        answers.relationship_value_band_usd.trim().length > 0;

      const paymentMethods = Array.isArray(answers.relationship_payment_methods)
        ? (answers.relationship_payment_methods as string[])
        : [];
      const hasPaymentMethods = paymentMethods.length > 0;

      const cashSelected = paymentMethods.includes("cash");
      const cashAckOk = !cashSelected || answers.relationship_cash_ack === true;

      return (
        direction &&
        hasProducts &&
        frequency &&
        valueBand &&
        hasPaymentMethods &&
        cashAckOk &&
        !isSubmittingStep
      );
    }

    // ✅ UPDATED: Questionnaire step (business-only) must be completed to proceed
    if (step.id === "questionnaire") {
      const q = (answers.questionnaire as Record<string, any> | null) ?? null;

      const has = (v: any) => {
        if (v === null || v === undefined) return false;
        if (typeof v === "string") return v.trim().length > 0;
        if (typeof v === "boolean") return true;
        if (Array.isArray(v)) return v.length > 0;
        return true;
      };

      const requiredKeys = [
        "pep_exposure",
        "sanctions_screening",
        "ubo_disclosed_verified",
        "aml_policy",
        "expected_txn_volume_usd_band",
        "countries_of_operation_iso2",
        "kyc_sops",
        "consent_screening",
        "ack_ongoing_review",
      ] as const;

      if (!q) return false;

      const ackOk = q.consent_screening === true && q.ack_ongoing_review === true;

      const requiredOk = requiredKeys
        .filter((k) => k !== "consent_screening" && k !== "ack_ongoing_review")
        .every((k) => has(q[k])) && ackOk;

      return requiredOk && !isSubmittingStep;
    }

    return !isSubmittingStep;
  })();

  // --- Evidence-pack based submit gating (business only, unless DEV_MODE) ---
  const isBusiness = answers.accountType === "business";
  const evidencePack =
    (answers.evidencePack as EvidencePackResponse | null) ?? null;
  const missingDocTypes = evidencePack?.derived?.missing_document_types ?? [];

  const businessEvidenceOk =
    !isBusiness ||
    DEV_MODE ||
    (evidencePack !== null && missingDocTypes.length === 0);

  // Individual accounts must accept all three checkboxes
  const allDeclarationsAccepted = isBusiness
    ? answers.submitDeclarationAccepted === true
    : answers.submitDeclarationAccepted === true &&
      answers.privacyPolicyAccepted === true &&
      answers.termsAccepted === true;

  const canSubmit =
    step.id === "submit" &&
    allDeclarationsAccepted &&
    businessEvidenceOk &&
    !isSubmittingStep &&
    !hasSubmitted;

  const _ownersForTree: Owner[] = React.useMemo(() => {
    const raw = answers.owners;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (o: Owner) => o && o.name && String(o.name).trim().length > 0,
    );
  }, [answers.owners]);

  /** ---------- Next click handlers ---------- */
  async function handleNextClick() {
    setGlobalError(null);

    // 1) LOGIN / SIGNUP
    if (step.id === "login") {
      const mode = answers.authMode || 'signup';

      try {
        setIsSubmittingStep(true);
        setGlobalError(null);

        if (mode === 'login') {
          // LOGIN FLOW
          await login({
            email: answers.email,
            password: answers.password,
          });

          // Redirect to dashboard (auth handled via HttpOnly cookie set by /api/auth/login)
          if (typeof window !== 'undefined') {
            window.location.href = '/dashboard';
          }
          return; // Don't call next()

        } else {
          // SIGNUP FLOW (existing logic)
          const accountType: AccountType =
            answers.accountType === "business" ? "business" : "individual";

          const payload = {
            tenant_code: "sitara-core",
            account_type: accountType,
            email: String(answers.email || ""),
            phone_country_code: answers.phoneDial
              ? `+${answers.phoneDial}`
              : undefined,
            phone_number: answers.phoneNational || undefined,
            phone_e164: answers.phone || undefined,
            password: answers.password || undefined,
          };

          const res = await createApplication(payload);

          setValue("koraApplicationId", res.application_id);
          setValue("koraApplicantId", res.applicant_id);
          setValue("koraTenantId", res.tenant_id);
          setValue("koraApplicationExternalRef", res.external_reference);

          // NEW: Create company profile row at business onboarding start
          if (accountType === "business") {
            try {
              await upsertCompanyProfile({
                tenant_id: res.tenant_id,
                application_id: res.application_id,
                applicant_id: res.applicant_id,
              });
            } catch (e) {
              // Do not block onboarding if this fails (can be re-created later)
              console.warn("Failed to create company profile at login step", e);
            }
          }

          next(); // Continue to next step
        }
      } catch (e: any) {
        // Use console.log instead of console.error to avoid Next.js dev overlay
        console.log("Login/Signup error:", e);

        // Handle duplicate email error
        if (e?.message?.includes('Email already registered')) {
          console.log("Setting duplicate email error");
          setGlobalError(
            "This email is already registered. Please use the 'Log In' option above."
          );
        } else if (mode === 'login') {
          setGlobalError(
            "Invalid email or password. Please try again."
          );
        } else {
          setGlobalError(
            e?.message || "Unable to create your account. Please try again."
          );
        }
      } finally {
        setIsSubmittingStep(false);
      }
      return;
    }

    // 2) IDENTITY (UAE EID upload on next)
    if (step.id === "identity") {
      const isUAE = answers.countryOfResidence === "United Arab Emirates";

      if (!isUAE) {
        next();
        return;
      }

      // Check if Emirates ID already uploaded (e.g., when resuming)
      const alreadyUploaded =
        !!answers.emiratesIdFrontDocId &&
        !!answers.emiratesIdBackDocId;

      if (alreadyUploaded) {
        // Documents already uploaded, skip to next step
        next();
        return;
      }

      const frontFiles = answers.emiratesIdFront__files as File[] | undefined;
      const backFiles = answers.emiratesIdBack__files as File[] | undefined;

      // Check if files are actual File objects (not serialized strings from resume)
      const hasFrontFile = frontFiles?.length && frontFiles[0] instanceof File;
      const hasBackFile = backFiles?.length && backFiles[0] instanceof File;

      if (
        !hasFrontFile ||
        !hasBackFile ||
        !answers.koraTenantId ||
        !answers.koraApplicationId
      ) {
        setGlobalError(
          "Please make sure Emirates ID front and back are selected and your application has been created.",
        );
        return;
      }

      try {
        setIsSubmittingStep(true);

        const formData = new FormData();
        formData.append("front", frontFiles[0]);
        formData.append("back", backFiles[0]);
        formData.append("tenant_id", String(answers.koraTenantId));
        formData.append("application_id", String(answers.koraApplicationId));
        if (answers.koraApplicantId)
          formData.append("applicant_id", String(answers.koraApplicantId));

        const res = await fetch("/api/kora/documents/emirates-id", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          let detail = "Failed to upload Emirates ID. Please try again.";

          if (errJson?.detail) {
            // Handle cases where detail is an object or array
            if (typeof errJson.detail === 'string') {
              detail = errJson.detail;
            } else if (Array.isArray(errJson.detail)) {
              detail = errJson.detail.map((e: unknown) => typeof e === 'string' ? e : JSON.stringify(e)).join(', ');
            } else if (typeof errJson.detail === 'object') {
              detail = JSON.stringify(errJson.detail);
            }
          }

          throw new Error(detail);
        }

        const data = await res.json();

        setValue("emiratesIdFrontDocId", data.front_doc_id);
        setValue("emiratesIdBackDocId", data.back_doc_id);
        setValue("emiratesIdUploaded", true);

        next();
      } catch (e: any) {
        console.error("Failed to upload Emirates ID", e);
        setGlobalError(
          e?.message ||
            "We couldn’t upload your Emirates ID. Please check the files and try again.",
        );
      } finally {
        setIsSubmittingStep(false);
      }

      return;
    }

    // 3) PROFILE → POST applicant profile
    if (step.id === "profile") {
      if (
        !answers.koraTenantId ||
        !answers.koraApplicationId ||
        !answers.koraApplicantId
      ) {
        setGlobalError(
          "We couldn't find your application reference. Please go back to the Login step and try again.",
        );
        return;
      }

      const services = Array.isArray(answers.selectedServices)
        ? (answers.selectedServices as string[])
        : [];

      try {
        setIsSubmittingStep(true);

        const payload = {
          tenant_id: String(answers.koraTenantId),
          application_id: String(answers.koraApplicationId),
          applicant_id: String(answers.koraApplicantId),
          full_name: String(answers.fullName || ""),
          nationality: String(answers.nationality || ""),
          occupation: String(answers.occupation || ""),
          source_of_income: String(answers.sourceOfIncome || ""),
          expected_frequency:
            (answers.expectedFrequency as string | undefined) || undefined,
          expected_value:
            (answers.expectedValue as string | undefined) || undefined,
          selected_services: services,
        };

        const res = await createApplicantProfile(payload);
        setValue("koraApplicantProfileId", res.id);

        next();
      } catch (e: any) {
        console.error("Failed to save applicant profile", e);
        setGlobalError(
          e?.message ||
            "We couldn't save your profile details. Please check the fields and try again.",
        );
      } finally {
        setIsSubmittingStep(false);
      }

      return;
    }

    // 4) RISK DECLARATIONS → PATCH applicant profile with risk fields
    if (step.id === "riskDeclarations") {
      if (!answers.koraApplicantProfileId) {
        setGlobalError(
          "We couldn't find your profile. Please go back and complete the Profile step.",
        );
        return;
      }

      try {
        setIsSubmittingStep(true);

        // Use the PATCH endpoint to update the existing profile with risk declarations
        const response = await fetch(
          `/api/kora/profiles/${answers.koraApplicantProfileId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              is_pep_self: typeof answers.ind_pepSelf === 'boolean' ? answers.ind_pepSelf : undefined,
              pep_self_details: answers.ind_pepSelf === true ? (answers.ind_pepSelfDetails as string | undefined) || undefined : undefined,
              is_sanctions_self: typeof answers.ind_sanctionsSelf === 'boolean' ? answers.ind_sanctionsSelf : undefined,
              sanctions_self_details: answers.ind_sanctionsSelf === true ? (answers.ind_sanctionsSelfDetails as string | undefined) || undefined : undefined,
              is_third_party_use: typeof answers.ind_thirdPartyUse === 'boolean' ? answers.ind_thirdPartyUse : undefined,
              third_party_use_details: answers.ind_thirdPartyUse === true ? (answers.ind_thirdPartyUseDetails as string | undefined) || undefined : undefined,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => null);
          throw new Error(errorData?.detail || "Failed to save risk declarations");
        }

        next();
      } catch (e: any) {
        console.error("Failed to save risk declarations", e);
        setGlobalError(
          e?.message ||
            "We couldn't save your risk declarations. Please try again.",
        );
      } finally {
        setIsSubmittingStep(false);
      }

      return;
    }

    // 5) Step 4 (Business model) → call resolver + persist onboardingResolution
    if (step.id === "corporateSetup") {
      const applicationId = answers.koraApplicationId as string | undefined;
      if (!applicationId) {
        setGlobalError(
          "We couldn't find your application reference. Please go back to Login and try again.",
        );
        return;
      }

      const q1 = asBoolStrict(answers.takes_ownership_of_metals);
      const q2 = asBoolStrict(answers.holds_client_assets_or_funds);
      const q3 = asBoolStrict(answers.acts_as_intermediary);

      if (q1 === null || q2 === null || q3 === null) {
        setGlobalError("Please answer all questions to continue.");
        return;
      }

      const settlement =
        q2 === true ? asBoolStrict(answers.settlement_facilitation) : null;

      if (q2 === true && settlement === null) {
        setGlobalError("Please answer the settlement question to continue.");
        return;
      }

      const payload: OnboardingResolveRequest = {
        takes_ownership_of_metals: q1,
        holds_client_assets_or_funds: q2,
        acts_as_intermediary: q3,
        settlement_facilitation: q2 ? settlement : null,
      };

      try {
        setIsSubmittingStep(true);

        const resolution: OnboardingResolveResponse = await resolveOnboarding(
          applicationId,
          payload,
        );

        setAnswers((prev) => ({
          ...prev,
          onboardingResolution: resolution,
          businessFlow: resolution.low_risk_service_provider ? "basic" : "advanced",
        }));

        next();
      } catch (e: any) {
        console.error("Failed to resolve onboarding", e);
        setGlobalError(
          e?.message ||
            "We couldn’t determine the required onboarding sections. Please try again.",
        );
      } finally {
        setIsSubmittingStep(false);
      }

      return;
    }

    next();
  }

  /** ---------- Deterministic questions UI ---------- */
  const DeterministicQuestions = () => {
    const q1 = asBoolStrict(answers.takes_ownership_of_metals);
    const q2 = asBoolStrict(answers.holds_client_assets_or_funds);
    const q3 = asBoolStrict(answers.acts_as_intermediary);
    const sf = asBoolStrict(answers.settlement_facilitation);

    const btn = (active: boolean) =>
      `rounded-xl border px-4 py-2 text-sm transition ${
        active
          ? "border-[--gold-color] bg-[--gold-bg-soft] text-[--gold-color]"
          : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55"
      }`;

    return (
      <div className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
        <h2 className="text-sm font-semibold text-neutral-100">
          Service model questions
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          These determine which onboarding sections and evidence requests apply
          to your business.
        </p>

        <div className="mt-5 space-y-4">
          {/* Q1 */}
          <div className="rounded-2xl border border-neutral-800 bg-black/20 p-4">
            <div className="text-sm font-medium text-neutral-100">
              Does the business ever take ownership of precious metals?
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className={btn(q1 === true)}
                onClick={() => setValue("takes_ownership_of_metals", true)}
                disabled={isSubmittingStep}
              >
                Yes
              </button>
              <button
                type="button"
                className={btn(q1 === false)}
                onClick={() => setValue("takes_ownership_of_metals", false)}
                disabled={isSubmittingStep}
              >
                No
              </button>
            </div>
          </div>

          {/* Q2 */}
          <div className="rounded-2xl border border-neutral-800 bg-black/20 p-4">
            <div className="text-sm font-medium text-neutral-100">
              Does the business ever hold client assets or client funds (even
              temporarily)?
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className={btn(q2 === true)}
                onClick={() => setValue("holds_client_assets_or_funds", true)}
                disabled={isSubmittingStep}
              >
                Yes
              </button>
              <button
                type="button"
                className={btn(q2 === false)}
                onClick={() => {
                  setValue("holds_client_assets_or_funds", false);
                  setValue("settlement_facilitation", null);
                }}
                disabled={isSubmittingStep}
              >
                No
              </button>
            </div>

            {q2 === true ? (
              <div className="mt-4 rounded-xl border border-neutral-800 bg-black/25 p-4">
                <div className="text-sm font-medium text-neutral-100">
                  If yes, do you facilitate settlement (e.g., escrow-style
                  coordination)?
                </div>
                <div className="mt-3 flex gap-3">
                  <button
                    type="button"
                    className={btn(sf === true)}
                    onClick={() => setValue("settlement_facilitation", true)}
                    disabled={isSubmittingStep}
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    className={btn(sf === false)}
                    onClick={() => setValue("settlement_facilitation", false)}
                    disabled={isSubmittingStep}
                  >
                    No
                  </button>
                </div>
              </div>
            ) : null}
          </div>

          {/* Q3 */}
          <div className="rounded-2xl border border-neutral-800 bg-black/20 p-4">
            <div className="text-sm font-medium text-neutral-100">
              Does the business ever arrange or execute precious-metal
              transactions for clients (for example, acting as a broker/agent,
              or trading on a client’s behalf)?
            </div>
            <div className="mt-3 flex gap-3">
              <button
                type="button"
                className={btn(q3 === true)}
                onClick={() => setValue("acts_as_intermediary", true)}
                disabled={isSubmittingStep}
              >
                Yes
              </button>
              <button
                type="button"
                className={btn(q3 === false)}
                onClick={() => setValue("acts_as_intermediary", false)}
                disabled={isSubmittingStep}
              >
                No
              </button>
            </div>
          </div>

        </div>

        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>
    );
  };

  /** ---------- Step content renderer ---------- */
  const renderStepContent = () => {
    if (step.id === "accountSelection") {
      const accountTypeField = step.fields.find((f) => f.id === "accountType");
      const signingRoleField = step.fields.find((f) => f.id === "signingRole");

      const showEmployeeBlock =
        answers.accountType === "business" && answers.signingRole === "employee";

      return (
        <div className="space-y-5">
          {accountTypeField && (
            <FieldRenderer
              f={accountTypeField}
              answers={answers}
              setValue={setValue}
            />
          )}

          {signingRoleField &&
            visibleByRules(signingRoleField.showIf, answers) && (
              <FieldRenderer
                f={signingRoleField}
                answers={answers}
                setValue={setValue}
              />
            )}

          {showEmployeeBlock && (
            <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
              <h2 className="text-sm font-semibold text-neutral-100">
                Authorised signatory
              </h2>
              <p className="mt-1 text-xs text-neutral-400">
                Please provide details of the authorised signatory named on the
                business licence (CEO, GM, or director).
              </p>

              <div className="mt-4 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    First name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={answers.signatoryFirstName || ""}
                    onChange={(e) =>
                      setValue("signatoryFirstName", e.target.value)
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Family name <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={answers.signatoryLastName || ""}
                    onChange={(e) =>
                      setValue("signatoryLastName", e.target.value)
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="mb-1 block text-xs font-medium text-neutral-300">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  value={answers.signatoryEmail || ""}
                  onChange={(e) => setValue("signatoryEmail", e.target.value)}
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                />
              </div>
            </section>
          )}
        </div>
      );
    }

    // Step 4: Business model (orientation + country + deterministic questions)
    if (step.id === "corporateSetup") {
      const incCountryField = step.fields.find((f) => f.id === "incCountry");

      // Inject country options from src/data/countries.ts
      const incCountryEnhanced: any = incCountryField
        ? {
            ...incCountryField,
            type: "select",
            options: countries.map((c) => ({
              value: c.name, // store name (lowest risk). If you prefer ISO, use c.code.
              label: c.name,
            })),
          }
        : null;

      return (
        <div className="space-y-5">
          {/* Optional orientation (UX only; no logic) */}
          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <h2 className="text-sm font-semibold text-neutral-100">Business</h2>
            <p className="mt-1 text-xs text-neutral-400">
              We&apos;ll ask a few questions to understand how your business interacts
              with precious metals.
            </p>

            <div className="mt-4 rounded-xl border border-neutral-800 bg-black/25 p-4">
              <div className="text-sm font-medium text-neutral-100">
                Which best describes your business relationship with precious
                metals?
              </div>
              <div className="mt-3 space-y-2">
                {[
                  {
                    value: "activity",
                    label:
                      "We trade, source, refine, manufacture, or sell precious metals",
                  },
                  {
                    value: "services",
                    label:
                      "We provide services or infrastructure to the precious-metals industry",
                  },
                ].map((opt) => (
                  <label
                    key={opt.value}
                    className="flex cursor-pointer items-start gap-2 text-xs text-neutral-200"
                  >
                    <input
                      type="radio"
                      name="biz_orientation"
                      value={opt.value}
                      checked={answers.biz_orientation === opt.value}
                      onChange={() => setValue("biz_orientation", opt.value)}
                      className="mt-[2px] h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-[--gold-color] focus:ring-[--gold-color]"
                    />
                    <span>{opt.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </section>

          {/* Country of Incorporation (required) */}
          {incCountryEnhanced ? (
            <FieldRenderer
              f={incCountryEnhanced}
              answers={answers}
              setValue={setValue}
            />
          ) : (
            <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-sm text-neutral-300">
              Missing required field: incCountry
            </div>
          )}

          {/* Deterministic questions (required) */}
          <DeterministicQuestions />
        </div>
      );
    }

    if (step.id === "submit") {
      const isBusinessLocal = answers.accountType === "business";

      // Use PersonalReviewStep for individual accounts
      if (!isBusinessLocal && !hasSubmitted) {
        return <PersonalReviewStep answers={answers} setValue={setValue} />;
      }
      const isUAE = answers.countryOfResidence === "United Arab Emirates";
      const showPoA = !isBusinessLocal;

      const isBusinessAccount = answers.accountType === "business";

      const pepValue = isBusinessAccount ? answers.pepExposure : answers.ind_pepSelf;
      const sanctionsValue = isBusinessAccount
        ? answers.sanctionsScreening
        : answers.ind_sanctionsSelf;

      const actingValue = isBusinessAccount
        ? (answers.actingOnBehalfOfThirdParty ??
            answers.actingOnBehalfThirdParty ??
            answers.thirdParty ??
            answers.thirdPartyActing)
        : answers.ind_thirdPartyUse;

      const pep = answeredPill(pepValue);
      const sanctions = answeredPill(sanctionsValue);
      const thirdParty = answeredPill(actingValue);

      const screeningConsent =
        Array.isArray(answers.biz_screeningConsent) &&
        answers.biz_screeningConsent.includes("consent");

      const monitoringAck =
        Array.isArray(answers.biz_ongoingMonitoringAck) &&
        answers.biz_ongoingMonitoringAck.includes("ack");

      // Source of truth: use saved doc id for "received".
      const passportOrIdReceived =
        !!answers.passportDocId || !!answers.identityDocId || !!answers.idDocumentDocId;

      const _emiratesIdRequired = isUAE; void _emiratesIdRequired;
      const emiratesIdReceived =
        !!answers.emiratesIdFrontDocId ||
        !!answers.emiratesIdBackDocId ||
        answers.emiratesIdUploaded === true ||
        (Array.isArray(answers.emiratesIdFront__files) &&
          answers.emiratesIdFront__files.length > 0);

      const poaReceived = !!answers.proofOfAddressDocId;

      const services = asArray(answers.selectedServices);

      if (hasSubmitted) {
        const submissionRef =
          (answers.koraApplicationExternalRef as string | undefined) || "Not available";
        const fullName = (answers.fullName as string | undefined) || "your application";

        return (
          <div className="space-y-5 print-section">
            <section className="rounded-2xl border border-emerald-500/40 bg-emerald-900/20 p-5">
              <h2 className="text-base font-semibold text-emerald-200">
                Your application has been submitted
              </h2>
              <p className="mt-2 text-sm text-emerald-50/90">
                Thank you, <span className="font-semibold">{fullName}</span>.
                Your details have been securely sent to the Sitara compliance team for review.
              </p>
              <p className="mt-2 text-xs text-emerald-100/80">
                Please keep the reference below for your records. You may be asked to quote it if you
                contact us about your application.
              </p>

              <div className="mt-4 inline-flex items-center rounded-full border border-emerald-500/60 bg-emerald-950/60 px-4 py-2 text-[11px] font-medium tracking-wide text-emerald-100">
                <span className="mr-2 uppercase text-emerald-300/90">
                  Onboarding reference
                </span>
                <span className="font-mono text-xs">{submissionRef}</span>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5 text-xs text-neutral-300 md:text-sm">
              <p>
                Our team will review your application in line with UAE AML / CFT and internal
                compliance policies. If we need anything else, we’ll contact you using the email or
                mobile number you provided.
              </p>
            </section>
          </div>
        );
      }

      return (
        <div className="space-y-5">
          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <h2 className="text-sm font-semibold text-neutral-100">
              Review your application
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              Please confirm the details below before sending your application to the Sitara
              compliance team.
            </p>
            <p className="mt-2 text-[11px] text-neutral-500">
              Most applications are reviewed within{" "}
              <span className="text-neutral-200">1–2 business days</span>.
            </p>
          </section>

          {/* Evidence pack section (business only) */}
          <ReviewSubmitStep
            answers={answers}
            setValue={setValue}
            setGlobalError={setGlobalError}
            isSubmitting={isSubmittingStep}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Identity
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Account type</span>
                  <span className="text-neutral-100">
                    {isBusinessLocal ? "Business" : "Individual"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Full name</span>
                  <span className="text-neutral-100">
                    {safeText(answers.fullName) || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Nationality</span>
                  <span className="text-neutral-100">
                    {safeText(answers.nationality) || "—"}
                  </span>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Contact
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Email</span>
                  <span className="text-neutral-100">
                    {safeText(answers.email) || "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-400">Mobile</span>
                  <span className="text-neutral-100">
                    {safeText(answers.phone) || "—"}
                  </span>
                </div>
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Profile & expected use
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-400">Occupation</span>
                <span className="text-neutral-100">
                  {formatMaybe(answers.occupation)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-400">Expected transaction frequency</span>
                <span className="text-neutral-100">
                  {formatMaybeSpecified(answers.expectedFrequency)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-400">Source of income</span>
                <span className="text-neutral-100">
                  {formatMaybe(answers.sourceOfIncome)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-neutral-400">Typical transaction value</span>
                <span className="text-neutral-100">
                  {formatMaybeSpecified(answers.expectedValue)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3 text-xs md:col-span-2">
                <span className="text-neutral-400">Service categories</span>
                <span className="text-neutral-100">
                  {services.length
                    ? services.map((s) => titleCase(s)).join(", ")
                    : "None selected"}
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Risk declarations
            </div>

            <div className="mt-4 space-y-3 text-xs">
              {[
                { label: "Politically Exposed Person (PEP)", pill: pep },
                { label: "Sanctions / restrictions", pill: sanctions },
                { label: "Acting on behalf of a third party", pill: thirdParty },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <span className="text-neutral-300">{row.label}</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      row.pill.tone === "warn"
                        ? "border-neutral-700 bg-neutral-900 text-neutral-300"
                        : "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
                    }`}
                  >
                    {row.pill.label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {isBusinessLocal ? (
            <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Consents & acknowledgements
              </div>

              <div className="mt-4 space-y-3 text-xs">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-300">Screening consent (sanctions / PEP)</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      screeningConsent
                        ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
                        : "border-neutral-700 bg-neutral-900 text-neutral-300"
                    }`}
                  >
                    {screeningConsent ? "Consented" : "Not provided"}
                  </span>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-neutral-300">Ongoing monitoring acknowledgement</span>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-[11px] ${
                      monitoringAck
                        ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
                        : "border-neutral-700 bg-neutral-900 text-neutral-300"
                    }`}
                  >
                    {monitoringAck ? "Acknowledged" : "Not provided"}
                  </span>
                </div>
              </div>
            </section>
          ) : null}

          {/* Keep this section for now (individual docs). For business, the Evidence Pack section is now the source of truth. */}
          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Documents received
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <div className="text-xs">
                <div className="text-neutral-400">Passport / ID</div>
                <div
                  className={
                    passportOrIdReceived ? "mt-1 text-emerald-300" : "mt-1 text-neutral-400"
                  }
                >
                  {passportOrIdReceived ? "Received" : "Not uploaded"}
                </div>
              </div>

              <div className="text-xs">
                <div className="text-neutral-400">Emirates ID</div>
                <div className="mt-1">
                  {!isUAE ? (
                    <span className="text-neutral-400">Not required</span>
                  ) : emiratesIdReceived ? (
                    <span className="text-emerald-300">Received</span>
                  ) : (
                    <span className="text-neutral-400">Not uploaded</span>
                  )}
                </div>
              </div>

              <div className="text-xs">
                <div className="text-neutral-400">Proof of address</div>
                <div className="mt-1">
                  {!showPoA ? (
                    <span className="text-neutral-400">Not required</span>
                  ) : poaReceived ? (
                    <span className="text-emerald-300">Received</span>
                  ) : (
                    <span className="text-neutral-400">Not uploaded</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Declaration
            </div>

            <p className="mt-3 text-[11px] leading-relaxed text-neutral-400">
              By submitting this application, you confirm that all information and documents provided are true, accurate, and complete to the best of your knowledge. You understand that Sitara may request additional information or documentation, and that providing false or misleading information may result in your account being declined or closed and, where required, reported to the relevant authorities under applicable AML / CFT regulations.
            </p>

            {!DEV_MODE && isBusinessLocal && !businessEvidenceOk ? (
              <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
                You cannot submit yet because required business documents are missing. Please review the Business Evidence Pack section above.
              </div>
            ) : null}

            <label className="mt-4 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                checked={answers.submitDeclarationAccepted === true}
                onChange={(e) => setValue("submitDeclarationAccepted", e.target.checked)}
                className="mt-[2px] h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-[--gold-color] focus:ring-[--gold-color]"
              />
              <span className="text-xs text-neutral-200">
                I confirm the above statements and authorise Sitara to use this information to perform customer due diligence and ongoing compliance checks.
              </span>
            </label>

            <style>{`:root{--gold-color:${GOLD}}`}</style>
          </section>
        </div>
      );
    }

    if (step.id === "login") return <AccountStep answers={answers} setValue={setValue} globalError={globalError} setGlobalError={setGlobalError} showValidationErrors={showValidationErrors} />;
    if (step.id === "ownership")
      return (
        <OwnershipStep
          answers={answers}
          setValue={setValue}
          isResuming={isResuming}
          showValidationErrors={showValidationErrors}
        />
      );
    if (step.id === "identity") return <IdentityStep answers={answers} setValue={setValue} showValidationErrors={showValidationErrors} />;
    if (step.id === "profile") return <ProfileStep answers={answers} setValue={setValue} showValidationErrors={showValidationErrors} />;
    if (step.id === "riskDeclarations") return <RiskDeclarationsStep answers={answers} setValue={setValue} showValidationErrors={showValidationErrors} />;

    if (step.id === "companyDetails") {
      return <BusinessDocumentsStep answers={answers} setValue={setValue} showValidationErrors={showValidationErrors} />;
    }

    if (step.id === "relationship") {
      return <RelationshipProfileStep answers={answers} setValue={setValue} showValidationErrors={showValidationErrors} />;
    }

    if (step.id === "authorisedPeople") {
      return <AuthorisedPeopleStep answers={answers} setValue={setValue} isResuming={isResuming} showValidationErrors={showValidationErrors} />;
    }

    // ✅ NEW: Questions step renderer
    if (step.id === "questionnaire") {
      return <QuestionsStep answers={answers} setValue={setValue} showValidationErrors={showValidationErrors} />;
    }

    return (
      <div className="space-y-5">
        {step.fields.map((f) => (
          <FieldRenderer key={f.id} f={f} answers={answers} setValue={setValue} />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      <style>{`
        @media print {
          body { background: #ffffff !important; color: #000000 !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .print-section { max-width: 100% !important; }
        }
      `}</style>

      <nav className="no-print mb-6 flex flex-wrap items-center gap-3 text-sm">
        {visibleSteps.map((s, i) => {
          const isActive = s.id === step.id;
          return (
            <div key={s.id} className="flex items-center gap-2">
              <span
                className={`inline-flex h-6 w-6 items-center justify-center rounded-full border ${
                  isActive
                    ? "border-[--gold-color] text-[--gold-color]"
                    : "border-neutral-700 text-neutral-400"
                }`}
              >
                {i + 1}
              </span>
              <span className={isActive ? "text-[--gold-color]" : "text-neutral-400"}>
                {s.label}
              </span>
              {i < visibleSteps.length - 1 && (
                <span className="mx-2 text-neutral-600">—</span>
              )}
            </div>
          );
        })}
        <style>{`:root{--gold-color:${GOLD}}`}</style>
      </nav>

      {/* Show global error for all steps except login (login step shows error inline) */}
      {globalError && step.id !== "login" && (
        <div className="no-print mb-6 rounded-xl border-2 border-red-500/60 bg-red-900/30 px-6 py-4 shadow-lg shadow-red-500/10">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-200 font-medium">{globalError}</p>
          </div>
        </div>
      )}

      {/* Read-only mode banner */}
      {readOnly && (
        <div className="mb-6 rounded-lg border border-blue-500/40 bg-blue-900/20 px-4 py-3">
          <div className="flex items-center gap-2">
            <svg className="h-5 w-5 text-blue-300" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <span className="text-sm font-medium text-blue-200">
              View Only: This application has been submitted and cannot be modified.
            </span>
          </div>
        </div>
      )}

      <div className="space-y-5">{renderStepContent()}</div>

      <div className="no-print mt-6 flex justify-between items-center">
        {step.id === "submit" && hasSubmitted ? (
          <>
            <Button
              variant="secondary"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
            >
              Print
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                // Clear localStorage before navigating away
                if (typeof window !== "undefined") {
                  try {
                    localStorage.removeItem(STORAGE_KEY);
                    localStorage.removeItem(`${STORAGE_KEY}_step`);
                  } catch (e) {
                    console.warn("Failed to clear onboarding data", e);
                  }
                }
                router.push("/");
              }}
            >
              Finish
            </Button>
          </>
        ) : (
          <>
            <Button
              variant="secondary"
              disabled={visibleIdx === 0 || isSubmittingStep || hasSubmitted || readOnly}
              onClick={prev}
            >
              Back
            </Button>

            {/* Save & Exit button (autosave is silent, only errors shown) */}
            {effectiveApplicationId && !readOnly && (
              <div className="flex items-center gap-3 flex-1 justify-center">
                <div className="flex items-center gap-2">
                  {/* Error message - only shown when save fails */}
                  {saveError && (
                    <span className="text-xs text-red-400">{saveError}</span>
                  )}

                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={saveAndExit}
                    disabled={isSaving}
                  >
                    Save & Exit
                  </Button>
                </div>
              </div>
            )}

            {step.id !== "submit" ? (
              <Button
                variant="primary"
                onClick={() => {
                  // If validation fails, show errors and don't proceed
                  if (!canGoNext) {
                    setShowValidationErrors(true);
                    return;
                  }
                  // Validation passed, proceed normally
                  handleNextClick();
                }}
                disabled={visibleIdx >= visibleSteps.length - 1 || isSubmittingStep}
                loading={isSubmittingStep}
              >
                {step.id === "login"
                  ? isSubmittingStep
                    ? answers.authMode === "login"
                      ? "Logging in…"
                      : "Creating account…"
                    : answers.authMode === "login"
                      ? "Log In"
                      : "Create Account"
                  : "Next"}
              </Button>
            ) : (
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={!canSubmit}
              >
                {hasSubmitted ? "Submitted" : "Submit"}
              </Button>
            )}
          </>
        )}
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      <div className="no-print mt-6">
        <Button
          variant="ghost"
          onClick={() => {
            try {
              if (typeof window !== "undefined") {
                window.localStorage.removeItem(STORAGE_KEY);
              }
            } catch {}
            setAnswers({});
            setStepIdx(0);
            setGlobalError(null);
            setHasSubmitted(false);
          }}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
