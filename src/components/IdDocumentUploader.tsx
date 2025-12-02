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
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [fileSize, setFileSize] = React.useState<number | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);
  const [summary, setSummary] = React.useState<{
    fullName?: string | null;
    nationality?: string | null;
  } | null>(null);

  const updateStatus = (next: IdExtractStatus) => {
    setStatus(next);
    onStatusChange?.(next);
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setSummary(null);
    setMessage(null);
    updateStatus("processing");

    try {
      const form = new FormData();
      form.append("file", file);

      // 🔗 attach linkage IDs so backend can relate this passport
      if (tenantId) form.append("tenantId", tenantId);
      if (applicationId) form.append("applicationId", applicationId);
      if (applicantId) form.append("applicantId", applicantId);

      const res = await fetch("/api/documents/id", {
        method: "POST",
        body: form,
      });

      // Read raw text so we can always log something
      const rawText = await res.text();
      let body: any = null;
      try {
        body = rawText ? JSON.parse(rawText) : null;
      } catch {
        body = { raw: rawText };
      }

      if (!res.ok) {
        console.error("ID doc error status", res.status);
        console.error("ID doc error body", body);
        updateStatus("error");
        setMessage(
          body?.error ||
            body?.detail ||
            body?.raw ||
            "We couldn’t read this document. Please upload a clearer scan or photo."
        );
        return;
      }

      const data = body as IdExtracted;
      onExtracted?.(data);

      const autoFill: IdAutoFill = data.autoFill || {};

      const fullName =
        autoFill.fullName ||
        data.extracted?.fullName ||
        [data.extracted?.firstName, data.extracted?.lastName]
          .filter(Boolean)
          .join(" ");

      const nationality =
        autoFill.nationality || data.extracted?.nationality || null;

      autoFill.fullName = fullName || null;
      autoFill.nationality = nationality;

      setSummary({ fullName, nationality });
      setMessage("Details extracted and applied to your profile.");
      updateStatus("success");

      onAutoFill?.(autoFill);
    } catch (err) {
      console.error("ID extraction failed Error:", err);
      updateStatus("error");
      setMessage(
        "Unexpected error analyzing ID document. Please try again or use a clearer image."
      );
    }
  };

  const renderStatusBanner = () => {
    if (status === "processing") {
      return (
        <p className="mt-3 text-sm text-amber-300 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full border-2 border-amber-300 border-t-transparent animate-spin" />
          Verifying your ID document…
        </p>
      );
    }

    if (status === "success") {
      return (
        <p className="mt-3 text-sm text-emerald-300 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-emerald-400" />
          {message || "Details extracted and applied to your profile."}
        </p>
      );
    }

    if (status === "error") {
      return (
        <p className="mt-3 text-sm text-amber-300 flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full bg-amber-400" />
          {message ||
            "We couldn’t read this file. Please upload a clearer image or scan."}
        </p>
      );
    }

    return null;
  };

  const renderSummary = () => {
    if (!summary) return null;

    return (
      <div className="mt-4 rounded-xl border border-neutral-700 bg-black/40 px-4 py-3 text-sm text-neutral-100">
        <div className="font-medium mb-1">Extracted summary</div>
        {summary.fullName && (
          <div className="text-neutral-200">
            <span className="text-neutral-400">Name:</span>{" "}
            {summary.fullName}
          </div>
        )}
        {summary.nationality && (
          <div className="text-neutral-200">
            <span className="text-neutral-400">Nationality:</span>{" "}
            {summary.nationality}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-neutral-800 bg-black/40 px-6 py-5">
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-100">
          Passport / ID <span className="text-red-400">*</span>
        </h3>
        <p className="mt-1 text-xs text-neutral-400">
          Upload a clear scan or photo; Sitara will securely extract key
          details (name, date of birth, nationality, document number, etc.).
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="inline-flex items-center justify-center rounded-full border border-neutral-600 px-4 py-1.5 text-xs font-medium text-neutral-100 hover:border-neutral-400 cursor-pointer">
          <span>Choose File</span>
          <input
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>

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
      {renderSummary()}
    </div>
  );
};
