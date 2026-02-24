"use client";

import { useState } from "react";
import { useKoraFlow, StepDef, FieldDef } from "@/hooks/useKoraFlow";
import { TextField } from "./fields/TextField";
import { SelectField } from "./fields/SelectField";
import { DocumentUploadField } from "./fields/DocumentUploadField";

type Answers = Record<string, unknown>;

interface FlowRendererProps {
  accountType: "individual" | "business";
  onComplete: (answers: Answers) => void;
}

function stepIsVisible(step: StepDef, answers: Answers): boolean {
  if (!step.condition) return true;
  return answers[step.condition.field] === step.condition.equals;
}

function renderField(
  field: FieldDef,
  answers: Answers,
  onChange: (key: string, value: unknown) => void
) {
  const strVal = (answers[field.key] as string) ?? "";

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "country_select":
      return (
        <TextField
          key={field.key}
          fieldKey={field.key}
          label={field.label}
          type={field.type === "email" ? "email" : "text"}
          required={field.required}
          placeholder={field.placeholder}
          value={strVal}
          onChange={onChange}
        />
      );
    case "date":
      return (
        <TextField
          key={field.key}
          fieldKey={field.key}
          label={field.label}
          type="date"
          required={field.required}
          value={strVal}
          onChange={onChange}
        />
      );
    case "select":
      return (
        <SelectField
          key={field.key}
          fieldKey={field.key}
          label={field.label}
          required={field.required}
          options={field.options ?? []}
          value={strVal}
          onChange={onChange}
        />
      );
    case "document_upload":
      return (
        <DocumentUploadField
          key={field.key}
          fieldKey={field.key}
          label={field.label}
          required={field.required}
          onChange={onChange}
        />
      );
    default:
      // Unknown field type — text fallback (schema versioning safety net)
      return (
        <TextField
          key={field.key}
          fieldKey={field.key}
          label={`${field.label}`}
          value={strVal}
          onChange={onChange}
        />
      );
  }
}

export function FlowRenderer({ accountType, onComplete }: FlowRendererProps) {
  const { flow, loading, error } = useKoraFlow(accountType);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});

  if (loading) {
    return (
      <div className="p-8 text-center text-gray-500 animate-pulse">
        Loading form…
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-500">
        Could not load onboarding form. Please refresh and try again.
      </div>
    );
  }

  if (!flow) return null;

  const visibleSteps = flow.steps.filter((s) => stepIsVisible(s, answers));
  const currentStep = visibleSteps[stepIndex];
  const isLast = stepIndex === visibleSteps.length - 1;

  function handleChange(key: string, value: unknown) {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }

  function handleNext() {
    if (isLast) {
      onComplete(answers);
    } else {
      setStepIndex((i) => i + 1);
    }
  }

  function handleBack() {
    setStepIndex((i) => Math.max(0, i - 1));
  }

  return (
    <div className="max-w-lg mx-auto py-8 px-4">
      {/* Progress indicator */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-xs text-gray-400">
          Step {stepIndex + 1} of {visibleSteps.length}
        </span>
        <div className="w-48 h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${((stepIndex + 1) / visibleSteps.length) * 100}%` }}
          />
        </div>
      </div>

      <h2 className="text-xl font-semibold text-gray-900 mb-1">{currentStep.title}</h2>
      {currentStep.description && (
        <p className="text-sm text-gray-500 mb-6">{currentStep.description}</p>
      )}

      {/* Render fields */}
      <div>
        {currentStep.fields.map((f) => renderField(f, answers, handleChange))}
      </div>

      {/* Navigation */}
      <div className="mt-8 flex items-center justify-between">
        {stepIndex > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
          >
            Back
          </button>
        ) : (
          <div />
        )}
        <button
          type="button"
          onClick={handleNext}
          className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          {isLast ? "Submit" : "Continue"}
        </button>
      </div>
    </div>
  );
}
