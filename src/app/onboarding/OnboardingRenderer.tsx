// src/app/onboarding/OnboardingRenderer.tsx
"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  createApplication,
  createApplicantProfile,
  resolveOnboarding,
  upsertCompanyProfile, // NEW
  type AccountType,
  type OnboardingResolveRequest,
  type OnboardingResolveResponse,
  type EvidencePackResponse,
} from "@/lib/koraClient";

import { countries } from "@/data/countries";

import {
  GOLD,
  GOLD_BG_SOFT,
  Field,
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

// ✅ NEW: Questions step (business only)
import QuestionsStep from "./steps/QuestionsStep";

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
}: {
  spec: Spec;
  onSubmit: (data: Record<string, any>) => void | Promise<void>;
  initialAnswers?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onStepChange?: (index: number, step: Step) => void;
}) {
  const router = useRouter();

  const STORAGE_KEY = "sitara_onboarding_answers_v1";

  const [stepIdx, setStepIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, any>>(
    initialAnswers || {},
  );
  const [isSubmittingStep, setIsSubmittingStep] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = React.useState(false);

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
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(answers ?? {}));
    } catch (e) {
      console.warn("Failed to persist onboarding draft to localStorage", e);
    }
  }, [answers]);

  const visibleSteps = React.useMemo(() => {
    const isBusiness = answers.accountType === "business";
    const isBasicBusinessPath =
      isBusiness &&
      (answers.businessFlow === "basic" ||
        answers.onboardingResolution?.low_risk_service_provider === true);

    return spec.steps.filter((s) => {
      // Hide Questions step on Basic business path
      if (isBasicBusinessPath && s.id === "questionnaire") return false;

      // Force Documents step to always show for business accounts
      if (isBusiness && s.id === "companyDetails") return true;

      return visibleByRules(s.showIf, answers);
    });
  }, [spec.steps, answers]);

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
  const visibleTotal = visibleSteps.length;

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

  function goToVisibleIndex(nextVisibleIdx: number) {
    const target = visibleSteps[nextVisibleIdx];
    if (!target) return;
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
    setGlobalError(null);
    try {
      setIsSubmittingStep(true);
      await Promise.resolve(onSubmit(answers));
      setHasSubmitted(true);
    } catch (e: any) {
      console.error("onSubmit handler failed", e);
      setGlobalError(
        e?.message || "We couldn’t submit your application. Please try again.",
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
      return (
        !!answers.email &&
        !!answers.phone &&
        !!answers.password &&
        !!answers.confirmPassword &&
        answers.passwordMatch !== false &&
        !isSubmittingStep
      );
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

  const canSubmit =
    step.id === "submit" &&
    answers.submitDeclarationAccepted === true &&
    businessEvidenceOk &&
    !isSubmittingStep &&
    !hasSubmitted;

  const ownersForTree: Owner[] = React.useMemo(() => {
    const raw = answers.owners;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (o: Owner) => o && o.name && String(o.name).trim().length > 0,
    );
  }, [answers.owners]);

  /** ---------- Next click handlers ---------- */
  async function handleNextClick() {
    setGlobalError(null);

    // 1) LOGIN
    if (step.id === "login") {
      try {
        setIsSubmittingStep(true);

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

        next();
      } catch (e: any) {
        console.error("Failed to create Kora application from login step", e);
        setGlobalError(
          e?.message || "Unable to start your application. Please try again.",
        );
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

      const frontFiles = answers.emiratesIdFront__files as File[] | undefined;
      const backFiles = answers.emiratesIdBack__files as File[] | undefined;

      if (
        !frontFiles?.length ||
        !backFiles?.length ||
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

        const res = await fetch("/api/documents/emirates-id", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const detail =
            errJson?.detail || "Failed to upload Emirates ID. Please try again.";
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
            "We couldn’t save your profile details. Please check the fields and try again.",
        );
      } finally {
        setIsSubmittingStep(false);
      }

      return;
    }

    // 4) Step 4 (Business model) → call resolver + persist onboardingResolution
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

          {/* Optional: show resolver outcome once present (dev visibility) */}
          {answers.onboardingResolution ? (
            <div className="rounded-2xl border border-neutral-800 bg-black/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Resolution (stored)
              </div>
              <div className="mt-2 text-xs text-neutral-300">
                Question sets:{" "}
                {(answers.onboardingResolution.question_sets || [])
                  .map((s: string) => titleCase(s))
                  .join(", ") || "—"}
              </div>
              <div className="mt-1 text-xs text-neutral-300">
                Document sets:{" "}
                {(answers.onboardingResolution.document_sets || [])
                  .map((s: string) => titleCase(s))
                  .join(", ") || "—"}
              </div>
            </div>
          ) : null}
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
              We’ll ask a few questions to understand how your business interacts
              with precious metals. This helps ensure proportionate compliance.
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

      const emiratesIdRequired = isUAE;
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

    if (step.id === "login") return <AccountStep answers={answers} setValue={setValue} />;
    if (step.id === "ownership")
      return (
        <OwnershipStep
          answers={answers}
          setValue={setValue}
          ownersForTree={ownersForTree}
        />
      );
    if (step.id === "identity") return <IdentityStep answers={answers} setValue={setValue} />;
    if (step.id === "profile") return <ProfileStep answers={answers} setValue={setValue} />;

    if (step.id === "companyDetails") {
      return <BusinessDocumentsStep answers={answers} setValue={setValue} />;
    }

    if (step.id === "relationship") {
      return <RelationshipProfileStep answers={answers} setValue={setValue} />;
    }

    if (step.id === "authorisedPeople") {
      return <AuthorisedPeopleStep answers={answers} setValue={setValue} />;
    }

    // ✅ NEW: Questions step renderer
    if (step.id === "questionnaire") {
      return <QuestionsStep answers={answers} setValue={setValue} />;
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

      {globalError && (
        <div className="no-print mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-xs text-red-200">
          {globalError}
        </div>
      )}

      <div className="no-print mb-6 text-center">
        <h1
          className="
            bg-gradient-to-r from-[--color-bronze] via-[#d7c89a] to-[--color-bronze]
            bg-clip-text text-2xl font-semibold tracking-widest text-transparent
            drop-shadow-[0_0_10px_var(--gold-shadow)] md:text-3xl
          "
        >
          {spec.meta.title}
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          Step {visibleIdx + 1} of {visibleTotal} ·{" "}
          <span className="text-neutral-200">{step.label}</span>
        </p>
        <style>{`:root{--gold-shadow: rgba(191,167,111,.35)}`}</style>
      </div>

      <div className="space-y-5">{renderStepContent()}</div>

      <div className="no-print mt-6 flex justify-between">
        {step.id === "submit" && hasSubmitted ? (
          <>
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined") window.print();
              }}
              className="rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 transition hover:bg-neutral-800"
            >
              Print
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-lg bg-emerald-500 px-5 py-2 text-sm font-medium text-white transition hover:bg-emerald-600"
            >
              Finish
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={visibleIdx === 0 || isSubmittingStep || hasSubmitted}
              onClick={prev}
              className="rounded-lg border border-neutral-800 bg-neutral-900 px-4 py-2 text-neutral-100 transition hover:bg-neutral-800 disabled:opacity-40"
            >
              Back
            </button>

            {step.id !== "submit" ? (
              <button
                type="button"
                onClick={handleNextClick}
                disabled={!canGoNext || visibleIdx >= visibleSteps.length - 1}
                className={`rounded-lg px-5 py-2 font-medium transition ${
                  !canGoNext || visibleIdx >= visibleSteps.length - 1
                    ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                    : "border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
                }`}
              >
                {isSubmittingStep
                  ? step.id === "login"
                    ? "Starting…"
                    : "Saving…"
                  : "Next"}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`rounded-lg px-5 py-2 font-medium transition ${
                  !canSubmit
                    ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                    : "bg-emerald-500 text-white hover:bg-emerald-600"
                }`}
              >
                {hasSubmitted ? "Submitted" : "Submit"}
              </button>
            )}
          </>
        )}
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      <div className="no-print mt-6">
        <button
          type="button"
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
          className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
