// src/app/onboarding/steps/BusinessDocumentsStep.tsx
"use client";

import React from "react";
import { ChevronDown, ChevronRight, Check } from "lucide-react";
import { getCountryGuidance } from "@/data/countryGuidance";
import {
  applyBusinessDocumentToCompanyProfile,
  patchCompanyProfile,
  fetchCompanyProfile,
  fetchEvidencePack,
  type CompanyProfile,
  type CompanyProfilePatchPayload,
  type EvidencePackResponse,
} from "@/lib/koraClient";
import {
  Modal,
  Section,
  FormField,
  Input,
  Button,
  Alert,
  DocumentUploadControl,
  type DocumentUploadStatus,
} from "@/components/ui";

interface BusinessDocumentsStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  showValidationErrors?: boolean;
}

/** ---------- Shared types ---------- */

type DocRef = {
  id: string;
  name: string;
};

type FieldDocsShape =
  | null
  | undefined
  | string
  | string[]
  | {
      docs?: DocRef[];
      [key: string]: any;
    };

/** Normalise whatever we find in answers[fieldId] into DocRef[] */
function normaliseDocs(
  raw: FieldDocsShape,
  fallbackName?: string | null,
): DocRef[] {
  if (!raw) {
    return fallbackName ? [{ id: "pending", name: fallbackName }] : [];
  }

  // New structure: { docs: [...] }
  if (typeof raw === "object" && !Array.isArray(raw)) {
    const maybeDocs = (raw as any).docs;
    if (Array.isArray(maybeDocs)) {
      return maybeDocs
        .map((d: any, idx: number) => {
          const id = String(
            d?.id ??
              d?.document_id ??
              d?.docId ??
              d?.file_id ??
              `doc-${idx}`,
          );
          const name = String(
            d?.name ??
              d?.fileName ??
              d?.original_file_name ??
              `Document ${idx + 1}`,
          );
          return { id, name };
        })
        .filter((d) => d.id);
    }
  }

  // Backwards compatibility: array of strings or objects
  if (Array.isArray(raw)) {
    return raw
      .map((d: any, idx: number) => {
        if (typeof d === "string") {
          return { id: d, name: fallbackName ?? `Document ${idx + 1}` };
        }
        if (d && typeof d === "object") {
          const id = String(
            d?.id ??
              d?.document_id ??
              d?.docId ??
              d?.file_id ??
              `doc-${idx}`,
          );
          const name = String(
            d?.name ??
              d?.fileName ??
              d?.original_file_name ??
              `Document ${idx + 1}`,
          );
          return { id, name };
        }
        return null;
      })
      .filter((d): d is DocRef => !!d && !!d.id);
  }

  // Single string id
  if (typeof raw === "string") {
    return [{ id: raw, name: fallbackName ?? "Uploaded document" }];
  }

  return [];
}

function isoToInputDate(v?: string | null): string {
  if (!v) return "";
  return String(v).slice(0, 10);
}

function inputDateToIso(v?: string): string | null {
  const s = (v || "").trim();
  return s ? s : null;
}

/**
 * Some backend normalization paths return "rich" values like:
 *  - { value: "18106", source: "key_value_pairs", ... }
 * or even a stringified object (JSON-ish or Python-ish).
 * For UI inputs we want the plain scalar value only.
 */
function unwrapScalar(v: any): string {
  if (v === null || v === undefined) return "";

  if (typeof v === "object") {
    if ("value" in v) return String((v as any).value ?? "");
    return "";
  }

  const s = String(v);
  const m1 = s.match(/['"]value['"]\s*:\s*['"]([^'"]*)['"]/);
  if (m1?.[1] !== undefined) return m1[1];

  return s;
}

function unwrapDateToInput(v: any): string {
  const s = unwrapScalar(v);
  if (!s) return "";
  return String(s).slice(0, 10);
}

function readV2FieldFromNormalization(
  normalization: any,
  fieldKey: string,
): string {
  const fields = normalization?.fields;
  const node = fields?.[fieldKey];
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object") return unwrapScalar(node);
  return "";
}

/** ---------- Collapsible Section Component ---------- */
interface CollapsibleSectionProps {
  title: string;
  subtitle?: string;
  expanded: boolean;
  onToggle: () => void;
  progress?: { completed: number; total: number };
  isComplete?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  subtitle,
  expanded,
  onToggle,
  progress,
  isComplete,
  optional,
  children,
}) => {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-neutral-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-neutral-100">{title}</span>
              {optional && (
                <span className="text-[10px] uppercase tracking-wide text-neutral-500 bg-neutral-800 px-1.5 py-0.5 rounded">
                  Optional
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-neutral-500 mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {progress && !optional && (
            <span className="text-xs text-neutral-400">
              {progress.completed} of {progress.total} completed
            </span>
          )}
          {isComplete && (
            <div className="w-5 h-5 rounded-full bg-green-600/20 flex items-center justify-center">
              <Check className="w-3 h-3 text-green-400" />
            </div>
          )}
        </div>
      </button>
      {expanded && (
        <div className="px-4 pb-4 pt-2 border-t border-neutral-800">
          {children}
        </div>
      )}
    </div>
  );
};

/** ---------- Reusable uploader for each company-doc slot ---------- */
interface BusinessDocUploaderProps {
  fieldId: string;
  label: string;
  description?: string;
  required?: boolean;
  category: string;
  tenantId?: string | null;
  applicationId?: string | null;
  applicantId?: string | null;
  answers: Record<string, any>;
  single?: boolean;
  setValue: (id: string, val: any) => void;
  onUploaded?: (args: { category: string; documentId: string }) => void | Promise<void>;
  showValidationError?: boolean;
}

const BusinessDocUploader: React.FC<BusinessDocUploaderProps> = ({
  fieldId,
  label,
  description,
  required,
  category,
  tenantId,
  applicationId,
  applicantId,
  answers,
  single = false,
  setValue,
  onUploaded,
  showValidationError = false,
}) => {
  const [uploadStatus, setUploadStatus] = React.useState<DocumentUploadStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const docs: DocRef[] = React.useMemo(
    () => normaliseDocs(answers[fieldId] as FieldDocsShape),
    [answers, fieldId],
  );

  const hasDocs = docs.length > 0;

  // Derive the DocumentUploadControl status
  // - If we have docs and not currently uploading/error, show success
  // - Otherwise show the current uploadStatus
  const controlStatus: DocumentUploadStatus =
    uploadStatus === "uploading" ? "uploading" :
    uploadStatus === "error" ? "error" :
    hasDocs ? "success" : "idle";

  const persistDocs = (nextDocs: DocRef[] | null) => {
    if (!nextDocs || nextDocs.length === 0) setValue(fieldId, null);
    else setValue(fieldId, { docs: nextDocs });
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setUploadStatus("uploading");

    try {
      let nextDocs: DocRef[] = single ? [] : [...docs];

      const formData = new FormData();
      formData.append("file", file);

      if (tenantId) formData.append("tenant_id", tenantId);
      if (applicationId) formData.append("application_id", applicationId);
      if (applicantId) formData.append("applicant_id", applicantId);
      formData.append("category", category);

      const res = await fetch("/api/documents/business", {
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
        data?.id ?? data?.document_id ?? data?.document?.id ?? data?.documentId;

      if (!docId) {
        throw new Error(
          "Upload succeeded but no document id was returned by the server.",
        );
      }

      nextDocs.push({ id: String(docId), name: file.name });

      await onUploaded?.({ category, documentId: String(docId) });

      persistDocs(nextDocs);
      setUploadStatus("success");
    } catch (err: any) {
      console.error("Business document upload failed", err);
      setUploadStatus("error");
      setError(
        err?.message || "Upload failed. Please try again.",
      );
    }
  };

  const handleRemove = async (docId: string) => {
    const nextDocs = docs.filter((d) => d.id !== docId);
    persistDocs(nextDocs);
    setError(null);
    if (nextDocs.length === 0) setUploadStatus("idle");
  };

  // Show validation error only when explicitly triggered and field is required but empty
  const showError = showValidationError && required && !hasDocs;

  return (
    <div className="space-y-2">
      <FormField
        label={label}
        required={required}
        helperText={description}
        error={showError ? "This field is required." : undefined}
        showError={showError}
      >
        <DocumentUploadControl
          status={controlStatus}
          errorMessage={error}
          onFileSelect={handleFileSelect}
          accept=".pdf,.jpg,.jpeg,.png,.zip"
          maxSizeMB={25}
        />

        {hasDocs && (
          <ul className="mt-2 space-y-1 text-xs text-neutral-300">
            {docs.map((doc) => (
              <li
                key={doc.id}
                className="flex items-center justify-between gap-2 rounded-md bg-neutral-950/50 px-3 py-2"
              >
                <span className="truncate">{doc.name}</span>
                <button
                  type="button"
                  onClick={() => handleRemove(doc.id)}
                  disabled={uploadStatus === "uploading"}
                  className="shrink-0 text-[11px] text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </FormField>
    </div>
  );
};

/** ---------- Main Business Documents Step ---------- */
export const BusinessDocumentsStep: React.FC<BusinessDocumentsStepProps> = ({
  answers,
  setValue,
  showValidationErrors = false,
}) => {
  const incCountry = answers.incCountry as string | undefined;
  const tenantId = answers.koraTenantId as string | null | undefined;
  const applicationId = answers.koraApplicationId as string | null | undefined;
  const applicantId = answers.koraApplicantId as string | null | undefined;

  const businessActivities = Array.isArray(answers.businessActivities)
    ? (answers.businessActivities as string[])
    : [];

  const needsPreciousMetalsPermits = businessActivities.some((v) =>
    ["trader", "supplier", "refiner"].includes(v),
  );

  const guidance = getCountryGuidance(incCountry ?? null);

  /** ---------- Section expansion state ---------- */
  const [expandedSections, setExpandedSections] = React.useState({
    A: true,
    B: false,
    C: false,
  });

  const toggleSection = (section: "A" | "B" | "C") => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  /** ---------- Document state helpers ---------- */
  const hasDoc = (fieldId: string): boolean => {
    const docs = normaliseDocs(answers[fieldId] as FieldDocsShape);
    return docs.length > 0;
  };

  // Section A documents (using new category names)
  const hasLegalExistence = hasDoc("legal_existence_proof_files");
  const hasConstitutionalDocs = hasDoc("constitutional_documents_files");

  // Section B documents
  const hasBusinessAddressProof = hasDoc("business_address_proof_files");
  const hasTaxRegistration = hasDoc("tax_registration_files");

  // Address classification (required selector)
  const addressClassification = answers.addressClassification as string | undefined;
  const hasAddressClassification = addressClassification === "registered" || addressClassification === "operating";

  // Section C documents
  const hasActivityEvidence = hasDoc("business_activity_evidence_files");
  const hasPreciousMetalsPermits = hasDoc("precious_metals_permits_files");

  /** ---------- Section completion & progress ---------- */
  const sectionAComplete = hasLegalExistence && hasConstitutionalDocs;
  const sectionAProgress = { completed: [hasLegalExistence, hasConstitutionalDocs].filter(Boolean).length, total: 2 };

  const sectionBItems = [hasBusinessAddressProof, hasAddressClassification, hasTaxRegistration];
  const sectionBComplete = sectionBItems.every(Boolean);
  const sectionBProgress = { completed: sectionBItems.filter(Boolean).length, total: sectionBItems.length };

  // Auto-expand Section B when Section A is complete
  React.useEffect(() => {
    if (sectionAComplete && !expandedSections.B) {
      setExpandedSections((prev) => ({ ...prev, B: true }));
    }
  }, [sectionAComplete, expandedSections.B]);

  /** Build "green box" style guidance inline, per document slot */
  const buildDescription = React.useCallback(
    (
      base: string,
      opts?: { examples?: string[] | undefined; note?: string | undefined },
    ) => {
      const parts: string[] = [base];

      const examples = opts?.examples?.filter(Boolean) ?? [];
      if (examples.length) {
        parts.push(
          `For ${guidance?.label ?? "this country"}, this typically includes: ${examples.join(
            "; ",
          )}.`,
        );
      }

      if (opts?.note) parts.push(opts.note);

      return parts.join(" ");
    },
    [guidance?.label],
  );

  // Per-field inline guidance mappings
  const legalExistenceDesc = buildDescription(
    "",
    { examples: guidance?.businessLicenseExamples },
  );

  const constitutionalDesc = buildDescription(
    "",
    { examples: guidance?.registrationDocsExamples },
  );

  const businessAddressDesc = buildDescription(
    "",
    { examples: guidance?.businessAddressExamples },
  );

  const taxDesc = buildDescription(
    "",
    { examples: guidance?.taxRegistrationExamples, note: guidance?.notes },
  );

  const activityEvidenceDesc = buildDescription(
    "Optional: recent invoices, contracts, or other evidence of your precious metals trading or related business.",
  );

  const permitsDesc = "";

  /** ---------- Company profile state ---------- */
  const [companyProfile, setCompanyProfile] =
    React.useState<CompanyProfile | null>(null);

  const ensureCompanyProfile = React.useCallback(async () => {
    if (!applicationId) return null;

    if (companyProfile) return companyProfile;

    if (answers.companyProfile) {
      const p = answers.companyProfile as CompanyProfile;
      setCompanyProfile(p);
      return p;
    }

    try {
      const p = await fetchCompanyProfile(applicationId);
      setCompanyProfile(p);
      setValue("companyProfile", p);
      return p;
    } catch {
      return null;
    }
  }, [answers.companyProfile, applicationId, companyProfile, setValue]);

  /** ---------- Handle address classification change ---------- */
  const handleAddressClassification = React.useCallback(async (value: string) => {
    setValue("addressClassification", value);

    // Also persist to backend
    if (applicationId) {
      try {
        await patchCompanyProfile(applicationId, {
          operating_address_is_different: value === "operating",
        });
      } catch (e) {
        console.error("Failed to save address classification", e);
      }
    }
  }, [applicationId, setValue]);

  /** ---------- Legal existence modal ---------- */
  const [licenceModalOpen, setLicenceModalOpen] = React.useState(false);
  const [licenceModalLoading, setLicenceModalLoading] = React.useState(false);
  const [licenceModalError, setLicenceModalError] = React.useState<string | null>(null);
  const [licenceSaving, setLicenceSaving] = React.useState(false);

  const [licenceDraft, setLicenceDraft] = React.useState({
    legal_name: "",
    trading_name: "",
    registration_number: "",
    legal_form: "",
    license_number: "",
    license_issue_date: "",
    license_expiry_date: "",
    license_issuing_authority: "",
  });

  const hydrateLicenceDraft = React.useCallback((p: CompanyProfile) => {
    setLicenceDraft({
      legal_name: unwrapScalar((p as any).legal_name),
      trading_name: unwrapScalar((p as any).trading_name),
      registration_number: unwrapScalar((p as any).registration_number),
      legal_form: unwrapScalar((p as any).legal_form),
      license_number: unwrapScalar((p as any).license_number),
      license_issue_date: unwrapDateToInput((p as any).license_issue_date),
      license_expiry_date: unwrapDateToInput((p as any).license_expiry_date),
      license_issuing_authority: unwrapScalar((p as any).license_issuing_authority),
    });
  }, []);

  const openLicenceModalWithProfile = React.useCallback(
    (p: CompanyProfile) => {
      setCompanyProfile(p);
      setValue("companyProfile", p);
      hydrateLicenceDraft(p);
      setLicenceModalError(null);
      setLicenceModalOpen(true);
    },
    [hydrateLicenceDraft, setValue],
  );

  const saveLicenceModal = React.useCallback(async () => {
    if (!applicationId) return;

    setLicenceSaving(true);
    setLicenceModalError(null);

    try {
      const patch: CompanyProfilePatchPayload = {
        legal_name: licenceDraft.legal_name || null,
        trading_name: licenceDraft.trading_name || null,
        registration_number: licenceDraft.registration_number || null,
        legal_form: licenceDraft.legal_form || null,
        license_number: licenceDraft.license_number || null,
        license_issue_date: inputDateToIso(licenceDraft.license_issue_date),
        license_expiry_date: inputDateToIso(licenceDraft.license_expiry_date),
        license_issuing_authority: licenceDraft.license_issuing_authority || null,
      };

      const updated = await patchCompanyProfile(applicationId, patch);
      setCompanyProfile(updated);
      setValue("companyProfile", updated);
      setLicenceModalOpen(false);
    } catch (e: any) {
      console.error("PATCH company profile failed", e);
      setLicenceModalError(
        e?.message || "Failed to save company details. Please try again.",
      );
    } finally {
      setLicenceSaving(false);
    }
  }, [applicationId, licenceDraft, setValue]);

  /** ---------- Tax modal ---------- */
  const [taxModalOpen, setTaxModalOpen] = React.useState(false);
  const [taxModalLoading, setTaxModalLoading] = React.useState(false);
  const [taxModalError, setTaxModalError] = React.useState<string | null>(null);
  const [taxSaving, setTaxSaving] = React.useState(false);

  const [taxDraft, setTaxDraft] = React.useState({
    has_tax_registration: true,
    tax_registration_number: "",
    tax_registration_issue_date: "",
  });

  const openTaxModal = React.useCallback((prefill?: Partial<typeof taxDraft>) => {
    setTaxDraft((p) => ({
      ...p,
      ...prefill,
    }));
    setTaxModalError(null);
    setTaxModalOpen(true);
  }, []);

  const saveTaxModal = React.useCallback(async () => {
    if (!applicationId) return;

    setTaxSaving(true);
    setTaxModalError(null);

    try {
      const patch: CompanyProfilePatchPayload = {
        has_tax_registration: taxDraft.has_tax_registration ?? true,
        tax_registration_number: taxDraft.tax_registration_number || null,
      };

      const updated = await patchCompanyProfile(applicationId, patch);
      setCompanyProfile(updated);
      setValue("companyProfile", updated);
      setTaxModalOpen(false);
    } catch (e: any) {
      console.error("PATCH company profile (tax) failed", e);
      setTaxModalError(
        e?.message || "Failed to save tax registration details. Please try again.",
      );
    } finally {
      setTaxSaving(false);
    }
  }, [applicationId, setValue, taxDraft]);

  /** ---------- Upload callback ---------- */
  const onDocUploaded = React.useCallback(
    async ({ category, documentId }: { category: string; documentId: string }) => {
      if (!applicationId) return;

      // 1) Business licence -> existing flow (unchanged)
      if (category === "legal_existence_proof") {
        setLicenceModalLoading(true);
        setLicenceModalError(null);

        try {
          const updated = await applyBusinessDocumentToCompanyProfile(
            applicationId,
            documentId,
          );

          openLicenceModalWithProfile(updated);
        } catch (e: any) {
          console.error("apply-document failed", e);

          const existing = await ensureCompanyProfile();
          if (existing) {
            openLicenceModalWithProfile(existing);
            setLicenceModalError(
              e?.message ||
                "We uploaded the document, but could not auto-fill company details. Please enter them manually.",
            );
          } else {
            setLicenceModalError(
              e?.message ||
                "We uploaded the document, but could not load company details. Please try again.",
            );
          }
        } finally {
          setLicenceModalLoading(false);
        }

        return;
      }

      // 2) Tax registration -> read from evidence pack + modal
      if (category === "tax_registration") {
        setTaxModalLoading(true);
        setTaxModalError(null);

        try {
          const pack: EvidencePackResponse = await fetchEvidencePack(applicationId);
          const doc = (pack?.documents || []).find((d) => String(d.id) === String(documentId));

          const normalization =
            (doc as any)?.extraction?.payload?.normalization ||
            (doc as any)?.extraction?.payload?.extracted_json?.normalization ||
            (doc as any)?.extraction?.payload?.extracted?.normalization ||
            {};

          const trn = readV2FieldFromNormalization(normalization, "tax_registration_number");
          const issue = readV2FieldFromNormalization(normalization, "tax_registration_issue_date");

          // Pre-fill from existing company profile too (if already set)
          const existing = await ensureCompanyProfile();

          openTaxModal({
            has_tax_registration: true,
            tax_registration_number: trn || unwrapScalar((existing as any)?.tax_registration_number),
            tax_registration_issue_date: issue ? isoToInputDate(issue) : "",

          });
        } catch (e: any) {
          console.error("tax evidence pack fetch failed", e);

          // Still allow manual entry
          const existing = await ensureCompanyProfile();
          openTaxModal({
            has_tax_registration: true,
            tax_registration_number: unwrapScalar((existing as any)?.tax_registration_number),
            tax_registration_issue_date: "",
           });

          setTaxModalError(
            e?.message ||
              "We uploaded the document, but could not read extracted tax details. Please enter them manually.",
          );
        } finally {
          setTaxModalLoading(false);
        }

        return;
      }
    },
    [
      applicationId,
      ensureCompanyProfile,
      openLicenceModalWithProfile,
      openTaxModal,
    ],
  );

  return (
    <div className="space-y-4">

      {/* Legal existence modal */}
      <Modal
        open={licenceModalOpen}
        onClose={() => setLicenceModalOpen(false)}
        title="Company details (from business licence)"
        size="lg"
        footer={
          !licenceModalLoading && (
            <>
              <Button
                variant="secondary"
                onClick={() => setLicenceModalOpen(false)}
                disabled={licenceSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveLicenceModal}
                loading={licenceSaving}
                disabled={licenceSaving}
              >
                Save
              </Button>
            </>
          )
        }
      >
        <p className="mb-4 text-xs text-neutral-400">
          Confirm or edit the company details extracted from the business licence.
        </p>

        {licenceModalLoading ? (
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-xs text-neutral-300">
            Applying extracted fields...
          </div>
        ) : (
          <div className="space-y-4">
            {licenceModalError && <Alert variant="warning">{licenceModalError}</Alert>}

            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Legal name" htmlFor="legal_name">
                <Input
                  id="legal_name"
                  value={licenceDraft.legal_name}
                  onChange={(value) =>
                    setLicenceDraft((p) => ({ ...p, legal_name: value }))
                  }
                />
              </FormField>

              <FormField label="Trading name" htmlFor="trading_name">
                <Input
                  id="trading_name"
                  value={licenceDraft.trading_name}
                  onChange={(value) =>
                    setLicenceDraft((p) => ({ ...p, trading_name: value }))
                  }
                />
              </FormField>

              <FormField label="Registration number" htmlFor="registration_number">
                <Input
                  id="registration_number"
                  value={licenceDraft.registration_number}
                  onChange={(value) =>
                    setLicenceDraft((p) => ({ ...p, registration_number: value }))
                  }
                />
              </FormField>

              <FormField label="Legal form" htmlFor="legal_form">
                <Input
                  id="legal_form"
                  value={licenceDraft.legal_form}
                  onChange={(value) =>
                    setLicenceDraft((p) => ({ ...p, legal_form: value }))
                  }
                />
              </FormField>
            </div>

            <Section>
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-4">
                Business licence
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <FormField label="Licence number" htmlFor="license_number">
                  <Input
                    id="license_number"
                    value={licenceDraft.license_number}
                    onChange={(value) =>
                      setLicenceDraft((p) => ({ ...p, license_number: value }))
                    }
                  />
                </FormField>

                <FormField label="Issuing authority" htmlFor="license_issuing_authority">
                  <Input
                    id="license_issuing_authority"
                    value={licenceDraft.license_issuing_authority}
                    onChange={(value) =>
                      setLicenceDraft((p) => ({ ...p, license_issuing_authority: value }))
                    }
                  />
                </FormField>

                <FormField label="Licence issue date" htmlFor="license_issue_date">
                  <Input
                    id="license_issue_date"
                    type="date"
                    value={licenceDraft.license_issue_date}
                    onChange={(value) =>
                      setLicenceDraft((p) => ({ ...p, license_issue_date: value }))
                    }
                  />
                </FormField>

                <FormField label="Licence expiry date" htmlFor="license_expiry_date">
                  <Input
                    id="license_expiry_date"
                    type="date"
                    value={licenceDraft.license_expiry_date}
                    onChange={(value) =>
                      setLicenceDraft((p) => ({ ...p, license_expiry_date: value }))
                    }
                  />
                </FormField>
              </div>
            </Section>
          </div>
        )}
      </Modal>

      {/* Tax registration modal */}
      <Modal
        open={taxModalOpen}
        onClose={() => setTaxModalOpen(false)}
        title="Tax registration details"
        size="md"
        footer={
          !taxModalLoading && (
            <>
              <Button
                variant="secondary"
                onClick={() => setTaxModalOpen(false)}
                disabled={taxSaving}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveTaxModal}
                loading={taxSaving}
                disabled={taxSaving}
              >
                Save
              </Button>
            </>
          )
        }
      >
        <p className="mb-4 text-xs text-neutral-400">
          Confirm or edit the tax registration details extracted from the certificate.
        </p>

        {taxModalLoading ? (
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-xs text-neutral-300">
            Reading extracted tax details...
          </div>
        ) : (
          <div className="space-y-4">
            {taxModalError && <Alert variant="warning">{taxModalError}</Alert>}

            <div className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <FormField
                  label="Tax registration number (TRN)"
                  htmlFor="tax_registration_number"
                  helperText="We will store this in the company profile for downstream checks."
                >
                  <Input
                    id="tax_registration_number"
                    value={taxDraft.tax_registration_number}
                    onChange={(value) =>
                      setTaxDraft((p) => ({ ...p, tax_registration_number: value }))
                    }
                  />
                </FormField>
              </div>

              <FormField
                label="Issue date (from certificate)"
                htmlFor="tax_registration_issue_date"
                helperText="This is retained in the document extraction payload (not the profile DB column)."
              >
                <Input
                  id="tax_registration_issue_date"
                  type="date"
                  value={taxDraft.tax_registration_issue_date}
                  onChange={(value) =>
                    setTaxDraft((p) => ({ ...p, tax_registration_issue_date: value }))
                  }
                />
              </FormField>
            </div>
          </div>
        )}
      </Modal>

      {/* Section A: Company Incorporation */}
      <CollapsibleSection
        title="Company Incorporation"
        subtitle="Legal existence and constitutional documents"
        expanded={expandedSections.A}
        onToggle={() => toggleSection("A")}
        progress={sectionAProgress}
        isComplete={sectionAComplete}
      >
        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <BusinessDocUploader
            fieldId="legal_existence_proof_files"
            label="Proof of Legal Existence"
            description={legalExistenceDesc}
            required
            category="legal_existence_proof"
            tenantId={tenantId}
            applicationId={applicationId}
            applicantId={applicantId}
            answers={answers}
            single={true}
            setValue={setValue}
            onUploaded={onDocUploaded}
            showValidationError={showValidationErrors}
          />

          <BusinessDocUploader
            fieldId="constitutional_documents_files"
            label="Constitutional / Corporate Documents"
            description={constitutionalDesc}
            required
            category="constitutional_documents"
            tenantId={tenantId}
            applicationId={applicationId}
            applicantId={applicantId}
            answers={answers}
            setValue={setValue}
            showValidationError={showValidationErrors}
          />
        </div>
      </CollapsibleSection>

      {/* Section B: Address & Tax */}
      <CollapsibleSection
        title="Address & Tax"
        subtitle="Business address and tax registration"
        expanded={expandedSections.B}
        onToggle={() => toggleSection("B")}
        progress={sectionBProgress}
        isComplete={sectionBComplete}
      >
        <div className="space-y-4 mt-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3">
              <BusinessDocUploader
                fieldId="business_address_proof_files"
                label="Proof of Business Address"
                description={businessAddressDesc}
                required
                category="business_address_proof"
                tenantId={tenantId}
                applicationId={applicationId}
                applicantId={applicantId}
                answers={answers}
                setValue={setValue}
                showValidationError={showValidationErrors}
              />

              {/* Address classification selector */}
              <FormField
                label="This address is:"
                required
                error={showValidationErrors && !hasAddressClassification ? "Please select an option." : undefined}
                showError={showValidationErrors && !hasAddressClassification}
              >
                <div className="space-y-2">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="addressClassification"
                      value="registered"
                      checked={addressClassification === "registered"}
                      onChange={(e) => handleAddressClassification(e.target.value)}
                      className="h-4 w-4 border-neutral-600 bg-neutral-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900"
                    />
                    <span className="text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors">
                      The registered business address (as per official records)
                    </span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="addressClassification"
                      value="operating"
                      checked={addressClassification === "operating"}
                      onChange={(e) => handleAddressClassification(e.target.value)}
                      className="h-4 w-4 border-neutral-600 bg-neutral-800 text-amber-500 focus:ring-amber-500 focus:ring-offset-neutral-900"
                    />
                    <span className="text-sm text-neutral-300 group-hover:text-neutral-100 transition-colors">
                      The operating address (different from the registered address)
                    </span>
                  </label>
                </div>
              </FormField>
            </div>

            <BusinessDocUploader
              fieldId="tax_registration_files"
              label="Tax Registration"
              description={taxDesc}
              required
              category="tax_registration"
              tenantId={tenantId}
              applicationId={applicationId}
              applicantId={applicantId}
              answers={answers}
              setValue={setValue}
              onUploaded={onDocUploaded}
              showValidationError={showValidationErrors}
            />
          </div>
        </div>
      </CollapsibleSection>

      {/* Section C: Business Activity Evidence (Optional) */}
      <CollapsibleSection
        title="Business Activity Evidence"
        subtitle="Supporting documents for your business activities"
        expanded={expandedSections.C}
        onToggle={() => toggleSection("C")}
        optional
      >
        <div className="grid gap-4 md:grid-cols-2 mt-2">
          <BusinessDocUploader
            fieldId="business_activity_evidence_files"
            label="Business Activity Evidence"
            description={activityEvidenceDesc}
            required={false}
            category="business_activity_evidence"
            tenantId={tenantId}
            applicationId={applicationId}
            applicantId={applicantId}
            answers={answers}
            setValue={setValue}
          />

          {needsPreciousMetalsPermits && (
            <BusinessDocUploader
              fieldId="precious_metals_permits_files"
              label="Export Permits / Mining or Dealer Licences"
              description={permitsDesc}
              required={false}
              category="precious_metals_permits"
              tenantId={tenantId}
              applicationId={applicationId}
              applicantId={applicantId}
              answers={answers}
              setValue={setValue}
            />
          )}
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default BusinessDocumentsStep;
