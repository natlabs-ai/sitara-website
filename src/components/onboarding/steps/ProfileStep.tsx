// src/app/onboarding/steps/ProfileStep.tsx

"use client";

import React from "react";
import { Section, FormField, Input, Textarea, Select } from "@/components/ui";

interface ProfileStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  showValidationErrors?: boolean;
}

const individualServiceOptions = [
  { value: "buy_gold", label: "Buy gold" },
  { value: "sell_gold", label: "Sell gold" },
  { value: "vault_storage", label: "Vault storage" },
  { value: "secure_logistics", label: "Secure logistics" },
];

export const ProfileStep: React.FC<ProfileStepProps> = ({
  answers,
  setValue,
  showValidationErrors = false,
}) => {
  const fullName = (answers.fullName as string) || "";
  const nationality = (answers.nationality as string) || "";

  const occupation = (answers.occupation as string) || "";
  const sourceOfIncome = (answers.sourceOfIncome as string) || "";
  const expectedFrequency = (answers.expectedFrequency as string) || "";
  const expectedValue = (answers.expectedValue as string) || "";

  const selectedServices = Array.isArray(answers.selectedServices)
    ? (answers.selectedServices as string[])
    : [];

  const toggleService = (value: string) => {
    if (selectedServices.includes(value)) {
      setValue(
        "selectedServices",
        selectedServices.filter((v) => v !== value),
      );
    } else {
      setValue("selectedServices", [...selectedServices, value]);
    }
  };

  return (
    <div className="space-y-5">
      {/* Compact identity summary row */}
      <Section>
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-xs md:text-sm">
          <div className="text-neutral-300">
            <span className="font-semibold text-neutral-100">Full name:</span>{" "}
            {fullName ? (
              <span className="text-neutral-200">{fullName}</span>
            ) : (
              <span className="italic text-neutral-500">
                Waiting for passport data…
              </span>
            )}
          </div>
          <div className="text-neutral-300">
            <span className="font-semibold text-neutral-100">Nationality:</span>{" "}
            {nationality ? (
              <span className="text-neutral-200">{nationality}</span>
            ) : (
              <span className="italic text-neutral-500">
                Waiting for passport data…
              </span>
            )}
          </div>
        </div>
      </Section>

      {/* Main profile card */}
      <Section>
        <header className="space-y-1">
          <h2 className="text-sm font-semibold text-neutral-100">
            Your profile & expected use
          </h2>
          <p className="text-xs text-neutral-400">
            These details are required under UAE AML / CFT rules and help us
            understand how you&#39;ll use Sitara.
          </p>
        </header>

        {/* Occupation */}
        <FormField
          label="Occupation"
          required
          htmlFor="occupation"
          helperText="Required under UAE AML / CFT and goAML CDD rules."
        >
          <Input
            id="occupation"
            type="text"
            value={occupation}
            onChange={(value) => setValue("occupation", value)}
            placeholder="e.g. Finance Manager, Jewellery Trader, Business Owner"
          />
        </FormField>

        {/* Source of income */}
        <FormField
          label="Source of income"
          required
          htmlFor="sourceOfIncome"
          helperText="Describe the main source(s) of your income. This is used for risk assessment and CDD."
        >
          <Textarea
            id="sourceOfIncome"
            value={sourceOfIncome}
            onChange={(value) => setValue("sourceOfIncome", value)}
            placeholder="Salary, business profits, investment income, rental income, etc."
            rows={3}
          />
        </FormField>

        {/* Optional risk questions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Expected frequency */}
          <FormField
            label="How often do you expect to transact with Sitara? (optional)"
            htmlFor="expectedFrequency"
          >
            <Select
              id="expectedFrequency"
              value={expectedFrequency}
              onChange={(value) => setValue("expectedFrequency", value)}
              options={[
                { value: "occasional", label: "Occasional (up to 2 times per year)" },
                { value: "monthly", label: "Monthly" },
                { value: "weekly", label: "Weekly" },
                { value: "high_frequency", label: "High frequency (several times per week)" },
                { value: "unsure", label: "Not sure yet" },
              ]}
              placeholder="Select an option…"
            />
          </FormField>

          {/* Expected value */}
          <FormField
            label="Typical value of your transactions (optional)"
            htmlFor="expectedValue"
          >
            <Select
              id="expectedValue"
              value={expectedValue}
              onChange={(value) => setValue("expectedValue", value)}
              options={[
                { value: "lt_50k", label: "Up to AED 50,000" },
                { value: "50k_250k", label: "AED 50,000 – 250,000" },
                { value: "250k_1m", label: "AED 250,000 – 1,000,000" },
                { value: "gt_1m", label: "Above AED 1,000,000" },
                { value: "unsure", label: "Not sure yet" },
              ]}
              placeholder="Select an option…"
            />
          </FormField>
        </div>

        {/* Service categories */}
        <div className="pt-1">
          <label className="mb-1 block text-xs font-medium text-neutral-200">
            Service categories{showValidationErrors && selectedServices.length === 0 && <span className="text-red-400"> *</span>}
          </label>
          <p className="mb-2 text-[11px] text-neutral-500">
            Select all services you expect to use. This helps us understand the
            nature of your relationship with Sitara.
          </p>

          <div className="flex flex-wrap gap-2">
            {individualServiceOptions.map((opt) => {
              const active = selectedServices.includes(opt.value);
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => toggleService(opt.value)}
                  className={`rounded-full border px-3 py-1 text-xs transition ${
                    active
                      ? "border-[#bfa76f] bg-[#bfa76f1a] text-[#f5e9c0]"
                      : "border-neutral-700 bg-black/60 text-neutral-200 hover:border-neutral-500"
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </Section>
    </div>
  );
};

export default ProfileStep;
