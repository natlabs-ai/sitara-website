// src/app/onboarding/steps/RiskDeclarationsStep.tsx

"use client";

import React from "react";
import { Section } from "@/components/ui";

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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setValue("ind_pepSelf", false);
                setValue("ind_pepSelfDetails", "");
              }}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                pepSelf === false
                  ? "border-[#bfa76f] bg-[#bfa76f1a] text-[#f5e9c0]"
                  : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55"
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setValue("ind_pepSelf", true)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                pepSelf === true
                  ? "border-[#bfa76f] bg-[#bfa76f1a] text-[#f5e9c0]"
                  : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55"
              }`}
            >
              Yes
            </button>
          </div>
          {pepSelf === true && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={pepDetails}
                onChange={(e) =>
                  setValue("ind_pepSelfDetails", e.target.value)
                }
                placeholder="Describe your position or relationship to a PEP"
                rows={2}
                className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
              />
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setValue("ind_sanctionsSelf", false);
                setValue("ind_sanctionsSelfDetails", "");
              }}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                sanctionsSelf === false
                  ? "border-[#bfa76f] bg-[#bfa76f1a] text-[#f5e9c0]"
                  : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55"
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setValue("ind_sanctionsSelf", true)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                sanctionsSelf === true
                  ? "border-[#bfa76f] bg-[#bfa76f1a] text-[#f5e9c0]"
                  : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55"
              }`}
            >
              Yes
            </button>
          </div>
          {sanctionsSelf === true && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={sanctionsDetails}
                onChange={(e) =>
                  setValue("ind_sanctionsSelfDetails", e.target.value)
                }
                placeholder="Describe the sanctions or restrictions"
                rows={2}
                className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
              />
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
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setValue("ind_thirdPartyUse", false);
                setValue("ind_thirdPartyUseDetails", "");
              }}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                thirdPartyUse === false
                  ? "border-[#bfa76f] bg-[#bfa76f1a] text-[#f5e9c0]"
                  : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55"
              }`}
            >
              No
            </button>
            <button
              type="button"
              onClick={() => setValue("ind_thirdPartyUse", true)}
              className={`rounded-xl border px-4 py-2 text-sm transition ${
                thirdPartyUse === true
                  ? "border-[#bfa76f] bg-[#bfa76f1a] text-[#f5e9c0]"
                  : "border-neutral-800 bg-black/40 text-neutral-200 hover:bg-black/55"
              }`}
            >
              Yes
            </button>
          </div>
          {thirdPartyUse === true && (
            <div className="mt-3">
              <label className="mb-1 block text-xs font-medium text-neutral-200">
                Please provide details
              </label>
              <textarea
                value={thirdPartyDetails}
                onChange={(e) =>
                  setValue("ind_thirdPartyUseDetails", e.target.value)
                }
                placeholder="Describe who you will be acting on behalf of"
                rows={2}
                className="w-full rounded-xl border border-neutral-800 bg-black/70 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
              />
            </div>
          )}
        </div>
      </Section>
    </div>
  );
};

export default RiskDeclarationsStep;
