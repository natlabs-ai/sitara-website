// src/components/ProofOfAddressUploader.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { Section, DocumentUploadControl, type DocumentUploadStatus } from "@/components/ui";

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
  /** Called when user removes the uploaded document */
  onRemove?: () => void;
  /** Whether to show validation errors (set after Next is clicked) */
  showValidationErrors?: boolean;
  /** Whether this field has a validation error */
  hasError?: boolean;
  /** Initial status (for resuming with already-uploaded doc) */
  initialStatus?: DocumentUploadStatus;
  /** Initial filename (for resuming with already-uploaded doc) */
  initialFileName?: string | null;
}

export const ProofOfAddressUploader: React.FC<
  ProofOfAddressUploaderProps
> = ({
  tenantId,
  applicationId,
  applicantId,
  onUploaded,
  onRemove,
  showValidationErrors = false,
  hasError = false,
  initialStatus = "idle",
  initialFileName = null,
}) => {
  const [status, setStatus] = React.useState<DocumentUploadStatus>(initialStatus);
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

  const handleFileSelect = async (file: File) => {
    if (!tenantId || !applicationId) {
      setError("Application context is missing. Please restart the flow.");
      setStatus("error");
      return;
    }

    setError(null);
    setStatus("uploading");
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", String(tenantId));
      formData.append("application_id", String(applicationId));
      if (applicantId) {
        formData.append("applicant_id", String(applicantId));
      }

      const res = await fetch("/api/kora/documents/address", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => null);
        const detail =
          errJson?.detail ||
          "We couldn't upload your proof of address. Please try again.";
        throw new Error(detail);
      }

      const data = (await res.json()) as ProofOfAddressDocument;
      setStatus("success");
      onUploaded?.(data);
    } catch (err: any) {
      console.error("Proof-of-address upload failed", err);
      setError(
        err?.message ||
          "We couldn't upload your proof of address. Please try again.",
      );
      setStatus("error");
    }
  };

  // Only show asterisk when validation is triggered AND there's an error
  const showAsterisk = showValidationErrors && hasError;

  return (
    <Section
      title={<>Proof of Address{showAsterisk && <span className="text-red-400"> *</span>}</>}
      description="Upload a recent utility bill, bank statement, or official letter (issued within the last 3 months)."
    >
      <div className="mt-4">
        <DocumentUploadControl
          status={status}
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
