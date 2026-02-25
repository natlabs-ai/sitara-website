//src\components\IdDocumentUploader.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React from "react";
import type { IdExtracted } from "@/types/IdExtracted";
import { Section, DocumentUploadControl, type DocumentUploadStatus } from "@/components/ui";

export type IdExtractStatus = "idle" | "processing" | "success" | "error";

export type IdAutoFill = {
  fullName?: string | null;
  nationality?: string | null;
  nationalityCode?: string | null;
  dateOfBirth?: string | null;
};

export type IdUploadResult = {
  savedDocumentId?: string | number | null;
  savedPassportId?: string | number | null;
  storage?: {
    container?: string;
    blobName?: string;
    url?: string;
  } | null;
  /** Original filename of the uploaded file */
  fileName?: string | null;
};

interface IdDocumentUploaderProps {
  applicationId?: string | null;
  applicantId?: string | null;
  tenantId?: string | null;
  onStatusChange?: (status: IdExtractStatus) => void;
  onExtracted?: (payload: IdExtracted) => void;
  onAutoFill?: (autoFill: IdAutoFill) => void;
  /** Whether to show validation errors (set after Next is clicked) */
  showValidationErrors?: boolean;
  /** Whether this field has a validation error */
  hasError?: boolean;

  /** Optional: lets the parent store doc id in answers */
  onUploaded?: (result: IdUploadResult) => void;

  /** Called when user removes the uploaded document */
  onRemove?: () => void;

  /** Initial status (for resuming with already-uploaded doc) */
  initialStatus?: IdExtractStatus;

  /** Initial filename (for resuming with already-uploaded doc) */
  initialFileName?: string | null;
}

// All calls go through the Sitara proxy — no direct Kora access from the browser

function extractErrorMessage(errJson: any): string | null {
  if (!errJson) return null;
  return (
    errJson.detail ||
    errJson.error ||
    errJson.message ||
    (typeof errJson === "string" ? errJson : null)
  );
}

async function readJsonOrText(res: Response): Promise<any> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// Map internal status to DocumentUploadControl status
function mapToUploadStatus(status: IdExtractStatus): DocumentUploadStatus {
  switch (status) {
    case "processing":
      return "uploading";
    case "success":
      return "success";
    case "error":
      return "error";
    default:
      return "idle";
  }
}

export const IdDocumentUploader: React.FC<IdDocumentUploaderProps> = ({
  applicationId,
  applicantId,
  tenantId,
  onStatusChange,
  onExtracted,
  onAutoFill,
  onUploaded,
  onRemove,
  showValidationErrors = false,
  hasError = false,
  initialStatus = "idle",
  initialFileName = null,
}) => {
  const [status, setStatus] = React.useState<IdExtractStatus>(initialStatus);
  const [error, setError] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(initialFileName);

  // Update from initial props if they change (e.g., resuming flow)
  React.useEffect(() => {
    if (initialStatus !== "idle") {
      setStatus(initialStatus);
    }
  }, [initialStatus]);

  React.useEffect(() => {
    if (initialFileName) {
      setFileName(initialFileName);
    }
  }, [initialFileName]);

  const handleRemove = () => {
    setStatus("idle");
    setFileName(null);
    setError(null);
    onRemove?.();
  };

  const updatingStatus = (next: IdExtractStatus) => {
    setStatus(next);
    onStatusChange?.(next);
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setFileName(file.name);
    updatingStatus("processing");

    try {
      // Build multipart exactly as FastAPI expects
      const formData = new FormData();
      formData.append("file", file);

      // Use snake_case keys (matches your backend conventions)
      if (tenantId) formData.append("tenant_id", tenantId);
      if (applicationId) formData.append("application_id", applicationId);
      if (applicantId) formData.append("applicant_id", applicantId);

      const url = `/api/kora/documents/id`;

      const res = await fetch(url, {
        method: "POST",
        body: formData,
        // DO NOT set Content-Type manually for FormData
      });

      const payload = await readJsonOrText(res);

      if (!res.ok) {
        const detail =
          extractErrorMessage(payload) ||
          payload?.raw ||
          "We couldn't upload your ID document. Please try again.";
        throw new Error(detail);
      }

      const data = payload ?? {};

      // Maintain existing behaviour
      if (data.extracted) onExtracted?.(data.extracted as IdExtracted);
      if (data.autoFill) onAutoFill?.(data.autoFill as IdAutoFill);

      onUploaded?.({
        savedDocumentId: data.savedDocumentId ?? data.saved_document_id ?? null,
        savedPassportId: data.savedPassportId ?? data.saved_passport_id ?? null,
        storage: data.storage ?? null,
        fileName: file.name,
      });

      updatingStatus("success");
    } catch (err: any) {
      console.error("ID document upload failed", err);
      setError(err?.message || "Upload failed. Please try again.");
      updatingStatus("error");
    }
  };

  // Only show asterisk when validation is triggered AND there's an error
  const showAsterisk = showValidationErrors && hasError;

  return (
    <Section
      title={<>Passport ID{showAsterisk && <span className="text-red-400"> *</span>}</>}
    >
      <div className="mt-4">
        <DocumentUploadControl
          status={mapToUploadStatus(status)}
          errorMessage={error}
          onFileSelect={handleFileSelect}
          onRemove={onRemove ? handleRemove : undefined}
          accept="image/*,application/pdf"
          maxSizeMB={10}
          fileName={status === "success" ? fileName : undefined}
        />
        {showValidationErrors && hasError && (
          <p className="mt-2 text-xs text-red-400">This field is required.</p>
        )}
      </div>
    </Section>
  );
};

export default IdDocumentUploader;
