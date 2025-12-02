// src/components/ProofOfAddressUploader.tsx
"use client";

import React from "react";

export interface ProofOfAddressDocument {
  id: string;
  verified_status?: string | null;
  original_file_name?: string | null;
  [key: string]: any;
}

interface ProofOfAddressUploaderProps {
  tenantId?: string | null;
  applicationId?: string | null;
  applicantId?: string | null;
  onUploaded?: (doc: ProofOfAddressDocument) => void;
}

export const ProofOfAddressUploader: React.FC<
  ProofOfAddressUploaderProps
> = ({ tenantId, applicationId, applicantId, onUploaded }) => {
  const [isUploading, setIsUploading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<number | null>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!tenantId || !applicationId) {
      setError("Application context is missing. Please restart the flow.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setIsSuccess(false);
    setFileName(file.name);
    setFileSize(file.size);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", String(tenantId));
      formData.append("application_id", String(applicationId));
      if (applicantId) {
        formData.append("applicant_id", String(applicantId));
      }

      const res = await fetch("/api/documents/address", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail =
          errJson?.detail ||
          "We couldn’t upload your proof of address. Please try again.";
        throw new Error(detail);
      }

      const data = (await res.json()) as ProofOfAddressDocument;
      setIsSuccess(true);
      onUploaded?.(data);
    } catch (err: any) {
      console.error("Proof-of-address upload failed", err);
      setError(
        err?.message ||
          "We couldn’t upload your proof of address. Please try again.",
      );
      setIsSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const buttonLabel = isUploading
    ? "Uploading…"
    : isSuccess
    ? "Uploaded"
    : "Choose File";

  return (
    <section className="rounded-2xl border border-neutral-800 bg-black/30 p-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">
            Proof of Address <span className="text-red-400">*</span>
          </h2>
          <p className="mt-1 text-xs text-neutral-400 max-w-xl">
            Upload a recent utility bill, bank statement, or official letter
            (issued within the last 3 months).
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label
          className="inline-flex cursor-pointer items-center rounded-full border px-5 py-2 text-sm font-medium transition
          border-neutral-700 bg-black/70 text-neutral-100 hover:border-[#bfa76f]
          data-[success=true]:border-emerald-500 data-[success=true]:bg-emerald-600/10 data-[success=true]:text-emerald-300
          data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-60"
          data-success={isSuccess || undefined}
          data-disabled={isUploading || undefined}
        >
          <span>{buttonLabel}</span>
          <input
            type="file"
            accept="image/*,application/pdf"
            className="hidden"
            disabled={isUploading}
            onChange={handleChange}
          />
        </label>

        {fileName && (
          <p className="mt-1 text-xs text-neutral-400">
            {fileName}
            {typeof fileSize === "number" &&
              ` (${Math.round(fileSize / 1024)} KB)`}
          </p>
        )}
      </div>

      {/* Status line */}
      <div className="mt-3">
        {isSuccess && (
          <div className="flex items-center gap-2 text-xs text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Proof of address uploaded successfully.</span>
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-xs text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </section>
  );
};
