// src/app/onboarding/OnboardingRenderer.tsx
"use client";

import React from "react";
import { createApplication, type AccountType } from "@/lib/koraClient";

import {
  GOLD,
  GOLD_BG_SOFT,
  Field,
  Owner,
  Spec,
  Step,
  visibleByRules,
} from "./onboardingShared";
import { FieldRenderer } from "./FieldRenderer";
import { AccountStep } from "./steps/AccountStep";
import { OwnershipStep } from "./steps/OwnershipStep";
import { IdentityStep } from "./steps/IdentityStep";

/** ---------- Main Component ---------- */
export default function OnboardingRenderer({
  spec,
  onSubmit,
  initialAnswers,
  onChange,
  onStepChange,
}: {
  spec: Spec;
  onSubmit: (data: Record<string, any>) => void;
  initialAnswers?: Record<string, any>;
  onChange?: (data: Record<string, any>) => void;
  onStepChange?: (index: number, step: Step) => void;
}) {
  const [stepIdx, setStepIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, any>>(
    initialAnswers || {},
  );
  const [isSubmittingStep, setIsSubmittingStep] = React.useState(false);
  const [globalError, setGlobalError] = React.useState<string | null>(null);

  const visibleSteps = React.useMemo(
    () => spec.steps.filter((s) => visibleByRules(s.showIf, answers)),
    [spec.steps, answers],
  );

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
    if (visibleIdx < visibleSteps.length - 1)
      goToVisibleIndex(visibleIdx + 1);
  }

  function prev() {
    if (visibleIdx > 0) goToVisibleIndex(visibleIdx - 1);
  }

  function handleSubmit() {
    onSubmit(answers);
  }

  const questionnaireFields: Field[] =
    step.id === "questionnaire"
      ? (spec.questionBank || []).filter((q) =>
          visibleByRules(q.showIf, answers),
        )
      : [];

  const canGoNext = (() => {
    if (step.id === "accountSelection") {
      return !!answers.accountType && !isSubmittingStep;
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
      const isUAE =
        answers.countryOfResidence === "United Arab Emirates";

      const hasEidFiles =
        !isUAE ||
        (Array.isArray(answers.emiratesIdFront__files) &&
          answers.emiratesIdFront__files.length > 0 &&
          Array.isArray(answers.emiratesIdBack__files) &&
          answers.emiratesIdBack__files.length > 0);

      return (
        answers.idExtractStatus !== "processing" &&
        !!answers.countryOfResidence &&
        !!answers.proofOfAddressDocId &&
        hasEidFiles &&
        !isSubmittingStep
      );
    }

    return !isSubmittingStep;
  })();

  const ownersForTree: Owner[] = React.useMemo(() => {
    const raw = answers.owners;
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (o: Owner) => o && o.name && String(o.name).trim().length > 0,
    );
  }, [answers.owners]);

  /** ---------- Next click (login + identity handling) ---------- */
  async function handleNextClick() {
    setGlobalError(null);

    // 1) LOGIN step → create Kora application
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

        next();
      } catch (e: any) {
        console.error("Failed to create Kora application from login step", e);
        setGlobalError(
          e?.message ||
            "Unable to start your application. Please try again.",
        );
      } finally {
        setIsSubmittingStep(false);
      }
      return;
    }

    // 2) IDENTITY step → upload Emirates ID (if UAE resident) on Next
    if (step.id === "identity") {
      const isUAE =
        answers.countryOfResidence === "United Arab Emirates";

      // If not UAE, nothing to upload – just continue
      if (!isUAE) {
        next();
        return;
      }

      const frontFiles = answers.emiratesIdFront__files as
        | File[]
        | undefined;
      const backFiles = answers.emiratesIdBack__files as
        | File[]
        | undefined;

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
        formData.append(
          "application_id",
          String(answers.koraApplicationId),
        );
        if (answers.koraApplicantId) {
          formData.append(
            "applicant_id",
            String(answers.koraApplicantId),
          );
        }

        const res = await fetch("/api/documents/emirates-id", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) {
          const errJson = await res.json().catch(() => null);
          const detail =
            errJson?.detail ||
            "Failed to upload Emirates ID. Please try again.";
          throw new Error(detail);
        }

        const data = await res.json();

        // Persist returned doc IDs in answers for downstream use / UI
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

    // 3) All other steps – just move forward
    next();
  }

  /** ---------- Step content renderer ---------- */
  const renderStepContent = () => {
    if (step.id === "review") {
      return (
        <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
          <h2 className="mb-2 text-base font-semibold text-neutral-100">
            Review
          </h2>
          <pre className="overflow-auto rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-300">
            {JSON.stringify(answers, null, 2)}
          </pre>
          <p className="mt-2 text-xs text-neutral-400">
            You’ll answer a short questionnaire next, tailored to your
            selections.
          </p>
        </div>
      );
    }

    if (step.id === "questionnaire") {
      return questionnaireFields.length > 0 ? (
        <div className="rounded-xl border border-neutral-800 bg-black/30 p-4">
          <p className="mb-4 text-sm text-neutral-300">
            Please answer the questions below. These are generated from your
            earlier selections.
          </p>
          <div className="space-y-5">
            {questionnaireFields.map((f) => (
              <FieldRenderer
                key={f.id}
                f={f}
                answers={answers}
                setValue={setValue}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-sm text-neutral-300">
          No additional questions are required based on your selections.
        </div>
      );
    }

    if (step.id === "submit") {
      return (
        <div className="space-y-4 rounded-xl border border-neutral-800 bg-black/30 p-4">
          <h2 className="mb-2 text-base font-semibold text-neutral-100">
            Ready to submit
          </h2>
          <p className="text-sm text-neutral-300">
            We’re sending the information below. Please confirm the details
            before final submission.
          </p>
          <pre className="overflow-auto rounded-lg border border-neutral-800 bg-neutral-950/60 p-3 text-xs text-neutral-300">
            {JSON.stringify(answers, null, 2)}
          </pre>

          {ownersForTree.length > 0 && (
            <div className="mt-3 rounded-lg border border-neutral-800 bg-neutral-950/60 p-3">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-neutral-100">
                Ownership structure (summary)
              </h3>
              <p className="mb-2 text-xs text-neutral-400">
                This summary shows only disclosed owners with a name. Empty rows
                are automatically collapsed.
              </p>
              <div className="text-xs text-neutral-200">
                <div className="mb-1 font-semibold">Client entity</div>
                <ul className="ml-4 list-disc space-y-1">
                  {ownersForTree.map((o, idx) => {
                    let typeLabel = "Owner";
                    switch (o.ownerType) {
                      case "individual":
                        typeLabel = "Individual";
                        break;
                      case "company":
                        typeLabel = "Company";
                        break;
                      case "spv":
                        typeLabel = "SPV / Holding";
                        break;
                      case "trust":
                        typeLabel = "Trust";
                        break;
                      case "foundation":
                        typeLabel = "Foundation";
                        break;
                      case "other_entity":
                        typeLabel = "Other entity";
                        break;
                    }

                    const shareLabel =
                      o.share !== undefined && o.share !== ""
                        ? ` · ${o.share}%`
                        : "";
                    const countryLabel = o.incCountry
                      ? ` · ${o.incCountry}`
                      : "";
                    const pepLabel = o.pep === "yes" ? " · PEP" : "";
                    const sancLabel =
                      o.sanctions === "yes"
                        ? " · Sanctions flag"
                        : o.sanctions === "unsure"
                        ? " · Sanctions unsure"
                        : "";

                    return (
                      <li key={o.id || idx}>
                        <span className="font-medium">{o.name}</span>
                        <span className="text-neutral-400">
                          {" "}
                          — {typeLabel}
                          {shareLabel}
                          {countryLabel}
                          {pepLabel}
                          {sancLabel}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      );
    }

    if (step.id === "login") {
      return <AccountStep answers={answers} setValue={setValue} />;
    }

    if (step.id === "ownership") {
      return <OwnershipStep answers={answers} setValue={setValue} />;
    }

    if (step.id === "identity") {
      return <IdentityStep answers={answers} setValue={setValue} />;
    }

    // default: generic field-driven step
    return (
      <div className="space-y-5">
        {step.fields.map((f) => (
          <FieldRenderer
            key={f.id}
            f={f}
            answers={answers}
            setValue={setValue}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="mx-auto max-w-3xl p-6">
      {/* Breadcrumb */}
      <nav className="mb-6 flex flex-wrap items-center gap-3 text-sm">
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
              <span
                className={
                  isActive ? "text-[--gold-color]" : "text-neutral-400"
                }
              >
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

      {/* Global error banner */}
      {globalError && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-2 text-xs text-red-200">
          {globalError}
        </div>
      )}

      {/* Title */}
      <div className="mb-6 text-center">
        <h1
          className="
            text-2xl md:text-3xl font-semibold tracking-widest
            bg-gradient-to-r from-[--color-bronze] via-[#d7c89a] to-[--color-bronze]
            text-transparent bg-clip-text
            drop-shadow-[0_0_10px_var(--gold-shadow)]
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

      {/* Content */}
      <div className="space-y-5">{renderStepContent()}</div>

      {/* Nav */}
      <div className="mt-6 flex justify-between">
        <button
          type="button"
          disabled={visibleIdx === 0 || isSubmittingStep}
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
            className="rounded-lg bg-emerald-500 px-5 py-2 font-medium text-white transition hover:bg-emerald-600"
          >
            Submit
          </button>
        )}
        <style>{`:root{--gold-color:${GOLD};--gold-bg-soft:${GOLD_BG_SOFT}}`}</style>
      </div>

      {/* Single Reset */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => {
            setAnswers({});
            setStepIdx(0);
            setGlobalError(null);
          }}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-4 py-2 text-sm text-neutral-200 hover:bg-neutral-800"
        >
          Reset
        </button>
      </div>
    </div>
  );
}
