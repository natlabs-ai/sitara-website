// src\app\onboarding\steps\RelationshipProfileStep.tsx

"use client";

import React from "react";
import { GOLD, GOLD_BG_SOFT } from "../onboardingShared";
import { Section, FormField, Select } from "@/components/ui";

type Props = {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  showValidationErrors?: boolean;
};

const DIR_OPTIONS = [
  {
    value: "inbound",
    title: "Inbound to us",
    desc: "You will supply gold or gold-bearing material to us.",
  },
  {
    value: "outbound",
    title: "Outbound from us",
    desc: "You will purchase gold products from us.",
  },
  {
    value: "bidirectional",
    title: "Bidirectional",
    desc: "You expect to both supply to us and purchase from us.",
  },
  {
    value: "processing_only",
    title: "Processing only",
    desc: "Material is processed without transfer of title.",
  },
  {
    value: "intermediary_only",
    title: "Intermediary only",
    desc: "You facilitate transactions without taking ownership.",
  },
  { value: "other", title: "Other", desc: "" },
];

const PRODUCT_OPTIONS = [
  { value: "dore", label: "Doré" },
  { value: "bars", label: "Refined bars" },
  { value: "scrap", label: "Scrap" },
  { value: "jewellery", label: "Jewellery" },
  { value: "coins", label: "Coins" },
  { value: "other", label: "Other" },
];

const FREQ_OPTIONS = [
  { value: "adhoc", label: "Ad-hoc / occasional" },
  { value: "monthly", label: "Monthly" },
  { value: "weekly", label: "Weekly" },
  { value: "daily", label: "Daily / very frequent" },
];

const VALUE_BANDS = [
  { value: "<50k", label: "Less than USD 50,000" },
  { value: "50k-250k", label: "USD 50,000 – 250,000" },
  { value: "250k-1m", label: "USD 250,000 – 1,000,000" },
  { value: ">1m", label: "Over USD 1,000,000" },
];

const PAY_METHODS = [
  { value: "bank_transfer", label: "Bank transfer" },
  { value: "lc", label: "Letter of Credit (LC)" },
  { value: "cash", label: "Cash" },
  { value: "other", label: "Other" },
];

function toggleMulti(arr: string[] = [], v: string) {
  return arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
}

export default function RelationshipProfileStep({ answers, setValue }: Props) {
  const direction = (answers.transaction_direction as string) || "";
  const products = Array.isArray(answers.relationship_products)
    ? (answers.relationship_products as string[])
    : [];
  const frequency = (answers.relationship_frequency as string) || "";
  const valueBand = (answers.relationship_value_band_usd as string) || "";
  const paymentMethods = Array.isArray(answers.relationship_payment_methods)
    ? (answers.relationship_payment_methods as string[])
    : [];
  const cashSelected = paymentMethods.includes("cash");
  const cashAck = answers.relationship_cash_ack === true;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="text-2xl font-semibold" style={{ color: GOLD }}>
          Relationship Profile
        </div>
        <div className="mt-1 text-sm text-neutral-300">
          How your company is expected to transact with us in this relationship.
        </div>
        <div className="mt-2 text-xs text-neutral-500">
          This describes transaction patterns and value flow, not your general business activities.
        </div>
      </div>

      {/* Transaction direction */}
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">
          Transaction direction
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          How goods and value are expected to flow between your company and us.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {DIR_OPTIONS.map((opt) => {
            const selected = direction === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setValue("transaction_direction", opt.value)}
                className="rounded-2xl border px-4 py-3 text-left transition"
                style={{
                  borderColor: selected ? GOLD : "rgb(38 38 38)",
                  background: selected ? GOLD_BG_SOFT : "rgba(0,0,0,0.20)",
                }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm font-medium text-neutral-100">
                    {opt.title}
                  </div>
                  <div
                    className="mt-0.5 h-4 w-4 rounded-full border"
                    style={{
                      borderColor: selected ? GOLD : "rgb(64 64 64)",
                      background: selected ? GOLD : "transparent",
                    }}
                  />
                </div>
                {opt.desc ? (
                  <div className="mt-1 text-xs text-neutral-400">
                    {opt.desc}
                  </div>
                ) : null}
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-[11px] text-neutral-500">
          Applies only to this relationship and may differ from your general business profile.
        </div>
      </Section>

      {/* Products */}
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">
          Products transacted
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Products expected to be transacted under this relationship.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRODUCT_OPTIONS.map((opt) => {
            const selected = products.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() =>
                  setValue(
                    "relationship_products",
                    toggleMulti(products, opt.value),
                  )
                }
                className="rounded-full border px-3 py-2 text-xs font-medium transition"
                style={{
                  borderColor: selected ? GOLD : "rgb(38 38 38)",
                  background: selected ? GOLD_BG_SOFT : "rgba(0,0,0,0.20)",
                  color: selected ? "#f2ead7" : "rgb(212 212 212)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="mt-3 text-[11px] text-neutral-500">
          This reflects expected activity with us only.
        </div>
      </Section>

      {/* Expected activity */}
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">Expected activity</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <FormField label="Transaction frequency" htmlFor="relationship_frequency">
            <Select
              id="relationship_frequency"
              value={frequency}
              onChange={(value) => setValue("relationship_frequency", value)}
              options={FREQ_OPTIONS}
              placeholder="Select…"
            />
          </FormField>

          <FormField label="Typical transaction value (USD)" htmlFor="relationship_value_band_usd">
            <Select
              id="relationship_value_band_usd"
              value={valueBand}
              onChange={(value) => setValue("relationship_value_band_usd", value)}
              options={VALUE_BANDS}
              placeholder="Select…"
            />
          </FormField>
        </div>
      </Section>

      {/* Payment methods */}
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">Payment methods</h2>
        <p className="mt-1 text-xs text-neutral-400">
          Payment methods that may be used in this relationship.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PAY_METHODS.map((opt) => {
            const selected = paymentMethods.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  const next = toggleMulti(paymentMethods, opt.value);
                  setValue("relationship_payment_methods", next);

                  // If cash is toggled off, clear ack
                  if (opt.value === "cash" && selected) {
                    setValue("relationship_cash_ack", false);
                  }
                }}
                className="rounded-full border px-3 py-2 text-xs font-medium transition"
                style={{
                  borderColor: selected ? GOLD : "rgb(38 38 38)",
                  background: selected ? GOLD_BG_SOFT : "rgba(0,0,0,0.20)",
                  color: selected ? "#f2ead7" : "rgb(212 212 212)",
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        {cashSelected ? (
          <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-950/60 p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-300">
              Cash transactions
            </div>
            <p className="mt-2 text-xs text-neutral-400">
              Cash transactions in the precious metals sector are subject to enhanced regulatory scrutiny.
            </p>

            <label className="mt-3 flex cursor-pointer items-start gap-2">
              <input
                type="checkbox"
                className="mt-[2px] h-4 w-4 rounded border-neutral-700 bg-neutral-950 text-[#bfa76f] focus:ring-[#bfa76f]"
                checked={cashAck}
                onChange={(e) => setValue("relationship_cash_ack", e.target.checked)}
              />
              <span className="text-xs text-neutral-200">
                I acknowledge that cash transactions may be subject to enhanced regulatory review and reporting requirements, depending on applicable laws.
                <div className="mt-1 text-[11px] text-neutral-500">
                  This does not imply that all cash transactions are reported.
                </div>
              </span>
            </label>
          </div>
        ) : null}
      </Section>

      {/* Next cue */}
      <div className="rounded-2xl border border-neutral-800 bg-black/20 p-4 text-xs text-neutral-400">
        <span className="font-semibold text-neutral-200">Next:</span>{" "}
        You’ll be asked to provide supporting documents and compliance-related information based on the details above.
      </div>
    </div>
  );
}
