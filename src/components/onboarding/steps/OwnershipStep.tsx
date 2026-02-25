// src/app/onboarding/steps/OwnershipStep.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { countries } from "@/data/countries";
import { GoldCombobox } from "@/components/GoldCombobox";
import {
  type BeneficialOwner,
  type BeneficialOwnerCreatePayload,
  type BeneficialOwnerPatchPayload,
  type OwnerType,
  createBeneficialOwner,
  listBeneficialOwners,
  updateBeneficialOwner,
  deleteBeneficialOwner,
  fetchEvidencePack,
  type EvidencePackResponse,
} from "@/lib/koraClient";
import { GOLD } from "../onboardingShared";
import {
  Modal,
  Section,
  FormField,
  Input,
  Textarea,
  Select,
  Button,
  Alert,
  DocumentUploadControl,
  type DocumentUploadStatus,
} from "@/components/ui";

interface OwnershipStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  isResuming?: boolean;
  showValidationErrors?: boolean;
}

type LocalOwnerDraft = {
  id?: string; // Backend ID if saved, temp ID if new
  owner_type: OwnerType | "";
  ownership_percentage: number | "";

  // Individual fields
  individual_full_name: string;
  individual_nationality: string;
  individual_date_of_birth: string; // YYYY-MM-DD
  individual_id_document_id: string | null;
  individual_address_document_id: string | null;

  // Entity fields
  entity_legal_name: string;
  entity_jurisdiction: string;
  entity_registration_number: string;
  entity_legal_form: string;
  entity_incorporation_date: string; // YYYY-MM-DD
  entity_legal_existence_document_id: string | null;
  entity_ownership_proof_document_id: string | null;

  // Common
  is_ubo: boolean;
  notes: string;

  // UI state
  isSaved: boolean;
  isEditing: boolean;
};

type DocRef = {
  id: string;
  name: string;
};

/** Helper to unwrap scalar values from extraction payloads */
function unwrapScalar(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("value" in v) return String((v as any).value ?? "");
    return "";
  }
  return String(v);
}

/** Helper to read v2 field from normalization */
function readV2Field(normalization: any, fieldKey: string): string {
  const fields = normalization?.fields;
  const node = fields?.[fieldKey];
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object") return unwrapScalar(node);
  return "";
}

/** Helper to convert date strings to YYYY-MM-DD */
function toInputDate(v: any): string {
  const s = unwrapScalar(v);
  if (!s) return "";
  // Already YYYY-MM-DD or ISO datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

/**
 * Document uploader for beneficial owner documents
 */
interface OwnerDocUploaderProps {
  fieldId: string;
  label: string;
  description?: string;
  category: string;
  tenantId?: string | null;
  applicationId?: string | null;
  applicantId?: string | null;
  onUploaded?: (args: { documentId: string; extracted?: any }) => void | Promise<void>;
}

const OwnerDocumentUploader: React.FC<OwnerDocUploaderProps> = ({
  fieldId: _fieldId,
  label,
  description,
  category,
  tenantId,
  applicationId,
  applicantId,
  onUploaded,
}) => {
  const [uploadStatus, setUploadStatus] = React.useState<DocumentUploadStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [uploadedDoc, setUploadedDoc] = React.useState<DocRef | null>(null);

  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploadStatus("uploading");

    try {
      const formData = new FormData();
      formData.append("file", file);

      if (tenantId) formData.append("tenant_id", tenantId);
      if (applicationId) formData.append("application_id", applicationId);
      if (applicantId) formData.append("applicant_id", applicantId);
      formData.append("category", category);

      // Use appropriate endpoint based on category type
      const endpoint = category.includes("owner_id_")
        ? "/api/kora/documents/id"
        : "/api/kora/documents/business";

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      const rawText = await res.text();
      let data: any = null;
      try {
        data = rawText ? JSON.parse(rawText) : null;
      } catch {
        data = { raw: rawText };
      }

      if (!res.ok) {
        const detail =
          data?.detail ||
          data?.error ||
          data?.raw ||
          "Upload failed. Please try again.";
        throw new Error(detail);
      }

      const docId: string | undefined =
        data?.id ?? data?.document_id ?? data?.document?.id ?? data?.documentId ?? data?.savedDocumentId;

      if (!docId) {
        throw new Error(
          "Upload succeeded but no document id was returned by the server.",
        );
      }

      setUploadedDoc({ id: String(docId), name: file.name });

      // Fetch extraction results via evidence pack
      if (applicationId) {
        try {
          const pack: EvidencePackResponse = await fetchEvidencePack(applicationId);
          const doc = (pack?.documents || []).find((d) => String(d.id) === String(docId));

          const extracted =
            (doc as any)?.extraction?.payload?.normalization ||
            (doc as any)?.extraction?.payload?.extracted_json?.normalization ||
            (doc as any)?.extraction?.payload?.extracted?.normalization ||
            (doc as any)?.extraction?.payload ||
            {};

          await onUploaded?.({ documentId: String(docId), extracted });
          setUploadStatus("success");
        } catch (extractErr) {
          console.warn("Extraction fetch failed, continuing without auto-fill", extractErr);
          await onUploaded?.({ documentId: String(docId) });
          setUploadStatus("success");
        }
      } else {
        await onUploaded?.({ documentId: String(docId) });
        setUploadStatus("success");
      }
    } catch (err: any) {
      console.error("Owner document upload failed", err);
      setUploadStatus("error");
      setError(
        err?.message || "Upload failed. Please try again.",
      );
    }
  };

  return (
    <div className="rounded-lg border border-neutral-800 bg-black/20 p-3">
      <FormField label={label} helperText={description}>
        <DocumentUploadControl
          status={uploadStatus}
          errorMessage={error}
          onFileSelect={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png"
          maxSizeMB={10}
          size="sm"
          fileName={uploadStatus === "success" ? uploadedDoc?.name : undefined}
        />
      </FormField>
    </div>
  );
};

/**
 * Modal for reviewing and editing owner details after document extraction
 */
function OwnerModal({
  open,
  owner,
  onClose,
  onSave,
  isSaving,
  tenantId,
  applicationId,
  applicantId,
}: {
  open: boolean;
  owner: LocalOwnerDraft | null;
  onClose: () => void;
  onSave: (updated: LocalOwnerDraft) => void | Promise<void>;
  isSaving: boolean;
  tenantId?: string;
  applicationId?: string;
  applicantId?: string;
}) {
  const [draft, setDraft] = React.useState<LocalOwnerDraft | null>(owner);
  const [extractionInfo, setExtractionInfo] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDraft(owner);
    setExtractionInfo(null);
  }, [owner]);

  if (!open || !draft) return null;

  const isIndividual = draft.owner_type === "individual";
  const isEntity =
    draft.owner_type === "company" ||
    draft.owner_type === "spv" ||
    draft.owner_type === "trust" ||
    draft.owner_type === "foundation" ||
    draft.owner_type === "other_entity";

  const countryOptions = countries.map((c) => ({
    value: c.name,
    label: c.name,
  }));

  // Document upload handlers
  const handleIndividualIdUploaded = async ({
    documentId,
    extracted,
  }: {
    documentId: string;
    extracted?: any;
  }) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, individual_id_document_id: documentId };
    });

    if (extracted) {
      // Extract from Azure DI response - check autoFill first, then extracted
      const autoFill = extracted.autoFill || {};
      const extractedData = extracted.extracted || {};

      const fullName =
        autoFill.fullName ||
        extractedData.fullName ||
        (extractedData.firstName && extractedData.lastName
          ? `${extractedData.firstName} ${extractedData.lastName}`.trim()
          : "") ||
        readV2Field(extracted, "full_name") ||
        unwrapScalar(extracted.fullName);

      const nationalityRaw =
        autoFill.nationality ||
        autoFill.nationalityCode ||
        extractedData.nationality ||
        extractedData.nationalityCode ||
        readV2Field(extracted, "nationality") ||
        unwrapScalar(extracted.nationality);

      // Map country code to full country name
      // Extraction may return 3-letter (LTU) or 2-letter (LT) codes
      let nationality = nationalityRaw;
      if (nationalityRaw) {
        // Try to find by 2-letter code first
        let countryMatch = countries.find(c => c.code === nationalityRaw);

        // If not found and it's a 3-letter code, try mapping common ones
        if (!countryMatch && nationalityRaw.length === 3) {
          const iso3ToIso2: Record<string, string> = {
            'LTU': 'LT', 'USA': 'US', 'GBR': 'GB', 'CAN': 'CA', 'AUS': 'AU',
            'DEU': 'DE', 'FRA': 'FR', 'ITA': 'IT', 'ESP': 'ES', 'NLD': 'NL',
            'BEL': 'BE', 'POL': 'PL', 'UKR': 'UA', 'ROU': 'RO', 'CZE': 'CZ',
            'GRC': 'GR', 'PRT': 'PT', 'SWE': 'SE', 'AUT': 'AT', 'CHE': 'CH',
            'DNK': 'DK', 'FIN': 'FI', 'NOR': 'NO', 'IRL': 'IE', 'BGR': 'BG',
            'HRV': 'HR', 'SVK': 'SK', 'SVN': 'SI', 'EST': 'EE', 'LVA': 'LV',
            'ARE': 'AE', 'SAU': 'SA', 'QAT': 'QA', 'KWT': 'KW', 'OMN': 'OM',
            'BHR': 'BH', 'JOR': 'JO', 'LBN': 'LB', 'EGY': 'EG', 'MAR': 'MA',
            'IND': 'IN', 'CHN': 'CN', 'JPN': 'JP', 'KOR': 'KR', 'SGP': 'SG',
            'MYS': 'MY', 'THA': 'TH', 'VNM': 'VN', 'PHL': 'PH', 'IDN': 'ID',
          };
          const iso2Code = iso3ToIso2[nationalityRaw.toUpperCase()];
          if (iso2Code) {
            countryMatch = countries.find(c => c.code === iso2Code);
          }
        }

        // Use full country name if found
        if (countryMatch) {
          nationality = countryMatch.name;
        }
      }

      const dob =
        toInputDate(autoFill.dateOfBirth) ||
        toInputDate(extractedData.dateOfBirth) ||
        toInputDate(readV2Field(extracted, "date_of_birth")) ||
        toInputDate(unwrapScalar(extracted.dateOfBirth));

      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          individual_full_name: fullName || prev.individual_full_name,
          individual_nationality: nationality || prev.individual_nationality,
          individual_date_of_birth: dob || prev.individual_date_of_birth,
        };
      });

      setExtractionInfo("Extracted name, nationality, and date of birth from document.");
    }
  };

  const handleIndividualAddressUploaded = async ({
    documentId,
  }: {
    documentId: string;
    extracted?: any;
  }) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, individual_address_document_id: documentId };
    });
  };

  const handleEntityLegalExistenceUploaded = async ({
    documentId,
    extracted,
  }: {
    documentId: string;
    extracted?: any;
  }) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, entity_legal_existence_document_id: documentId };
    });

    if (extracted) {
      console.log("Business license extraction data:", extracted);

      // Business license extraction uses fields.{field_name}.value structure
      const legalName =
        readV2Field(extracted, "legal_name") ||
        readV2Field(extracted, "company_name") ||
        readV2Field(extracted, "entity_name") ||
        unwrapScalar(extracted.legal_name) ||
        unwrapScalar(extracted.company_name);

      const jurisdictionRaw =
        readV2Field(extracted, "country_of_incorporation") ||
        readV2Field(extracted, "registration_jurisdiction") ||
        readV2Field(extracted, "jurisdiction") ||
        unwrapScalar(extracted.jurisdiction) ||
        unwrapScalar(extracted.country_of_incorporation);

      // Map jurisdiction country code to full name (similar to nationality)
      let jurisdiction = jurisdictionRaw;
      if (jurisdictionRaw && jurisdictionRaw.length <= 3) {
        let countryMatch = countries.find(c => c.code === jurisdictionRaw);
        if (!countryMatch && jurisdictionRaw.length === 3) {
          const iso3ToIso2: Record<string, string> = {
            'LTU': 'LT', 'USA': 'US', 'GBR': 'GB', 'CAN': 'CA', 'AUS': 'AU',
            'DEU': 'DE', 'FRA': 'FR', 'ITA': 'IT', 'ESP': 'ES', 'NLD': 'NL',
            'BEL': 'BE', 'POL': 'PL', 'UKR': 'UA', 'ROU': 'RO', 'CZE': 'CZ',
            'GRC': 'GR', 'PRT': 'PT', 'SWE': 'SE', 'AUT': 'AT', 'CHE': 'CH',
            'DNK': 'DK', 'FIN': 'FI', 'NOR': 'NO', 'IRL': 'IE', 'BGR': 'BG',
            'HRV': 'HR', 'SVK': 'SK', 'SVN': 'SI', 'EST': 'EE', 'LVA': 'LV',
            'ARE': 'AE', 'SAU': 'SA', 'QAT': 'QA', 'KWT': 'KW', 'OMN': 'OM',
            'BHR': 'BH', 'JOR': 'JO', 'LBN': 'LB', 'EGY': 'EG', 'MAR': 'MA',
            'IND': 'IN', 'CHN': 'CN', 'JPN': 'JP', 'KOR': 'KR', 'SGP': 'SG',
            'MYS': 'MY', 'THA': 'TH', 'VNM': 'VN', 'PHL': 'PH', 'IDN': 'ID',
          };
          const iso2Code = iso3ToIso2[jurisdictionRaw.toUpperCase()];
          if (iso2Code) {
            countryMatch = countries.find(c => c.code === iso2Code);
          }
        }
        if (countryMatch) {
          jurisdiction = countryMatch.name;
        }
      }

      const regNumber =
        readV2Field(extracted, "registration_number") ||
        readV2Field(extracted, "reg_no") ||
        readV2Field(extracted, "license_number") ||
        unwrapScalar(extracted.registration_number);

      const legalForm =
        readV2Field(extracted, "legal_form") ||
        unwrapScalar(extracted.legal_form);

      const incDate =
        toInputDate(readV2Field(extracted, "incorporation_date")) ||
        toInputDate(readV2Field(extracted, "license_issue_date")) ||
        toInputDate(unwrapScalar(extracted.incorporation_date));

      console.log("Extracted entity fields:", {
        legalName,
        jurisdiction,
        regNumber,
        legalForm,
        incDate
      });

      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          entity_legal_name: legalName || prev.entity_legal_name,
          entity_jurisdiction: jurisdiction || prev.entity_jurisdiction,
          entity_registration_number: regNumber || prev.entity_registration_number,
          entity_legal_form: legalForm || prev.entity_legal_form,
          entity_incorporation_date: incDate || prev.entity_incorporation_date,
        };
      });

      setExtractionInfo("Extracted legal name, jurisdiction, and registration details from document.");
    }
  };

  const handleEntityOwnershipProofUploaded = async ({
    documentId,
  }: {
    documentId: string;
    extracted?: any;
  }) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, entity_ownership_proof_document_id: documentId };
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={`${isIndividual ? "Individual Owner" : "Entity Owner"} Details`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() => onSave(draft)}
            loading={isSaving}
            disabled={isSaving}
          >
            Save Owner
          </Button>
        </>
      }
    >
      <div className="mb-4 text-xs text-neutral-400">
        Upload documents to auto-extract information, or enter details manually.
      </div>

      <div className="space-y-4">
        {/* Extraction feedback */}
        {extractionInfo && <Alert variant="success">{extractionInfo}</Alert>}

          {/* Owner type selection */}
        <FormField label="Owner Type" required htmlFor="owner_type">
          <Select
            id="owner_type"
            value={draft.owner_type}
            onChange={(value) => setDraft({ ...draft, owner_type: value as OwnerType })}
            options={[
              { value: "individual", label: "Individual" },
              { value: "company", label: "Company / Corporate" },
              { value: "spv", label: "SPV / Holding vehicle" },
              { value: "trust", label: "Trust" },
              { value: "foundation", label: "Foundation" },
              { value: "other_entity", label: "Other entity / association" },
            ]}
            placeholder="Select…"
          />
        </FormField>

          {/* Ownership percentage */}
        <div>
          <FormField
            label="Ownership Percentage (%)"
            required
            htmlFor="ownership_percentage"
            error={
              draft.ownership_percentage !== "" && Number(draft.ownership_percentage) < 25
                ? "Ownership must be 25% or more to qualify as a beneficial owner"
                : undefined
            }
          >
            <Input
              id="ownership_percentage"
              type="number"
              value={draft.ownership_percentage}
              onChange={(value) => {
                const numValue = value === "" ? "" : Number(value);
                const isUbo = typeof numValue === "number" && numValue >= 25;
                setDraft({
                  ...draft,
                  ownership_percentage: numValue,
                  is_ubo: isUbo,
                });
              }}
              placeholder="Must be 25% or more"
            />
          </FormField>
          {Number(draft.ownership_percentage || 0) >= 25 && (
            <p className="mt-1 text-xs text-emerald-300">
              ✓ Qualifies as UBO (Ultimate Beneficial Owner)
            </p>
          )}
        </div>

          {/* Individual fields */}
        {isIndividual && (
          <Section>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-4">
              Individual Information
            </div>

            {/* Document uploads for individuals */}
            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <OwnerDocumentUploader
                fieldId={`owner_${draft.id || "temp"}_id_doc`}
                label="Passport / ID Document"
                description="Upload to auto-extract name, nationality, and DOB"
                category={`owner_id_${draft.id || Date.now()}`}
                tenantId={tenantId}
                applicationId={applicationId}
                applicantId={applicantId}
                onUploaded={handleIndividualIdUploaded}
              />

              <OwnerDocumentUploader
                fieldId={`owner_${draft.id || "temp"}_address_doc`}
                label="Proof of Address"
                description="Bank statement, utility bill, or lease agreement"
                category={`owner_address_${draft.id || Date.now()}`}
                tenantId={tenantId}
                applicationId={applicationId}
                applicantId={applicantId}
                onUploaded={handleIndividualAddressUploaded}
              />
            </div>

            {/* Manual entry fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Full Name" required htmlFor="individual_full_name">
                <Input
                  id="individual_full_name"
                  value={draft.individual_full_name}
                  onChange={(value) =>
                    setDraft({ ...draft, individual_full_name: value })
                  }
                  placeholder="Extracted from ID or enter manually"
                />
              </FormField>

              <GoldCombobox
                label="Nationality"
                value={draft.individual_nationality}
                onChange={(v) => setDraft({ ...draft, individual_nationality: v })}
                options={countryOptions}
                placeholder="Select country..."
                emptyText="No matches found"
              />

              <FormField label="Date of Birth" htmlFor="individual_date_of_birth">
                <Input
                  id="individual_date_of_birth"
                  type="date"
                  value={draft.individual_date_of_birth}
                  onChange={(value) =>
                    setDraft({ ...draft, individual_date_of_birth: value })
                  }
                />
              </FormField>
            </div>
          </Section>
        )}

          {/* Entity fields */}
        {isEntity && (
          <Section>
            <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-4">
              Entity Information
            </div>

            {/* Document uploads for entities */}
            <div className="grid gap-3 md:grid-cols-2 mb-4">
              <OwnerDocumentUploader
                fieldId={`owner_${draft.id || "temp"}_legal_doc`}
                label="Legal Existence Document"
                description="Business license or certificate of incorporation"
                category={`owner_legal_existence_${draft.id || Date.now()}`}
                tenantId={tenantId}
                applicationId={applicationId}
                applicantId={applicantId}
                onUploaded={handleEntityLegalExistenceUploaded}
              />

              <OwnerDocumentUploader
                fieldId={`owner_${draft.id || "temp"}_ownership_doc`}
                label="Ownership Proof"
                description="Share certificate or ownership structure document"
                category={`owner_ownership_proof_${draft.id || Date.now()}`}
                tenantId={tenantId}
                applicationId={applicationId}
                applicantId={applicantId}
                onUploaded={handleEntityOwnershipProofUploaded}
              />
            </div>

            {/* Manual entry fields */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Legal Name" required htmlFor="entity_legal_name">
                <Input
                  id="entity_legal_name"
                  value={draft.entity_legal_name}
                  onChange={(value) =>
                    setDraft({ ...draft, entity_legal_name: value })
                  }
                  placeholder="Extracted from document or enter manually"
                />
              </FormField>

              <GoldCombobox
                label="Jurisdiction"
                value={draft.entity_jurisdiction}
                onChange={(v) => setDraft({ ...draft, entity_jurisdiction: v })}
                options={countryOptions}
                placeholder="Select country..."
                emptyText="No matches found"
              />

              <FormField label="Registration Number" htmlFor="entity_registration_number">
                <Input
                  id="entity_registration_number"
                  value={draft.entity_registration_number}
                  onChange={(value) =>
                    setDraft({ ...draft, entity_registration_number: value })
                  }
                />
              </FormField>

              <FormField label="Legal Form" htmlFor="entity_legal_form">
                <Input
                  id="entity_legal_form"
                  value={draft.entity_legal_form}
                  onChange={(value) =>
                    setDraft({ ...draft, entity_legal_form: value })
                  }
                  placeholder="e.g., LLC, Ltd, Corp"
                />
              </FormField>

              <FormField label="Incorporation Date" htmlFor="entity_incorporation_date">
                <Input
                  id="entity_incorporation_date"
                  type="date"
                  value={draft.entity_incorporation_date}
                  onChange={(value) =>
                    setDraft({ ...draft, entity_incorporation_date: value })
                  }
                />
              </FormField>
            </div>
          </Section>
        )}

          {/* Notes */}
        <FormField label="Notes (optional)" htmlFor="notes">
          <Textarea
            id="notes"
            value={draft.notes}
            onChange={(value) => setDraft({ ...draft, notes: value })}
            rows={2}
            placeholder="Any additional information..."
          />
        </FormField>
      </div>
    </Modal>
  );
}

/**
 * Main Ownership Step Component
 */
export function OwnershipStep({ answers, setValue, isResuming = false, showValidationErrors = false }: OwnershipStepProps) {
  const tenantId = answers.koraTenantId as string | undefined;
  const applicationId = answers.koraApplicationId as string | undefined;
  const applicantId = answers.koraApplicantId as string | undefined;

  const [owners, setOwners] = React.useState<BeneficialOwner[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal state
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalOwner, setModalOwner] = React.useState<LocalOwnerDraft | null>(null);
  const [modalSaving, setModalSaving] = React.useState(false);

  // Load existing beneficial owners ONLY when resuming an application
  React.useEffect(() => {
    // Skip loading on first create flow
    if (!isResuming || !applicationId) {
      setLoading(false);
      return;
    }

    listBeneficialOwners(applicationId, tenantId)
      .then((data) => {
        setOwners(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load beneficial owners:", err);
        setOwners([]);
        setLoading(false);
      });
  }, [applicationId, tenantId, isResuming]);

  // Create empty owner draft
  const createEmptyDraft = (ownerType: OwnerType | ""): LocalOwnerDraft => ({
    owner_type: ownerType,
    ownership_percentage: "",
    individual_full_name: "",
    individual_nationality: "",
    individual_date_of_birth: "",
    individual_id_document_id: null,
    individual_address_document_id: null,
    entity_legal_name: "",
    entity_jurisdiction: "",
    entity_registration_number: "",
    entity_legal_form: "",
    entity_incorporation_date: "",
    entity_legal_existence_document_id: null,
    entity_ownership_proof_document_id: null,
    is_ubo: false,
    notes: "",
    isSaved: false,
    isEditing: true,
  });

  // Add new owner
  const addOwner = () => {
    setModalOwner(createEmptyDraft(""));
    setModalOpen(true);
  };

  // Edit existing owner
  const editOwner = (owner: BeneficialOwner) => {
    const ownershipPct = owner.ownership_percentage || "";
    const autoUbo = typeof ownershipPct === "number" && ownershipPct >= 25;

    const draft: LocalOwnerDraft = {
      id: owner.id,
      owner_type: owner.owner_type,
      ownership_percentage: ownershipPct,
      individual_full_name: owner.individual_full_name || "",
      individual_nationality: owner.individual_nationality || "",
      individual_date_of_birth: owner.individual_date_of_birth || "",
      individual_id_document_id: owner.individual_id_document_id || null,
      individual_address_document_id: owner.individual_address_document_id || null,
      entity_legal_name: owner.entity_legal_name || "",
      entity_jurisdiction: owner.entity_jurisdiction || "",
      entity_registration_number: owner.entity_registration_number || "",
      entity_legal_form: owner.entity_legal_form || "",
      entity_incorporation_date: owner.entity_incorporation_date || "",
      entity_legal_existence_document_id: owner.entity_legal_existence_document_id || null,
      entity_ownership_proof_document_id: owner.entity_ownership_proof_document_id || null,
      is_ubo: autoUbo, // Auto-set based on ownership percentage
      notes: owner.notes || "",
      isSaved: true,
      isEditing: true,
    };
    setModalOwner(draft);
    setModalOpen(true);
  };

  // Save owner (create or update)
  const saveOwner = async (draft: LocalOwnerDraft) => {
    if (!tenantId || !applicationId) {
      alert("Missing tenant or application ID");
      return;
    }

    if (!draft.owner_type) {
      alert("Please select an owner type");
      return;
    }

    // Validate ownership percentage
    const ownershipPct = Number(draft.ownership_percentage);
    if (draft.ownership_percentage === "" || isNaN(ownershipPct)) {
      alert("Please enter an ownership percentage");
      return;
    }
    if (ownershipPct < 25) {
      alert("Ownership percentage must be at least 25% to qualify as a beneficial owner");
      return;
    }
    if (ownershipPct > 100) {
      alert("Ownership percentage cannot exceed 100%");
      return;
    }

    setModalSaving(true);
    setError(null);

    try {
      // Ensure UBO status is calculated correctly based on percentage
      const finalOwnershipPct = Number(draft.ownership_percentage);
      const finalIsUbo = finalOwnershipPct >= 25;

      if (draft.id && draft.isSaved) {
        // Update existing
        const patch: BeneficialOwnerPatchPayload = {
          owner_type: draft.owner_type,
          ownership_percentage: finalOwnershipPct,
          individual_full_name: draft.individual_full_name || null,
          individual_nationality: draft.individual_nationality || null,
          individual_date_of_birth: draft.individual_date_of_birth || null,
          individual_id_document_id: draft.individual_id_document_id,
          individual_address_document_id: draft.individual_address_document_id,
          entity_legal_name: draft.entity_legal_name || null,
          entity_jurisdiction: draft.entity_jurisdiction || null,
          entity_registration_number: draft.entity_registration_number || null,
          entity_legal_form: draft.entity_legal_form || null,
          entity_incorporation_date: draft.entity_incorporation_date || null,
          entity_legal_existence_document_id: draft.entity_legal_existence_document_id,
          entity_ownership_proof_document_id: draft.entity_ownership_proof_document_id,
          is_ubo: finalIsUbo, // Auto-calculated based on ownership percentage
          notes: draft.notes || null,
        };

        const updated = await updateBeneficialOwner(draft.id, patch);
        setOwners((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      } else {
        // Create new
        const payload: BeneficialOwnerCreatePayload = {
          tenant_id: tenantId,
          application_id: applicationId,
          owner_type: draft.owner_type,
          ownership_percentage: finalOwnershipPct,
          individual_full_name: draft.individual_full_name || null,
          individual_nationality: draft.individual_nationality || null,
          individual_date_of_birth: draft.individual_date_of_birth || null,
          individual_id_document_id: draft.individual_id_document_id,
          individual_address_document_id: draft.individual_address_document_id,
          entity_legal_name: draft.entity_legal_name || null,
          entity_jurisdiction: draft.entity_jurisdiction || null,
          entity_registration_number: draft.entity_registration_number || null,
          entity_legal_form: draft.entity_legal_form || null,
          entity_incorporation_date: draft.entity_incorporation_date || null,
          entity_legal_existence_document_id: draft.entity_legal_existence_document_id,
          entity_ownership_proof_document_id: draft.entity_ownership_proof_document_id,
          is_ubo: finalIsUbo, // Auto-calculated based on ownership percentage
          notes: draft.notes || null,
        };

        const created = await createBeneficialOwner(payload);
        setOwners((prev) => [...prev, created]);
      }

      setModalOpen(false);
      setModalOwner(null);
    } catch (err: any) {
      console.error("Failed to save beneficial owner", err);
      setError(err?.message || "Failed to save owner");
    } finally {
      setModalSaving(false);
    }
  };

  // Delete owner
  const removeOwner = async (id: string) => {
    if (!confirm("Are you sure you want to remove this owner?")) return;

    try {
      await deleteBeneficialOwner(id);
      setOwners((prev) => prev.filter((o) => o.id !== id));
    } catch (err: any) {
      console.error("Failed to delete beneficial owner", err);
      alert(err?.message || "Failed to delete owner");
    }
  };

  const totalOwnership = owners.reduce(
    (sum, o) => sum + (o.ownership_percentage || 0),
    0
  );

  if (loading) {
    return (
      <Section>
        <p className="text-sm text-neutral-400 text-center">Loading owners...</p>
      </Section>
    );
  }

  return (
    <div className="space-y-5">
      {/* Intro */}
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100 mb-1">
          Who owns or controls the business?
        </h2>
        <p className="text-sm text-neutral-300">
          Disclose all Ultimate Beneficial Owners (UBOs) and other controlling
          parties. Include any person or entity with{" "}
          <strong className="text-neutral-100">
            ≥25% ownership or control
          </strong>{" "}
          or significant influence. Upload documents to auto-extract information.
        </p>
      </Section>

      {/* Error */}
      {error && <Alert variant="error">{error}</Alert>}

      {/* Owners list */}
      <Section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              Beneficial Owners
            </h3>
            {totalOwnership > 0 && (
              <p className="text-xs text-neutral-400 mt-1">
                Total ownership: {totalOwnership.toFixed(2)}%
                {totalOwnership > 100 && (
                  <span className="text-red-400 ml-2">⚠ Exceeds 100%</span>
                )}
              </p>
            )}
          </div>
          <Button variant="secondary" onClick={addOwner} size="sm">
            <span>＋</span> Add owner
          </Button>
        </div>

        {owners.length === 0 && (
          <p className="text-xs text-neutral-400">
            No owners added yet. Start by adding at least one owner.
          </p>
        )}

        <div className="space-y-3 mt-2">
          {owners.map((owner) => {
            const isIndividual = owner.owner_type === "individual";
            const name = isIndividual
              ? owner.individual_full_name
              : owner.entity_legal_name;

            const hasIdDoc = !!owner.individual_id_document_id;
            const hasAddressDoc = !!owner.individual_address_document_id;
            const hasLegalDoc = !!owner.entity_legal_existence_document_id;
            const hasOwnershipDoc = !!owner.entity_ownership_proof_document_id;

            return (
              <div
                key={owner.id}
                className="rounded-lg border border-neutral-800 bg-neutral-950/60 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-neutral-100">
                        {name || "Unnamed owner"}
                      </span>
                      {owner.is_ubo && (
                        <span className="inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                          UBO
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-400">
                      <span className="capitalize">{owner.owner_type}</span>
                      {owner.ownership_percentage !== null && (
                        <span>{owner.ownership_percentage}% ownership</span>
                      )}
                      {isIndividual && owner.individual_nationality && (
                        <span>{owner.individual_nationality}</span>
                      )}
                      {!isIndividual && owner.entity_jurisdiction && (
                        <span>{owner.entity_jurisdiction}</span>
                      )}
                    </div>
                    {/* Document indicators */}
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {isIndividual && (
                        <>
                          {hasIdDoc && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              ID Doc
                            </span>
                          )}
                          {hasAddressDoc && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              PoA
                            </span>
                          )}
                        </>
                      )}
                      {!isIndividual && (
                        <>
                          {hasLegalDoc && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Legal Doc
                            </span>
                          )}
                          {hasOwnershipDoc && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] text-emerald-300">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                              Ownership Proof
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => editOwner(owner)}
                      className="text-xs text-[#bfa76f] hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => removeOwner(owner.id)}
                      className="text-xs text-neutral-400 hover:text-red-400"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Declaration */}
      <Section>
        <div className="mb-2 text-sm font-semibold text-neutral-100">
          I confirm the ownership structure is complete and accurate.
          {showValidationErrors && answers.ownershipDeclaration !== "agree" && <span className="text-red-400"> *</span>}
        </div>
        <label className="inline-flex items-center gap-2 text-neutral-100 text-sm cursor-pointer">
          <input
            type="radio"
            name="ownershipDeclaration"
            style={{ accentColor: GOLD }}
            className="h-4 w-4"
            checked={answers.ownershipDeclaration === "agree"}
            onChange={() => setValue("ownershipDeclaration", "agree")}
          />
          <span>I agree</span>
        </label>
      </Section>

      {/* Modal */}
      <OwnerModal
        open={modalOpen}
        owner={modalOwner}
        onClose={() => {
          setModalOpen(false);
          setModalOwner(null);
        }}
        onSave={saveOwner}
        isSaving={modalSaving}
        tenantId={tenantId}
        applicationId={applicationId}
        applicantId={applicantId}
      />
    </div>
  );
}

export default OwnershipStep;
