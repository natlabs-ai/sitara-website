// src/app/onboarding/steps/BusinessDocumentsStep.tsx
"use client";

import React from "react";
import { getCountryGuidance } from "@/data/countryGuidance";
import {
  applyBusinessDocumentToCompanyProfile,
  patchCompanyProfile,
  fetchCompanyProfile,
  type CompanyProfile,
  type CompanyProfilePatchPayload,
} from "@/lib/koraClient";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface BusinessDocumentsStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
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
  // Expect YYYY-MM-DD; tolerate full ISO
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

  // If backend returns an object like { value: "..." }
  if (typeof v === "object") {
    if ("value" in v) return String((v as any).value ?? "");
    return "";
  }

  const s = String(v);

  // If backend returns a stringified object (Python-ish or JSON-ish), extract value
  // Examples:
  // "{'value': '18106', 'source': 'key_value_pairs'}"
  // '{"value":"18106","source":"key_value_pairs"}'
  const m1 = s.match(/['"]value['"]\s*:\s*['"]([^'"]*)['"]/);
  if (m1?.[1] !== undefined) return m1[1];

  return s;
}

function unwrapDateToInput(v: any): string {
  const s = unwrapScalar(v);
  if (!s) return "";
  // tolerate full ISO; UI expects YYYY-MM-DD
  return String(s).slice(0, 10);
}

/** ---------- Simple modal ---------- */
function Modal({
  open,
  title,
  children,
  onClose,
}: {
  open: boolean;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-2xl rounded-2xl border border-neutral-800 bg-neutral-950 p-5 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">{title}</h3>
            <p className="mt-1 text-xs text-neutral-400">
              Confirm or edit the company details extracted from the business
              licence.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-neutral-800 bg-black/40 px-3 py-1.5 text-xs text-neutral-200 hover:bg-black/60"
          >
            Close
          </button>
        </div>

        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}

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
  onUploaded?: (args: {
    category: string;
    documentId: string;
  }) => void | Promise<void>;
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
}) => {
  const [uploadStatus, setUploadStatus] = React.useState<UploadStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const docs: DocRef[] = React.useMemo(
    () => normaliseDocs(answers[fieldId] as FieldDocsShape),
    [answers, fieldId],
  );

  const hasDocs = docs.length > 0;
  const isUploading = uploadStatus === "uploading";
  const isSuccess = uploadStatus === "success" && hasDocs;

  const buttonLabel = isUploading
    ? "Uploading…"
    : hasDocs && !single
      ? "Add another file"
      : hasDocs && single
        ? "Replace file"
        : "Choose file";

  const persistDocs = (nextDocs: DocRef[] | null) => {
    if (!nextDocs || nextDocs.length === 0) setValue(fieldId, null);
    else setValue(fieldId, { docs: nextDocs });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    // Capture synchronously; do NOT touch e.currentTarget after await.
    const inputEl = e.currentTarget;
    const files = inputEl.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploadStatus("uploading");

    const fileList = single ? [files[0]] : Array.from(files);

    try {
      let nextDocs: DocRef[] = single ? [] : [...docs];

      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);

        // These keys MUST match what your API expects.
        // Your FastAPI expects: tenant_id, application_id, applicant_id, category
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
            "We could not upload this document. Please try again.";
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

        // Notify parent (used for legal_existence)
        await onUploaded?.({ category, documentId: String(docId) });
      }

      persistDocs(nextDocs);
      setUploadStatus("success");
    } catch (err: any) {
      console.error("Business document upload failed", err);
      setUploadStatus("error");
      setError(
        err?.message || "We could not upload this document. Please try again.",
      );
    } finally {
      // allow reselecting same file
      if (inputEl) inputEl.value = "";
    }
  };

  const handleRemove = async (docId: string) => {
    const nextDocs = docs.filter((d) => d.id !== docId);
    persistDocs(nextDocs);
    setError(null);
    if (nextDocs.length === 0) setUploadStatus("idle");
  };

  return (
    <section className="rounded-2xl border border-neutral-800 bg-black/30 p-4">
      <div className="flex flex-col gap-2">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">
              {label} {required && <span className="text-red-400">*</span>}
            </h3>
            {description && (
              <p className="mt-1 text-xs text-neutral-400">{description}</p>
            )}
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <label
            className={`inline-flex cursor-pointer items-center rounded-full border px-4 py-2 text-sm font-medium transition
            ${
              isSuccess
                ? "border-emerald-500 bg-emerald-600/10 text-emerald-300"
                : "border-neutral-700 bg-black/70 text-neutral-100 hover:border-[#bfa76f]"
            }
            ${isUploading ? "cursor-not-allowed opacity-70" : ""}`}
          >
            <span>{buttonLabel}</span>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.zip"
              className="hidden"
              disabled={isUploading}
              multiple={!single}
              onChange={handleFileChange}
            />
          </label>
        </div>

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
                  disabled={isUploading}
                  className="shrink-0 text-[11px] text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-2 min-h-[1.25rem] text-xs">
          {uploadStatus === "success" && hasDocs && (
            <div className="flex items-center gap-2 text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span>
                Document{docs.length > 1 ? "s" : ""} uploaded successfully.
              </span>
            </div>
          )}
          {uploadStatus === "error" && error && (
            <div className="flex items-center gap-2 text-red-300">
              <span className="h-2 w-2 rounded-full bg-red-400" />
              <span>{error}</span>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

/** ---------- Main Business Documents Step ---------- */
export const BusinessDocumentsStep: React.FC<BusinessDocumentsStepProps> = ({
  answers,
  setValue,
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

  /** Build “green box” style guidance inline, per document slot */
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
    "For example: trade / commercial licence, registry certificate, or company profile. Upload the current version.",
    { examples: guidance?.businessLicenseExamples },
  );

  const constitutionalDesc = buildDescription(
    "Upload your constitutional / corporate documents that define the company’s formation and governance.",
    { examples: guidance?.registrationDocsExamples },
  );

  const registeredAddressDesc = buildDescription(
    "For example: lease agreement, utility bill, or registry record showing the registered office address.",
    { examples: guidance?.businessAddressExamples },
  );

  const operatingAddressDesc = buildDescription(
    "If day-to-day operations happen at a different address (e.g. refinery, office, or showroom), upload evidence here.",
  );

  const taxDesc = buildDescription(
    "For example: VAT registration, tax ID certificate, or equivalent issued by the tax authority.",
    { examples: guidance?.taxRegistrationExamples, note: guidance?.notes },
  );

  const activityEvidenceDesc = buildDescription(
    "Optional: recent invoices, contracts, or other evidence of your precious metals trading or related business.",
  );

  const permitsDesc = buildDescription(
    "If you operate as a supplier, trader, or refiner, upload any relevant mining, dealer, or export licences.",
    { examples: guidance?.preciousMetalsExamples },
  );

  /** ---------- Legal existence → apply-document → modal editing ---------- */
  const [companyProfile, setCompanyProfile] =
    React.useState<CompanyProfile | null>(null);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalLoading, setModalLoading] = React.useState(false);
  const [modalError, setModalError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const [draft, setDraft] = React.useState({
    legal_name: "",
    trading_name: "",
    registration_number: "",
    legal_form: "",
    license_number: "",
    license_issue_date: "",
    license_expiry_date: "",
    license_issuing_authority: "",
  });

  const hydrateDraft = React.useCallback((p: CompanyProfile) => {
    // Unwrap "rich" backend values to scalars for UI inputs.
    setDraft({
      legal_name: unwrapScalar((p as any).legal_name),
      trading_name: unwrapScalar((p as any).trading_name),
      registration_number: unwrapScalar((p as any).registration_number),
      legal_form: unwrapScalar((p as any).legal_form),
      license_number: unwrapScalar((p as any).license_number),
      // Prefer unwrapDateToInput to handle {value: "..."} and tolerate ISO
      license_issue_date: unwrapDateToInput((p as any).license_issue_date),
      license_expiry_date: unwrapDateToInput((p as any).license_expiry_date),
      license_issuing_authority: unwrapScalar(
        (p as any).license_issuing_authority,
      ),
    });
  }, []);

  const openModalWithProfile = React.useCallback(
    (p: CompanyProfile) => {
      setCompanyProfile(p);
      setValue("companyProfile", p); // keep answers in sync for downstream steps/review
      hydrateDraft(p);
      setModalError(null);
      setModalOpen(true);
    },
    [hydrateDraft, setValue],
  );

  const ensureCompanyProfile = React.useCallback(async () => {
    if (!applicationId) return null;

    // 1) If already in state, use it
    if (companyProfile) return companyProfile;

    // 2) If stored in answers, use it
    if (answers.companyProfile) {
      const p = answers.companyProfile as CompanyProfile;
      setCompanyProfile(p);
      return p;
    }

    // 3) Fetch from API
    try {
      const p = await fetchCompanyProfile(applicationId);
      setCompanyProfile(p);
      setValue("companyProfile", p);
      return p;
    } catch {
      return null;
    }
  }, [answers.companyProfile, applicationId, companyProfile, setValue]);

  const onDocUploaded = React.useCallback(
    async ({
      category,
      documentId,
    }: {
      category: string;
      documentId: string;
    }) => {
      if (category !== "legal_existence") return;
      if (!applicationId) return;

      setModalLoading(true);
      setModalError(null);

      try {
        // Apply normalization into company profile (fills blanks)
const updated = await applyBusinessDocumentToCompanyProfile(
  applicationId,
  documentId,
);

// DEBUG: confirm what backend actually returned
console.group("[BusinessDocumentsStep] applyBusinessDocumentToCompanyProfile");
console.log("Full CompanyProfile:", updated);
console.log("Top-level keys:", Object.keys(updated || {}));

const fields = [
  "legal_name",
  "trading_name",
  "license_issuing_authority",
  "license_issue_date",
  "license_expiry_date",
  "registration_number",
  "license_number",
  "legal_form",
];

console.log(
  "Relevant fields:",
  Object.fromEntries(fields.map((k) => [k, (updated as any)?.[k]])),
);
console.groupEnd();

openModalWithProfile(updated);

      } catch (e: any) {
        console.error("apply-document failed", e);

        // Fallback: open whatever exists so user can fill manually
        const existing = await ensureCompanyProfile();
        if (existing) {
          openModalWithProfile(existing);
          setModalError(
            e?.message ||
              "We uploaded the document, but could not auto-fill company details. Please enter them manually.",
          );
        } else {
          setModalError(
            e?.message ||
              "We uploaded the document, but could not load company details. Please try again.",
          );
        }
      } finally {
        setModalLoading(false);
      }
    },
    [applicationId, ensureCompanyProfile, openModalWithProfile],
  );

  const saveModal = React.useCallback(async () => {
    if (!applicationId) return;

    setSaving(true);
    setModalError(null);

    try {
      const patch: CompanyProfilePatchPayload = {
        legal_name: draft.legal_name || null,
        trading_name: draft.trading_name || null,
        registration_number: draft.registration_number || null,
        legal_form: draft.legal_form || null,
        license_number: draft.license_number || null,
        license_issue_date: inputDateToIso(draft.license_issue_date),
        license_expiry_date: inputDateToIso(draft.license_expiry_date),
        license_issuing_authority: draft.license_issuing_authority || null,
      };

      const updated = await patchCompanyProfile(applicationId, patch);
      setCompanyProfile(updated);
      setValue("companyProfile", updated);
      setModalOpen(false);
    } catch (e: any) {
      console.error("PATCH company profile failed", e);
      setModalError(
        e?.message || "Failed to save company details. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }, [applicationId, draft, setValue]);

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
        <h2 className="text-sm font-semibold text-neutral-100">
          Company registration documents
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Upload evidence that your company is legally incorporated, where it is
          located, and that it is authorised to carry out its stated precious
          metals activities. You can upload a single combined PDF or ZIP file
          per category if that is easier.
        </p>

        {guidance && (
          <p className="mt-3 text-xs text-neutral-500">
            Showing {guidance.label} examples inline under each document type.
          </p>
        )}
      </section>

      <Modal
        open={modalOpen}
        title="Company details (from business licence)"
        onClose={() => setModalOpen(false)}
      >
        {modalLoading ? (
          <div className="rounded-xl border border-neutral-800 bg-black/30 p-4 text-xs text-neutral-300">
            Applying extracted fields…
          </div>
        ) : (
          <div className="space-y-4">
            {modalError && (
              <div className="rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
                {modalError}
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-300">
                  Legal name
                </label>
                <input
                  value={draft.legal_name}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, legal_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-300">
                  Trading name
                </label>
                <input
                  value={draft.trading_name}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, trading_name: e.target.value }))
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-300">
                  Registration number
                </label>
                <input
                  value={draft.registration_number}
                  onChange={(e) =>
                    setDraft((p) => ({
                      ...p,
                      registration_number: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-300">
                  Legal form
                </label>
                <input
                  value={draft.legal_form}
                  onChange={(e) =>
                    setDraft((p) => ({ ...p, legal_form: e.target.value }))
                  }
                  className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                />
              </div>
            </div>

            <div className="mt-2 rounded-2xl border border-neutral-800 bg-black/20 p-4">
              <div className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                Business licence
              </div>

              <div className="mt-3 grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Licence number
                  </label>
                  <input
                    value={draft.license_number}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        license_number: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Issuing authority
                  </label>
                  <input
                    value={draft.license_issuing_authority}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        license_issuing_authority: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Licence issue date
                  </label>
                  <input
                    type="date"
                    value={draft.license_issue_date}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        license_issue_date: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-300">
                    Licence expiry date
                  </label>
                  <input
                    type="date"
                    value={draft.license_expiry_date}
                    onChange={(e) =>
                      setDraft((p) => ({
                        ...p,
                        license_expiry_date: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                disabled={saving}
                className="rounded-lg border border-neutral-800 bg-black/40 px-4 py-2 text-sm text-neutral-200 hover:bg-black/60 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveModal}
                disabled={saving}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
                  saving
                    ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                    : "border border-[#bfa76f] text-[#bfa76f] hover:bg-[#bfa76f]/10"
                }`}
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      <div className="grid gap-4 md:grid-cols-2">
        <BusinessDocUploader
          fieldId="legal_existence_files"
          label="Proof of Legal Existence"
          description={legalExistenceDesc}
          required
          category="legal_existence"
          tenantId={tenantId}
          applicationId={applicationId}
          applicantId={applicantId}
          answers={answers}
          single={true}
          setValue={setValue}
          onUploaded={onDocUploaded}
        />

        <BusinessDocUploader
          fieldId="constitutional_corporate_files"
          label="Constitutional / Corporate Documents"
          description={constitutionalDesc}
          required
          category="constitutional_corporate"
          tenantId={tenantId}
          applicationId={applicationId}
          applicantId={applicantId}
          answers={answers}
          setValue={setValue}
        />

        <BusinessDocUploader
          fieldId="registered_address_files"
          label="Proof of Registered Address"
          description={registeredAddressDesc}
          required
          category="registered_address"
          tenantId={tenantId}
          applicationId={applicationId}
          applicantId={applicantId}
          answers={answers}
          setValue={setValue}
        />

        <BusinessDocUploader
          fieldId="operating_address_files"
          label="Operating Address (if different)"
          description={operatingAddressDesc}
          required={false}
          category="operating_address"
          tenantId={tenantId}
          applicationId={applicationId}
          applicantId={applicantId}
          answers={answers}
          setValue={setValue}
        />

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
        />

        <BusinessDocUploader
          fieldId="activity_evidence_files"
          label="Business Activity Evidence"
          description={activityEvidenceDesc}
          required={false}
          category="activity_evidence"
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
            required
            category="precious_metals_permits"
            tenantId={tenantId}
            applicationId={applicationId}
            applicantId={applicantId}
            answers={answers}
            setValue={setValue}
          />
        )}
      </div>
    </div>
  );
};

export default BusinessDocumentsStep;
