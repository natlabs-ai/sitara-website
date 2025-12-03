// src/app/onboarding/steps/ProfileStep.tsx

"use client";

import React from "react";

interface ProfileStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}

const individualServiceOptions = [
  { value: "buy_gold", label: "Buy gold" },
  { value: "sell_gold", label: "Sell gold" },
  { value: "deposit_gold", label: "Deposit / store gold" },
  { value: "storage_logistics", label: "Storage / logistics only" },
];

export const ProfileStep: React.FC<ProfileStepProps> = ({
  answers,
  setValue,
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
      <section className="rounded-2xl border border-neutral-800 bg-black/40 px-4 py-3 text-xs md:text-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
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
      </section>

      {/* Main profile card */}
      <section className="space-y-5 rounded-2xl border border-neutral-800 bg-black/30 p-5">
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
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-200">
            Occupation <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={occupation}
            onChange={(e) => setValue("occupation", e.target.value)}
            placeholder="e.g. Finance Manager, Jewellery Trader, Business Owner"
            className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            Required under UAE AML / CFT and goAML CDD rules.
          </p>
        </div>

        {/* Source of income */}
        <div>
          <label className="mb-1 block text-xs font-medium text-neutral-200">
            Source of income <span className="text-red-400">*</span>
          </label>
          <textarea
            value={sourceOfIncome}
            onChange={(e) => setValue("sourceOfIncome", e.target.value)}
            placeholder="Salary, business profits, investment income, rental income, etc."
            rows={3}
            className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
          />
          <p className="mt-1 text-[11px] text-neutral-500">
            Describe the main source(s) of your income. This is used for risk
            assessment and CDD.
          </p>
        </div>

        {/* Optional risk questions */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* Expected frequency */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-200">
              How often do you expect to transact with Sitara?{" "}
              <span className="text-neutral-500">(optional)</span>
            </label>
            <select
              value={expectedFrequency}
              onChange={(e) => setValue("expectedFrequency", e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
            >
              <option value="">Select an option…</option>
              <option value="occasional">
                Occasional (up to 2 times per year)
              </option>
              <option value="monthly">Monthly</option>
              <option value="weekly">Weekly</option>
              <option value="high_frequency">
                High frequency (several times per week)
              </option>
              <option value="unsure">Not sure yet</option>
            </select>
          </div>

          {/* Expected value */}
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-200">
              Typical value of your transactions{" "}
              <span className="text-neutral-500">(optional)</span>
            </label>
            <select
              value={expectedValue}
              onChange={(e) => setValue("expectedValue", e.target.value)}
              className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
            >
              <option value="">Select an option…</option>
              <option value="lt_50k">Up to AED 50,000</option>
              <option value="50k_250k">AED 50,000 – 250,000</option>
              <option value="250k_1m">AED 250,000 – 1,000,000</option>
              <option value="gt_1m">Above AED 1,000,000</option>
              <option value="unsure">Not sure yet</option>
            </select>
          </div>
        </div>

        {/* Service categories */}
        <div className="pt-1">
          <label className="mb-1 block text-xs font-medium text-neutral-200">
            Service categories <span className="text-red-400">*</span>
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
      </section>
    </div>
  );
};

export default ProfileStep;
