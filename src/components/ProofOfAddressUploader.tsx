// src/components/ProofOfAddressUploader.tsx
"use client";

import React, { useState } from "react";

type UploadStatus = "idle" | "uploading" | "success" | "error";

interface ProofOfAddressUploaderProps {
  tenantId: string;
  applicationId: string;
  applicantId?: string | null;
  onUploaded?: (doc: { id: string; verified_status?: string }) => void;
}

export function ProofOfAddressUploader({
  tenantId,
  applicationId,
  applicantId,
  onUploaded,
}: ProofOfAddressUploaderProps) {
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [status, setStatus] = useState<UploadStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  async function uploadFile(file: File) {
    setStatus("uploading");
    setError(null);
    setFileName(file.name);
    setFileSize(file.size ?? null);

    const formData = new FormData();
    formData.append("tenant_id", tenantId);
    formData.append("application_id", applicationId);
    if (applicantId) {
      formData.append("applicant_id", applicantId);
    }
    formData.append("file", file);

    try {
      const res = await fetch("/api/documents/address", {
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
        console.error("PoA upload failed", res.status, data);
        setStatus("error");
        setError(
          data?.detail ||
            data?.error ||
            data?.raw ||
            "Proof of address upload failed."
        );
        return;
      }

      setStatus("success");
      onUploaded?.({
        id: data.id,
        verified_status: data.verified_status,
      });
    } catch (err) {
      console.error("PoA upload error", err);
      setStatus("error");
      setError("Unexpected error while uploading file.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    uploadFile(selected);
  }

  function renderStatusBanner() {
    if (status === "uploading") {
      return (
        <p className="mt-3 text-sm text-amber-300 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
          Uploading your proof of address…
        </p>
      );
    }

    if (status === "success") {
      return (
        <p className="mt-3 text-sm text-emerald-300 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-400" />
          Proof of address uploaded successfully.
        </p>
      );
    }

    if (status === "error") {
      return (
        <p className="mt-3 text-sm text-amber-300 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
          {error ||
            "We couldn’t upload this file. Please try again with a clearer document."}
        </p>
      );
    }

    return null;
  }

  return (
    <div className="rounded-2xl border border-neutral-800 bg-black/40 px-6 py-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-100">
          Proof of Address <span className="text-red-400">*</span>
        </h3>
        <p className="mt-1 text-xs text-neutral-400">
          Upload a recent utility bill, bank statement, or official letter
          (issued within the last 3 months).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* Button – identical classes to Passport / ID uploader */}
        <label className="inline-flex items-center justify-center rounded-full border border-neutral-600 px-4 py-1.5 text-xs font-medium text-neutral-100 hover:border-neutral-400 cursor-pointer">
          <span>Choose File</span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

        {/* Right-hand text – identical layout */}
        <div className="flex-1 text-xs text-right text-neutral-400 truncate">
          {fileName ? (
            <>
              {fileName}
              {typeof fileSize === "number" && (
                <span className="text-neutral-500">
                  {" "}
                  ({Math.round(fileSize / 1024)} KB)
                </span>
              )}
            </>
          ) : (
            "No file chosen"
          )}
        </div>
      </div>

      {renderStatusBanner()}
    </div>
  );
}
