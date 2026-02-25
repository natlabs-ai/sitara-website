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
import { Modal, Section, Button, FormField, Input, DocumentUploadControl, type DocumentUploadStatus } from "@/components/ui";

/** Shape of confirmed identity fields (user-edited) */
export interface ConfirmedIdentityFields {
  givenName: string;
  familyName: string;
  dateOfBirth: string;
  nationality: string;
  passportNumber: string;
  confirmedAt: string; // ISO timestamp
}

/** Shape of extracted identity fields (raw DI output) */
export interface ExtractedIdentityFields {
  givenName: string | null;
  familyName: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  passportNumber: string | null;
}

interface IdentityStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  /** Whether to show validation errors (set after Next is clicked) */
  showValidationErrors?: boolean;
}

export const IdentityStep: React.FC<IdentityStepProps> = ({
  answers,
  setValue,
  showValidationErrors = false,
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

  // ---- Validation state ----
  const hasCountry = !!answers.countryOfResidence;
  const hasPassportDoc = !!answers.passportDocId || !!answers.identityDocId || !!answers.idDocumentDocId;
  const hasEidFront = Array.isArray(answers.emiratesIdFront__files) && answers.emiratesIdFront__files.length > 0;
  const hasEidBack = Array.isArray(answers.emiratesIdBack__files) && answers.emiratesIdBack__files.length > 0;
  const hasPoA = !showProofOfAddress || !!answers.proofOfAddressDocId;

  // Field-level error checks (only shown when showValidationErrors is true)
  const countryError = showValidationErrors && !hasCountry ? "This field is required." : undefined;
  const passportError = showValidationErrors && !hasPassportDoc ? "This field is required." : undefined;
  const eidFrontError = showValidationErrors && isUAE && !hasEidFront ? "This field is required." : undefined;
  const eidBackError = showValidationErrors && isUAE && !hasEidBack ? "This field is required." : undefined;
  const poaError = showValidationErrors && showProofOfAddress && !hasPoA ? "This field is required." : undefined;

  // ---- Emirates ID state management ----
  const [eidFrontStatus, setEidFrontStatus] = React.useState<DocumentUploadStatus>(
    answers.emiratesIdFront ? "success" : "idle"
  );
  const [eidBackStatus, setEidBackStatus] = React.useState<DocumentUploadStatus>(
    answers.emiratesIdBack ? "success" : "idle"
  );

  // Update status when answers change (e.g., resuming flow)
  React.useEffect(() => {
    setEidFrontStatus(answers.emiratesIdFront ? "success" : "idle");
  }, [answers.emiratesIdFront]);

  React.useEffect(() => {
    setEidBackStatus(answers.emiratesIdBack ? "success" : "idle");
  }, [answers.emiratesIdBack]);

  const handleEidFrontSelect = (file: File) => {
    setValue("emiratesIdFront__files", [file]);
    setValue("emiratesIdFront", file.name);
    setEidFrontStatus("success");
  };

  const handleEidBackSelect = (file: File) => {
    setValue("emiratesIdBack__files", [file]);
    setValue("emiratesIdBack", file.name);
    setEidBackStatus("success");
  };

  const eidFrontName = answers.emiratesIdFront as string | undefined;
  const eidBackName = answers.emiratesIdBack as string | undefined;

  // ---- Extracted ID modal state ----
  const [idDetailsOpen, setIdDetailsOpen] = React.useState(false);
  const didAutoOpenRef = React.useRef(false);
  const [modalValidationTriggered, setModalValidationTriggered] = React.useState(false);

  const extracted = (answers.idExtractPrimary as IdExtracted | undefined) ?? undefined;

  // Parse raw DI extraction into normalized fields
  const extractedFields = React.useMemo((): ExtractedIdentityFields | null => {
    if (!extracted) return null;
    const x: any = extracted;

    const givenName =
      x.givenName ?? x.given_name ?? x.firstName ?? x.first_name ?? null;
    const familyName =
      x.familyName ?? x.family_name ?? x.lastName ?? x.last_name ?? null;
    const dob = x.dateOfBirth ?? x.date_of_birth ?? x.dob ?? null;

    const nationality =
      x.nationality ??
      x.nationalityName ??
      x.nationality_name ??
      x.nationalityCode ??
      x.nationality_code ??
      null;

    const passportNumber =
      x.documentNumber ??
      x.document_number ??
      x.passportNumber ??
      x.passport_number ??
      x.idNumber ??
      x.id_number ??
      null;

    return { givenName, familyName, dateOfBirth: dob, nationality, passportNumber };
  }, [extracted]);

  // Editable form draft state (initialized from extractedFields when modal opens)
  const [formDraft, setFormDraft] = React.useState<{
    givenName: string;
    familyName: string;
    dateOfBirth: string;
    nationality: string;
    passportNumber: string;
  }>({
    givenName: "",
    familyName: "",
    dateOfBirth: "",
    nationality: "",
    passportNumber: "",
  });

  // Update form draft when extracted fields change (new extraction)
  React.useEffect(() => {
    if (extractedFields) {
      setFormDraft({
        givenName: extractedFields.givenName ?? "",
        familyName: extractedFields.familyName ?? "",
        dateOfBirth: extractedFields.dateOfBirth ?? "",
        nationality: extractedFields.nationality ?? "",
        passportNumber: extractedFields.passportNumber ?? "",
      });
      setModalValidationTriggered(false);
    }
  }, [extractedFields]);

  // Auto-open the modal once after a successful extraction (prevents repeated opens)
  React.useEffect(() => {
    const status = answers.idExtractStatus as IdExtractStatus | undefined;
    if (status === "success" && extractedFields && !didAutoOpenRef.current) {
      didAutoOpenRef.current = true;
      setIdDetailsOpen(true);
    }
  }, [answers.idExtractStatus, extractedFields]);

  // Validation helpers
  const isValidDate = (dateStr: string): boolean => {
    if (!dateStr) return false;
    // Check YYYY-MM-DD format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
    const date = new Date(dateStr);
    return !isNaN(date.getTime());
  };

  const getFieldErrors = () => {
    const errors: Record<string, string> = {};
    if (!formDraft.givenName.trim()) errors.givenName = "Given name is required";
    if (!formDraft.familyName.trim()) errors.familyName = "Family name is required";
    if (!formDraft.dateOfBirth.trim()) {
      errors.dateOfBirth = "Date of birth is required";
    } else if (!isValidDate(formDraft.dateOfBirth)) {
      errors.dateOfBirth = "Please enter a valid date (YYYY-MM-DD)";
    }
    if (!formDraft.nationality.trim()) errors.nationality = "Nationality is required";
    if (!formDraft.passportNumber.trim()) errors.passportNumber = "Document number is required";
    return errors;
  };

  const fieldErrors = modalValidationTriggered ? getFieldErrors() : {};

  // Refs for focusing first invalid field
  const givenNameRef = React.useRef<HTMLInputElement>(null);
  const familyNameRef = React.useRef<HTMLInputElement>(null);
  const dobRef = React.useRef<HTMLInputElement>(null);
  const passportRef = React.useRef<HTMLInputElement>(null);

  const focusFirstError = () => {
    const errors = getFieldErrors();
    if (errors.givenName && givenNameRef.current) {
      givenNameRef.current.focus();
    } else if (errors.familyName && familyNameRef.current) {
      familyNameRef.current.focus();
    } else if (errors.dateOfBirth && dobRef.current) {
      dobRef.current.focus();
    } else if (errors.nationality) {
      // GoldCombobox doesn't expose ref, so we skip focus for nationality
    } else if (errors.passportNumber && passportRef.current) {
      passportRef.current.focus();
    }
  };

  // Handle Continue click with validation
  const handleConfirmIdentity = () => {
    setModalValidationTriggered(true);
    const errors = getFieldErrors();

    if (Object.keys(errors).length > 0) {
      // Focus first invalid field
      setTimeout(focusFirstError, 0);
      return;
    }

    // Build confirmed fields payload
    const confirmedFields: ConfirmedIdentityFields = {
      givenName: formDraft.givenName.trim(),
      familyName: formDraft.familyName.trim(),
      dateOfBirth: formDraft.dateOfBirth.trim(),
      nationality: formDraft.nationality.trim(),
      passportNumber: formDraft.passportNumber.trim(),
      confirmedAt: new Date().toISOString(),
    };

    // Store both original DI extracted values and confirmed values
    setValue("idExtractedFields", extractedFields);
    setValue("idConfirmedFields", confirmedFields);

    // Also update the canonical identity values used downstream
    const fullName = `${confirmedFields.givenName} ${confirmedFields.familyName}`.trim();
    setValue("fullName", fullName);
    setValue("nationality", confirmedFields.nationality);
    setValue("dateOfBirth", confirmedFields.dateOfBirth);
    setValue("passportNumber", confirmedFields.passportNumber);

    // Close modal
    setIdDetailsOpen(false);
    setModalValidationTriggered(false);
  };

  // Handle modal close - persist draft immediately (silent save)
  const handleModalClose = () => {
    // Persist current draft state even if user closes without clicking Continue
    // This prevents losing edits if user accidentally closes
    if (extractedFields) {
      // Only save draft if there's something to save
      setValue("idDraftFields", { ...formDraft, savedAt: new Date().toISOString() });
    }
    setIdDetailsOpen(false);
    setModalValidationTriggered(false);
  };

  // Restore draft when modal opens (if previously saved)
  React.useEffect(() => {
    if (idDetailsOpen && answers.idDraftFields) {
      const draft = answers.idDraftFields as typeof formDraft;
      setFormDraft({
        givenName: draft.givenName ?? formDraft.givenName,
        familyName: draft.familyName ?? formDraft.familyName,
        dateOfBirth: draft.dateOfBirth ?? formDraft.dateOfBirth,
        nationality: draft.nationality ?? formDraft.nationality,
        passportNumber: draft.passportNumber ?? formDraft.passportNumber,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idDetailsOpen]);

  return (
    <div className="space-y-6">
      {/* ID Extracted Details Modal (editable) */}
      <Modal
        open={idDetailsOpen && !!extractedFields}
        onClose={handleModalClose}
        title="Identity details extracted"
        size="md"
        footer={
          <Button variant="primary" onClick={handleConfirmIdentity}>
            Continue
          </Button>
        }
      >
        <p className="mb-4 text-xs text-neutral-400">
          Please confirm these details match your document. Edit anything that looks incorrect to continue.
        </p>

        <div className="space-y-4">
          {/* Given Name */}
          <FormField
            label="Given name"
            required
            error={fieldErrors.givenName}
            showError={modalValidationTriggered}
            htmlFor="id-given-name"
          >
            <input
              ref={givenNameRef}
              id="id-given-name"
              type="text"
              value={formDraft.givenName}
              onChange={(e) => setFormDraft((prev) => ({ ...prev, givenName: e.target.value }))}
              placeholder="Enter given name"
              className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:border-[#bfa76f] focus:ring-[#bfa76f] transition ${
                modalValidationTriggered && fieldErrors.givenName ? "border-red-500/40" : "border-neutral-800"
              }`}
            />
          </FormField>

          {/* Family Name */}
          <FormField
            label="Family name"
            required
            error={fieldErrors.familyName}
            showError={modalValidationTriggered}
            htmlFor="id-family-name"
          >
            <input
              ref={familyNameRef}
              id="id-family-name"
              type="text"
              value={formDraft.familyName}
              onChange={(e) => setFormDraft((prev) => ({ ...prev, familyName: e.target.value }))}
              placeholder="Enter family name"
              className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:border-[#bfa76f] focus:ring-[#bfa76f] transition ${
                modalValidationTriggered && fieldErrors.familyName ? "border-red-500/40" : "border-neutral-800"
              }`}
            />
          </FormField>

          {/* Date of Birth */}
          <FormField
            label="Date of birth"
            required
            error={fieldErrors.dateOfBirth}
            showError={modalValidationTriggered}
            htmlFor="id-dob"
          >
            <input
              ref={dobRef}
              id="id-dob"
              type="date"
              value={formDraft.dateOfBirth}
              onChange={(e) => setFormDraft((prev) => ({ ...prev, dateOfBirth: e.target.value }))}
              className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:border-[#bfa76f] focus:ring-[#bfa76f] transition ${
                modalValidationTriggered && fieldErrors.dateOfBirth ? "border-red-500/40" : "border-neutral-800"
              }`}
            />
          </FormField>

          {/* Nationality */}
          <FormField
            label="Nationality"
            required
            error={fieldErrors.nationality}
            showError={modalValidationTriggered}
            htmlFor="id-nationality"
          >
            <input
              id="id-nationality"
              type="text"
              value={formDraft.nationality}
              onChange={(e) => setFormDraft((prev) => ({ ...prev, nationality: e.target.value }))}
              placeholder="Enter nationality"
              className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:border-[#bfa76f] focus:ring-[#bfa76f] transition ${
                modalValidationTriggered && fieldErrors.nationality ? "border-red-500/40" : "border-neutral-800"
              }`}
            />
          </FormField>

          {/* Passport / Document Number */}
          <FormField
            label="Passport / document number"
            required
            error={fieldErrors.passportNumber}
            showError={modalValidationTriggered}
            htmlFor="id-passport-number"
          >
            <input
              ref={passportRef}
              id="id-passport-number"
              type="text"
              value={formDraft.passportNumber}
              onChange={(e) => setFormDraft((prev) => ({ ...prev, passportNumber: e.target.value }))}
              placeholder="Enter document number"
              className={`w-full rounded-lg border bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:border-[#bfa76f] focus:ring-[#bfa76f] transition ${
                modalValidationTriggered && fieldErrors.passportNumber ? "border-red-500/40" : "border-neutral-800"
              }`}
            />
          </FormField>
        </div>
      </Modal>

      {/* 1. Country of Residence (GoldCombobox) */}
      <GoldCombobox
        label="Country of Residence"
        required
        showError={!!countryError}
        error={countryError}
        value={String(answers.countryOfResidence ?? "")}
        onChange={(v) => handleCountrySelect(v)}
        options={countryOptions}
        placeholder="Start typing to search…"
        emptyText="No matches. Please check your spelling."
      />

      {/* 2. Passport / ID – uploader */}
      <IdDocumentUploader
        tenantId={answers.koraTenantId}
        applicationId={answers.koraApplicationId}
        applicantId={answers.koraApplicantId}
        showValidationErrors={showValidationErrors}
        hasError={!!passportError}
        initialStatus={answers.passportDocId ? "success" : "idle"}
        initialFileName={answers.passportDocFileName as string | null}
        onStatusChange={(status: IdExtractStatus) => {
          setValue("idExtractStatus", status);
          // allow modal to auto-open again if user re-uploads a new file in the same session
          if (status === "processing" || status === "idle") {
            didAutoOpenRef.current = false;
          }
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

          // Store filename for display when resuming
          if (r?.fileName) setValue("passportDocFileName", r.fileName);

          // Optional evidence/debug fields
          if (r?.storage?.url) setValue("passportDocUrl", r.storage.url);
          if (r?.storage?.container)
            setValue("passportBlobContainer", r.storage.container);
          if (r?.storage?.blobName)
            setValue("passportBlobName", r.storage.blobName);
        }}
        onRemove={() => {
          // Clear all ID document related data
          setValue("passportDocId", null);
          setValue("passportDocUrl", null);
          setValue("passportBlobContainer", null);
          setValue("passportBlobName", null);
          setValue("passportDocFileName", null);
          setValue("idExtractStatus", "idle");
          setValue("idExtractPrimary", null);
          setValue("idExtractedFields", null);
          setValue("idConfirmedFields", null);
          setValue("idDraftFields", null);
          // Clear confirmed identity values
          setValue("fullName", null);
          setValue("nationality", null);
          setValue("dateOfBirth", null);
          setValue("passportNumber", null);
          // Allow modal to auto-open again for new upload
          didAutoOpenRef.current = false;
        }}
      />

      {/* 3. Emirates ID – conditional card for UAE only */}
      {isUAE && (
        <Section>
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-neutral-100">
              Emirates ID (UAE residents)
              {(eidFrontError || eidBackError) && <span className="text-red-400"> *</span>}
            </h2>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className={`mb-2 block text-xs ${eidFrontError ? 'text-red-400' : 'text-neutral-300'}`}>
                  Front{eidFrontError && ' *'}
                </span>
                <DocumentUploadControl
                  status={eidFrontStatus}
                  onFileSelect={handleEidFrontSelect}
                  onRemove={() => {
                    setValue("emiratesIdFront__files", null);
                    setValue("emiratesIdFront", null);
                    setEidFrontStatus("idle");
                  }}
                  accept="image/*,application/pdf"
                  maxSizeMB={10}
                  fileName={eidFrontStatus === "success" ? eidFrontName : undefined}
                />
                {eidFrontError && (
                  <p className="mt-1 text-xs text-red-400">{eidFrontError}</p>
                )}
              </div>

              <div>
                <span className={`mb-2 block text-xs ${eidBackError ? 'text-red-400' : 'text-neutral-300'}`}>
                  Back{eidBackError && ' *'}
                </span>
                <DocumentUploadControl
                  status={eidBackStatus}
                  onFileSelect={handleEidBackSelect}
                  onRemove={() => {
                    setValue("emiratesIdBack__files", null);
                    setValue("emiratesIdBack", null);
                    setEidBackStatus("idle");
                  }}
                  accept="image/*,application/pdf"
                  maxSizeMB={10}
                  fileName={eidBackStatus === "success" ? eidBackName : undefined}
                />
                {eidBackError && (
                  <p className="mt-1 text-xs text-red-400">{eidBackError}</p>
                )}
              </div>
            </div>
          </div>
        </Section>
      )}

      {/* 4. Proof of Address – ONLY for personal accounts */}
      {showProofOfAddress && (
        <ProofOfAddressUploader
          tenantId={answers.koraTenantId}
          applicationId={answers.koraApplicationId}
          applicantId={answers.koraApplicantId}
          showValidationErrors={showValidationErrors}
          hasError={!!poaError}
          initialStatus={answers.proofOfAddressDocId ? "success" : "idle"}
          initialFileName={answers.proofOfAddressDisplayName as string | null}
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
          onRemove={() => {
            setValue("proofOfAddressDocId", null);
            setValue("proofOfAddressStatus", null);
            setValue("proofOfAddressDisplayName", null);
          }}
        />
      )}
    </div>
  );
};

export default IdentityStep;
