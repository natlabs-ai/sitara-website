/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import type { Step } from "../onboardingShared";
import { Section, YesNoToggle, CountryCombobox } from "@/components/ui";

/** ---------- Main Business Profile Step ---------- */

export interface BusinessProfileStepProps {
  step: Step;
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  showValidationErrors?: boolean;
}

export const BusinessStep: React.FC<BusinessProfileStepProps> = ({
  step,
  answers,
  setValue,
  showValidationErrors,
}) => {
  const holdsAssets = answers.holds_client_assets_or_funds as boolean | undefined;

  return (
    <div className="space-y-5">
      {/* Country of Incorporation */}
      {step.fields.some((f) => f.id === "incCountry") && (() => {
        const f = step.fields.find((f) => f.id === "incCountry")!;
        return (
          <Section key={f.id}>
            <CountryCombobox
              label={f.label || "Country of Incorporation"}
              required={f.required}
              valueAs="code"
              value={(answers.incCountry as string) || null}
              onChange={(code) => setValue("incCountry", code)}
              showError={showValidationErrors && f.required && !answers.incCountry}
              error="Please select the country of incorporation."
            />
          </Section>
        );
      })()}

      {/* Business activity questions */}
      <Section>
        <div className="mb-3">
          <p className="text-sm font-semibold text-neutral-100">Business activity</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            These questions determine which compliance documents apply to your business.
          </p>
        </div>
        <div className="space-y-3">
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business ever take ownership of precious metals?</p>
            <YesNoToggle
              value={answers.takes_ownership_of_metals === true ? 'yes' : answers.takes_ownership_of_metals === false ? 'no' : null}
              onChange={(v) => setValue("takes_ownership_of_metals", v === 'yes')}
            />
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business hold client assets or funds?</p>
            <YesNoToggle
              value={holdsAssets === true ? 'yes' : holdsAssets === false ? 'no' : null}
              onChange={(v) => { setValue("holds_client_assets_or_funds", v === 'yes'); if (v === 'no') setValue("settlement_facilitation", undefined); }}
            />
            {holdsAssets === true && (
              <div className="pl-3 border-l border-neutral-700 space-y-3">
                <p className="text-sm text-neutral-200">Do you facilitate settlement (escrow-style)?</p>
                <YesNoToggle
                  value={answers.settlement_facilitation === true ? 'yes' : answers.settlement_facilitation === false ? 'no' : null}
                  onChange={(v) => setValue("settlement_facilitation", v === 'yes')}
                />
              </div>
            )}
          </div>
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 space-y-3">
            <p className="text-sm text-neutral-200">Does the business arrange or execute transactions for clients?</p>
            <YesNoToggle
              value={answers.acts_as_intermediary === true ? 'yes' : answers.acts_as_intermediary === false ? 'no' : null}
              onChange={(v) => setValue("acts_as_intermediary", v === 'yes')}
            />
          </div>
        </div>
        {showValidationErrors &&
          (answers.takes_ownership_of_metals === undefined ||
           answers.holds_client_assets_or_funds === undefined ||
           answers.acts_as_intermediary === undefined ||
           (holdsAssets === true && answers.settlement_facilitation === undefined)) && (
          <p className="mt-3 text-xs text-red-400">Please answer all questions above.</p>
        )}
      </Section>
    </div>
  );
};

export default BusinessStep;
