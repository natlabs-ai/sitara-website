// src/components/IdDocumentUploader.tsx
"use client";

import React from "react";
import type { IdExtracted } from "@/types/IdExtracted";

export type IdExtractStatus = "idle" | "processing" | "success" | "error";

export type IdAutoFill = {
  fullName?: string | null;
  nationality?: string | null;
  nationalityCode?: string | null;
  dateOfBirth?: string | null;
};

interface IdDocumentUploaderProps {
  applicationId?: string | null;
  applicantId?: string | null;
  tenantId?: string | null;
  onStatusChange?: (status: IdExtractStatus) => void;
  onExtracted?: (payload: IdExtracted) => void;
  onAutoFill?: (autoFill: IdAutoFill) => void;
}

export const IdDocumentUploader: React.FC<IdDocumentUploaderProps> = ({
  applicationId,
  applicantId,
  tenantId,
  onStatusChange,
  onExtracted,
  onAutoFill,
}) => {
  const [status, setStatus] = React.useState<IdExtractStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<number | null>(null);

  const updatingStatus = (next: IdExtractStatus) => {
    setStatus(next);
    onStatusChange?.(next);
  };

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setFileName(file.name);
    setFileSize(file.size);
    updatingStatus("processing");

    try {
      const formData = new FormData();
      formData.append("file", file);
      if (tenantId) formData.append("tenant_id", tenantId);
      if (applicationId) formData.append("application_id", applicationId);
      if (applicantId) formData.append("applicant_id", applicantId);

      const res = await fetch("/api/documents/id", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail =
          errJson?.detail ||
          "We couldn’t upload your ID document. Please try again.";
        throw new Error(detail);
      }

      const data = await res.json();

      // Pass through to consumer
      if (data.extracted) {
        onExtracted?.(data.extracted as IdExtracted);
      }
      if (data.autoFill) {
        onAutoFill?.(data.autoFill as IdAutoFill);
      }

      updatingStatus("success");
    } catch (err: any) {
      console.error("ID document upload failed", err);
      setError(
        err?.message ||
          "We couldn’t upload your ID document. Please try again.",
      );
      updatingStatus("error");
    }
  };

  const isUploading = status === "processing";
  const isSuccess = status === "success";

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
            Passport / ID <span className="text-red-400">*</span>
          </h2>
          <p className="mt-1 text-xs text-neutral-400 max-w-xl">
            Upload a clear scan or photo; Sitara will securely extract key
            details (name, date of birth, nationality, document number, etc.).
          </p>
        </div>
      </div>

      <div className="mt-4">
        <label className="inline-flex cursor-pointer items-center rounded-full border px-5 py-2 text-sm font-medium transition
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
            onChange={handleFileChange}
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
            <span>ID document uploaded successfully.</span>
          </div>
        )}
        {status === "error" && error && (
          <div className="flex items-center gap-2 text-xs text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </section>
  );
};
