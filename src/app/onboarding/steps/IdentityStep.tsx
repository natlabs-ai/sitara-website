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

import { GoldCombobox } from "@/components/GoldCombobox";

interface IdentityStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}

export const IdentityStep: React.FC<IdentityStepProps> = ({
  answers,
  setValue,
}) => {
  // ---- Country selector (GoldCombobox) ----
  const countryOptions = React.useMemo(
    () => countries.map((c) => ({ value: c.name, label: c.name })),
    [],
  );

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
  };

  const isUAE = answers.countryOfResidence === "United Arab Emirates";

  // PoA rule: ONLY personal accounts see PoA here
  const showProofOfAddress = answers.accountType !== "business";

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
      {/* 1. Country of Residence (GoldCombobox) */}
      <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
        <GoldCombobox
          label="Country of Residence"
          required
          value={String(answers.countryOfResidence ?? "")}
          onChange={(v) => handleCountrySelect(v)}
          options={countryOptions}
          placeholder="Start typing to search…"
          emptyText="No matches. Please check your spelling."
        />

        <p className="mt-2 text-xs text-neutral-400">
          Select the country where you currently live. This drives our AML / KYC
          checks and determines whether Emirates ID is required.
        </p>
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
        onUploaded={(r) => {
          // Support both response shapes (new: savedDocumentId, old: savedPassportId)
          const docId = r?.savedDocumentId ?? r?.savedPassportId ?? null;

          if (docId) {
            // Store as string for consistent downstream checks
            setValue("passportDocId", String(docId));
          }

          // Optional evidence/debug fields
          if (r?.storage?.url) setValue("passportDocUrl", r.storage.url);
          if (r?.storage?.container)
            setValue("passportBlobContainer", r.storage.container);
          if (r?.storage?.blobName)
            setValue("passportBlobName", r.storage.blobName);
        }}
      />

      {/* 2b. Documents received (local, simple status) */}
      <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
        <h2 className="text-sm font-semibold text-neutral-100">
          Documents received
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          This reflects what we have successfully received from you during onboarding.
        </p>

        <div className="mt-4 space-y-2 text-sm">
          {/* Passport */}
          <div className="flex items-center justify-between gap-4">
            <span className="text-neutral-200">Passport / ID</span>
            {answers.passportDocId ? (
              <span className="inline-flex items-center gap-2 text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Received
              </span>
            ) : (
              <span className="inline-flex items-center gap-2 text-neutral-400">
                <span className="h-2 w-2 rounded-full bg-neutral-600" />
                Not received yet
              </span>
            )}
          </div>

          {/* Proof of Address (personal only) */}
          {showProofOfAddress && (
            <div className="flex items-center justify-between gap-4">
              <span className="text-neutral-200">Proof of address</span>
              {answers.proofOfAddressDocId ? (
                <span className="inline-flex items-center gap-2 text-emerald-300">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  Received
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 text-neutral-400">
                  <span className="h-2 w-2 rounded-full bg-neutral-600" />
                  Not received yet
                </span>
              )}
            </div>
          )}

          {/* Emirates ID (UAE only — this is “selected”, not uploaded yet, based on your UX copy) */}
          {isUAE && (
            <>
              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-200">Emirates ID (front)</span>
                {eidFrontName ? (
                  <span className="inline-flex items-center gap-2 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-neutral-400">
                    <span className="h-2 w-2 rounded-full bg-neutral-600" />
                    Not selected yet
                  </span>
                )}
              </div>

              <div className="flex items-center justify-between gap-4">
                <span className="text-neutral-200">Emirates ID (back)</span>
                {eidBackName ? (
                  <span className="inline-flex items-center gap-2 text-emerald-300">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    Selected
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 text-neutral-400">
                    <span className="h-2 w-2 rounded-full bg-neutral-600" />
                    Not selected yet
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Optional: show link if you store it */}
        {answers.passportDocUrl && (
          <p className="mt-3 text-xs text-neutral-400 break-all">
            Stored reference: {String(answers.passportDocUrl)}
          </p>
        )}
      </section>


      {/* 3. Emirates ID – conditional card for UAE only */}
      {isUAE && (
        <section className="space-y-4 rounded-2xl border border-neutral-800 bg-black/30 p-5">
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
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-xs text-neutral-300">Front</span>
                {eidFrontName && (
                  <span className="text-[11px] italic text-neutral-400">
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
              <div className="mb-1 flex items-center justify-between gap-3">
                <span className="text-xs text-neutral-300">Back</span>
                {eidBackName && (
                  <span className="text-[11px] italic text-neutral-400">
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

      {/* 4. Proof of Address – ONLY for personal accounts */}
      {showProofOfAddress && (
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
      )}
    </div>
  );
};

export default IdentityStep;
