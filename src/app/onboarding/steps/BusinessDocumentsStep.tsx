// src/app/onboarding/steps/BusinessDocumentsStep.tsx
"use client";

import React from "react";
import { getCountryGuidance } from "@/data/countryGuidance";

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
            d?.id ?? d?.document_id ?? d?.docId ?? d?.file_id ?? `doc-${idx}`,
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

/** ---------- Reusable uploader for each company-doc slot ---------- */
interface BusinessDocUploaderProps {
  fieldId: string;
  label: string;
  description?: string;
  required?: boolean;
  category: string;
  tenantId?: string | null;
  applicationId?: string | null;
  answers: Record<string, any>;
  single?: boolean;
  setValue: (id: string, val: any) => void;
}

const BusinessDocUploader: React.FC<BusinessDocUploaderProps> = ({
  fieldId,
  label,
  description,
  required,
  category,
  tenantId,
  applicationId,
  answers,
  single = false,
  setValue,
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
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setError(null);
    setUploadStatus("uploading");

    const fileList = single ? [files[0]] : Array.from(files);

    try {
      let nextDocs: DocRef[] = single ? [] : [...docs];

      for (const file of fileList) {
        const formData = new FormData();
        formData.append("file", file);
        if (tenantId) formData.append("tenantId", tenantId);
        if (applicationId) formData.append("applicationId", applicationId);
        formData.append("docCategory", category);

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
      e.target.value = "";
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
  const incCountry = answers.incCountry as string | undefined; // should be ISO code for MVP
  const tenantId = answers.koraTenantId as string | null | undefined;
  const applicationId = answers.koraApplicationId as string | null | undefined;

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
      opts?: {
        examples?: string[] | undefined;
        note?: string | undefined;
      },
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

      if (opts?.note) {
        parts.push(opts.note);
      }

      return parts.join(" ");
    },
    [guidance?.label],
  );

  // Per-field inline guidance mappings
  const legalExistenceDesc = buildDescription(
    "For example: trade / commercial licence, registry certificate, or company profile. Upload the current version.",
    {
      examples: guidance?.businessLicenseExamples,
    },
  );

  const constitutionalDesc = buildDescription(
    "Upload your constitutional / corporate documents that define the company’s formation and governance.",
    {
      examples: guidance?.registrationDocsExamples,
    },
  );

  const registeredAddressDesc = buildDescription(
    "For example: lease agreement, utility bill, or registry record showing the registered office address.",
    {
      examples: guidance?.businessAddressExamples,
    },
  );

  const operatingAddressDesc = buildDescription(
    "If day-to-day operations happen at a different address (e.g. refinery, office, or showroom), upload evidence here.",
  );

  const taxDesc = buildDescription(
    "For example: VAT registration, tax ID certificate, or equivalent issued by the tax authority.",
    {
      examples: guidance?.taxRegistrationExamples,
      note: guidance?.notes,
    },
  );

  const activityEvidenceDesc = buildDescription(
    "Optional: recent invoices, contracts, or other evidence of your precious metals trading or related business.",
  );

  const permitsDesc = buildDescription(
    "If you operate as a supplier, trader, or refiner, upload any relevant mining, dealer, or export licences.",
    { examples: guidance?.preciousMetalsExamples },
  );

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

      <div className="grid gap-4 md:grid-cols-2">
        <BusinessDocUploader
          fieldId="legal_existence_files"
          label="Proof of Legal Existence"
          description={legalExistenceDesc}
          required
          category="legal_existence"
          tenantId={tenantId}
          applicationId={applicationId}
          answers={answers}
          single={true}
          setValue={setValue}
        />

        <BusinessDocUploader
          fieldId="constitutional_corporate_files"
          label="Constitutional / Corporate Documents"
          description={constitutionalDesc}
          required
          category="constitutional_corporate"
          tenantId={tenantId}
          applicationId={applicationId}
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
            answers={answers}
            setValue={setValue}
          />
        )}
      </div>
    </div>
  );
};

export default BusinessDocumentsStep;
