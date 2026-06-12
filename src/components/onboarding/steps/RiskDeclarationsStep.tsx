// src/app/onboarding/steps/RiskDeclarationsStep.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React from "react";
import { Section, YesNoToggle } from "@/components/ui";

interface RiskDeclarationsStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  showValidationErrors?: boolean;
}

export const RiskDeclarationsStep: React.FC<RiskDeclarationsStepProps> = ({
  answers,
  setValue,
  showValidationErrors = false,
}) => {
  // Risk declaration answers
  const pepSelf = answers.ind_pepSelf;
  const pepDetails = (answers.ind_pepSelfDetails as string) || "";
  const sanctionsSelf = answers.ind_sanctionsSelf;
  const sanctionsDetails = (answers.ind_sanctionsSelfDetails as string) || "";
  const thirdPartyUse = answers.ind_thirdPartyUse;
  const thirdPartyDetails = (answers.ind_thirdPartyUseDetails as string) || "";

  const [touched, setTouched] = React.useState<Record<string, boolean>>({});
  const touch = (field: string) =>
    setTouched((prev) => ({ ...prev, [field]: true }));

  return (
    <div className="space-y-5">
      {/* Header section */}
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">
          Risk declarations
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          These questions are required under UAE AML / CFT regulations to
          assess account risk and ensure compliance.
        </p>
      </Section>

      {/* PEP Question */}
      <Section>
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-200">
            Are you a Politically Exposed Person (PEP)?
            {showValidationErrors && pepSelf === undefined && <span className="text-red-400"> *</span>}
          </label>
          <p className="mb-3 text-[11px] text-neutral-500">
            A PEP is someone who holds or has held a prominent public
            function (e.g., senior government official, judge, military
            officer) or is a close family member or associate of such a
            person.
          </p>
          <YesNoToggle
            value={pepSelf === true ? 'yes' : pepSelf === false ? 'no' : null}
            onChange={(v) => {
              setValue("ind_pepSelf", v === 'yes');
              if (v === 'no') setValue("ind_pepSelfDetails", "");
            }}
          />
          {pepSelf === true && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={pepDetails}
                onChange={(e) => setValue("ind_pepSelfDetails", e.target.value)}
                onBlur={() => touch("pepDetails")}
                placeholder="Describe your position or relationship to a PEP"
                rows={2}
                className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f] ${
                  (touched.pepDetails || showValidationErrors) && !pepDetails.trim()
                    ? "border-red-500/40"
                    : "border-neutral-800"
                }`}
              />
              {(touched.pepDetails || showValidationErrors) && !pepDetails.trim() && (
                <p className="mt-1 text-xs text-red-400">Please provide details.</p>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Sanctions Question */}
      <Section>
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-200">
            Are you subject to any sanctions or legal restrictions?
            {showValidationErrors && sanctionsSelf === undefined && <span className="text-red-400"> *</span>}
          </label>
          <p className="mb-3 text-[11px] text-neutral-500">
            This includes international sanctions lists (UN, EU, US, UK) or
            any travel bans, asset freezes, or legal restrictions.
          </p>
          <YesNoToggle
            value={sanctionsSelf === true ? 'yes' : sanctionsSelf === false ? 'no' : null}
            onChange={(v) => {
              setValue("ind_sanctionsSelf", v === 'yes');
              if (v === 'no') setValue("ind_sanctionsSelfDetails", "");
            }}
          />
          {sanctionsSelf === true && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={sanctionsDetails}
                onChange={(e) => setValue("ind_sanctionsSelfDetails", e.target.value)}
                onBlur={() => touch("sanctionsDetails")}
                placeholder="Describe the sanctions or restrictions"
                rows={2}
                className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f] ${
                  (touched.sanctionsDetails || showValidationErrors) && !sanctionsDetails.trim()
                    ? "border-red-500/40"
                    : "border-neutral-800"
                }`}
              />
              {(touched.sanctionsDetails || showValidationErrors) && !sanctionsDetails.trim() && (
                <p className="mt-1 text-xs text-red-400">Please provide details.</p>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Third Party Question */}
      <Section>
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-200">
            Will you be acting on behalf of a third party?
            {showValidationErrors && thirdPartyUse === undefined && <span className="text-red-400"> *</span>}
          </label>
          <p className="mb-3 text-[11px] text-neutral-500">
            This means transacting on behalf of another person or entity,
            rather than for your own account.
          </p>
          <YesNoToggle
            value={thirdPartyUse === true ? 'yes' : thirdPartyUse === false ? 'no' : null}
            onChange={(v) => {
              setValue("ind_thirdPartyUse", v === 'yes');
              if (v === 'no') setValue("ind_thirdPartyUseDetails", "");
            }}
          />
          {thirdPartyUse === true && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={thirdPartyDetails}
                onChange={(e) => setValue("ind_thirdPartyUseDetails", e.target.value)}
                onBlur={() => touch("thirdPartyDetails")}
                placeholder="Describe who you will be acting on behalf of"
                rows={2}
                className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f] ${
                  (touched.thirdPartyDetails || showValidationErrors) && !thirdPartyDetails.trim()
                    ? "border-red-500/40"
                    : "border-neutral-800"
                }`}
              />
              {(touched.thirdPartyDetails || showValidationErrors) && !thirdPartyDetails.trim() && (
                <p className="mt-1 text-xs text-red-400">Please provide details.</p>
              )}
            </div>
          )}
        </div>
      </Section>
    </div>
  );
};

export default RiskDeclarationsStep;
