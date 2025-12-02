// src/app/onboarding/steps/IdentityStep.tsx
"use client";

import React from "react";
import {
  IdDocumentUploader,
  type IdAutoFill,
  type IdExtractStatus,
} from "@/components/IdDocumentUploader";
import { ProofOfAddressUploader } from "@/components/ProofOfAddressUploader";
import type { IdExtracted } from "@/types/IdExtracted";
import { countries } from "@/data/countries";

interface IdentityStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}

export const IdentityStep: React.FC<IdentityStepProps> = ({
  answers,
  setValue,
}) => {
  // ---- Country selector (type-ahead) ----
  const [countryQuery, setCountryQuery] = React.useState(
    (answers.countryOfResidence as string) || "",
  );
  const [dropdownOpen, setDropdownOpen] = React.useState(false);

  const filteredCountries = React.useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries;
    return countries.filter((c) => c.name.toLowerCase().includes(q));
  }, [countryQuery]);

  const handleCountrySelect = (name: string) => {
    const wasUAE = answers.countryOfResidence === "United Arab Emirates";
    const willBeUAE = name === "United Arab Emirates";

    // If moving away from UAE, clear Emirates ID files
    if (wasUAE && !willBeUAE) {
      setValue("emiratesIdFront__files", null);
      setValue("emiratesIdFront", null);
      setValue("emiratesIdBack__files", null);
      setValue("emiratesIdBack", null);
    }

    setValue("countryOfResidence", name);
    setCountryQuery(name);
    setDropdownOpen(false);
  };

  const isUAE = answers.countryOfResidence === "United Arab Emirates";

  // ---- Simple file handler for Emirates ID ----
  const handleEidFileChange =
    (displayKey: string, filesKey: string) =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] ?? null;
      setValue(filesKey, file ? [file] : null);
      setValue(displayKey, file ? file.name : null);
    };

  const eidFrontName = answers.emiratesIdFront as string | undefined;
  const eidBackName = answers.emiratesIdBack as string | undefined;

  return (
    <div className="space-y-6">
      {/* 1. Country of Residence (new card) */}
      <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
        <h2 className="text-sm font-semibold text-neutral-100 mb-1">
          Country of Residence <span className="text-red-400">*</span>
        </h2>
        <p className="text-xs text-neutral-400 mb-3">
          Select the country where you currently live. This drives our AML / KYC
          checks and determines whether Emirates ID is required.
        </p>

        <div className="relative">
          <input
            type="text"
            value={countryQuery}
            onChange={(e) => {
              setCountryQuery(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            onBlur={() => {
              setTimeout(() => setDropdownOpen(false), 120);
            }}
            placeholder="Start typing to search…"
            className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
          />

          {dropdownOpen && (
            <div className="absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-xl border border-neutral-800 bg-black text-sm shadow-xl">
              {filteredCountries.length === 0 && (
                <div className="px-3 py-2 text-neutral-500">
                  No matches. Please check your spelling.
                </div>
              )}
              {filteredCountries.slice(0, 20).map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleCountrySelect(c.name)}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-neutral-900"
                >
                  <span>{c.name}</span>
                  {c.name === answers.countryOfResidence && (
                    <span className="text-[10px] text-[#bfa76f]">
                      selected
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 2. Passport / ID – uploader */}
      <IdDocumentUploader
        tenantId={answers.koraTenantId}
        applicationId={answers.koraApplicationId}
        applicantId={answers.koraApplicantId}
        onStatusChange={(status: IdExtractStatus) => {
          setValue("idExtractStatus", status);
        }}
        onExtracted={(payload: IdExtracted) => {
          setValue("idExtractPrimary", payload);
        }}
        onAutoFill={(auto: IdAutoFill) => {
          if (auto.fullName) setValue("fullName", auto.fullName);
          if (auto.nationality) setValue("nationality", auto.nationality);
          if (auto.dateOfBirth) setValue("dateOfBirth", auto.dateOfBirth);
        }}
      />

      {/* 3. Emirates ID – conditional card for UAE only */}
      {isUAE && (
        <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-neutral-100">
            Emirates ID (UAE residents) <span className="text-red-400">*</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Upload clear images of the front and back of your Emirates ID. This
            is required for UAE residents under local KYC rules. Files will be
            uploaded securely when you click{" "}
            <span className="font-medium text-neutral-200">Next</span>.
          </p>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs text-neutral-300">Front</span>
                {eidFrontName && (
                  <span className="text-[11px] text-neutral-400 italic">
                    {eidFrontName}
                  </span>
                )}
              </div>
              <label
                className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition
                  ${
                    eidFrontName
                      ? "border-emerald-500 bg-emerald-600/10 text-emerald-300"
                      : "border-neutral-800 bg-black/70 text-neutral-100 hover:border-[#bfa76f]"
                  }`}
              >
                <span>{eidFrontName ? "Selected" : "Choose File"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleEidFileChange(
                    "emiratesIdFront",
                    "emiratesIdFront__files",
                  )}
                />
              </label>
            </div>

            <div>
              <div className="flex items-center justify-between gap-3 mb-1">
                <span className="text-xs text-neutral-300">Back</span>
                {eidBackName && (
                  <span className="text-[11px] text-neutral-400 italic">
                    {eidBackName}
                  </span>
                )}
              </div>
              <label
                className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition
                  ${
                    eidBackName
                      ? "border-emerald-500 bg-emerald-600/10 text-emerald-300"
                      : "border-neutral-800 bg-black/70 text-neutral-100 hover:border-[#bfa76f]"
                  }`}
              >
                <span>{eidBackName ? "Selected" : "Choose File"}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={handleEidFileChange(
                    "emiratesIdBack",
                    "emiratesIdBack__files",
                  )}
                />
              </label>
            </div>
          </div>
        </section>
      )}

      {/* 4. Proof of Address – uploader */}
      <ProofOfAddressUploader
        tenantId={answers.koraTenantId}
        applicationId={answers.koraApplicationId}
        applicantId={answers.koraApplicantId}
        onUploaded={(doc) => {
          setValue("proofOfAddressDocId", doc.id);
          setValue(
            "proofOfAddressStatus",
            (doc.verified_status as string) ?? "pending",
          );
          if (doc.original_file_name) {
            setValue("proofOfAddressDisplayName", doc.original_file_name);
          }
        }}
      />
    </div>
  );
};

export default IdentityStep;
