// src/app/onboarding/steps/PersonalReviewStep.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */

"use client";

import React, { useState, useEffect } from "react";
import { GOLD } from "../onboardingShared";
import { Section } from "@/components/ui";

interface Document {
  id: string;
  document_type: string;
  category: string | null;
  original_file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_at: string | null;
  verified_status: string;
  extraction_status: string;
  extraction_confidence: number | null;
  extracted_json: any;
}

interface PersonalReviewStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
}

const LOW_CONFIDENCE_THRESHOLD = 0.70;

export const PersonalReviewStep: React.FC<PersonalReviewStepProps> = ({
  answers,
  setValue,
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [editReason, setEditReason] = useState("");

  const applicationId = answers.koraApplicationId as string | undefined;

  // Fetch documents on mount
  useEffect(() => {
    if (!applicationId) {
      setLoading(false);
      return;
    }

    fetch(`/api/kora/documents/applications/${applicationId}/documents`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        setDocuments(data.documents || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Failed to fetch documents:", err);
        setLoading(false);
      });
  }, [applicationId]);

  // Extract name and nationality from documents with confidence
  const extractedData = React.useMemo(() => {
    let fullName = { value: answers.fullName, confidence: null as number | null, source: "manual" };
    let nationality = { value: answers.nationality, confidence: null as number | null, source: "manual" };

    documents.forEach((doc) => {
      if (doc.extracted_json) {
        const extracted = doc.extracted_json.extracted || {};

        // Check for full name
        if (extracted.fullName) {
          fullName = {
            value: extracted.fullName,
            confidence: doc.extraction_confidence,
            source: doc.document_type,
          };
        }

        // Check for nationality
        if (extracted.nationality) {
          nationality = {
            value: extracted.nationality,
            confidence: doc.extraction_confidence,
            source: doc.document_type,
          };
        }
      }
    });

    return { fullName, nationality };
  }, [documents, answers.fullName, answers.nationality]);

  const handleViewDocument = async (docId: string) => {
    try {
      console.log("Fetching view URL for document:", docId);
      const res = await fetch(`/api/kora/documents/${docId}/view`, { credentials: 'include' });

      console.log("Response status:", res.status);
      const data = await res.json();
      console.log("Response data:", data);

      if (!res.ok) {
        throw new Error(data.detail || "Failed to generate view URL");
      }

      if (data.view_url) {
        console.log("Opening URL:", data.view_url);
        window.open(data.view_url, "_blank");
      } else {
        throw new Error("No view_url in response");
      }
    } catch (err) {
      console.error("Failed to generate view URL:", err);
      alert(`Failed to open document: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  const handleEditField = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue || "");
    setEditReason("");
  };

  const handleSaveEdit = () => {
    if (!editValue.trim()) {
      alert("Please enter a value");
      return;
    }

    // Save the edited value
    setValue(editingField!, editValue);

    // TODO: Save to FactOverride table via API
    // For now, just update local state
    console.log("Saving override:", {
      field: editingField,
      oldValue: editingField === "fullName" ? extractedData.fullName.value : extractedData.nationality.value,
      newValue: editValue,
      reason: editReason,
    });

    setEditingField(null);
    setEditValue("");
    setEditReason("");
  };

  // Group and filter documents for display
  const displayDocuments = React.useMemo(() => {
    const isUAE = answers.countryOfResidence === "United Arab Emirates";
    const grouped: Array<{
      id: string;
      type: string;
      displayName: string;
      files: Document[];
      shouldShow: boolean;
    }> = [];

    // Group Emirates ID front and back
    const emiratesIdFront = documents.find(d => d.document_type === "emirates_id_front");
    const emiratesIdBack = documents.find(d => d.document_type === "emirates_id_back");

    if (emiratesIdFront || emiratesIdBack) {
      grouped.push({
        id: emiratesIdFront?.id || emiratesIdBack?.id || "eid",
        type: "emirates_id",
        displayName: "Emirates ID",
        files: [emiratesIdFront, emiratesIdBack].filter(Boolean) as Document[],
        shouldShow: isUAE,
      });
    }

    // Add Passport
    const passport = documents.find(d => d.document_type === "passport" || d.document_type === "national_id");
    if (passport) {
      grouped.push({
        id: passport.id,
        type: "passport",
        displayName: "Passport",
        files: [passport],
        shouldShow: true,
      });
    }

    // Add Proof of Address
    const poa = documents.find(d => d.document_type === "proof_of_address");
    if (poa) {
      grouped.push({
        id: poa.id,
        type: "proof_of_address",
        displayName: "Proof of Address",
        files: [poa],
        shouldShow: true,
      });
    }

    return grouped.filter(g => g.shouldShow);
  }, [documents, answers.countryOfResidence]);

  const getDocumentStatus = (files: Document[]): { status: string; className: string } => {
    const anyFailed = files.some(f => f.extraction_status === "failed" || f.extraction_status === "error");
    // Consider both "success" and "pending" as uploaded (pending means no extraction needed, like PoA)
    const allUploaded = files.every(f =>
      f.extraction_status === "success" ||
      f.extraction_status === "pending"
    );

    if (anyFailed) {
      return {
        status: "Upload failed",
        className: "border-red-500/40 bg-red-900/20 text-red-300",
      };
    }
    if (allUploaded) {
      return {
        status: "Uploaded",
        className: "border-emerald-500/40 bg-emerald-900/20 text-emerald-300",
      };
    }
    return {
      status: "Processing",
      className: "border-amber-500/40 bg-amber-900/20 text-amber-300",
    };
  };

  const getLatestUploadDate = (files: Document[]): string | null => {
    const dates = files.map(f => f.uploaded_at).filter(Boolean) as string[];
    if (dates.length === 0) return null;
    return dates.sort().reverse()[0];
  };

  const formatFileSize = (bytes: number | null): string => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const isLowConfidence = (confidence: number | null): boolean => {
    return confidence !== null && confidence < LOW_CONFIDENCE_THRESHOLD;
  };

  const formatFrequency = (freq: string | null): string => {
    if (!freq) return "Not specified";
    const frequencyMap: Record<string, string> = {
      occasional: "Occasional",
      monthly: "Monthly",
      weekly: "Weekly",
      high_frequency: "High frequency",
      unsure: "Not sure yet",
    };
    return frequencyMap[freq] || freq.charAt(0).toUpperCase() + freq.slice(1);
  };

  const formatValue = (val: string | null): string => {
    if (!val) return "Not specified";
    const valueMap: Record<string, string> = {
      lt_50k: "Up to AED 50,000",
      "50k_250k": "AED 50,000 – 250,000",
      "250k_1m": "AED 250,000 – 1,000,000",
      gt_1m: "Above AED 1,000,000",
      unsure: "Not sure yet",
    };
    return valueMap[val] || val;
  };

  const formatServiceName = (service: string): string => {
    const serviceMap: Record<string, string> = {
      buy_gold: "Buy gold",
      sell_gold: "Sell gold",
      vault_storage: "Vault storage",
      secure_logistics: "Secure logistics",
    };
    return serviceMap[service] || service.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  const services = Array.isArray(answers.selectedServices)
    ? answers.selectedServices.map((s: string) => formatServiceName(s))
    : [];

  const formatServicesList = (servicesList: string[]): string => {
    if (servicesList.length === 0) return "None selected";
    if (servicesList.length === 1) return servicesList[0];
    if (servicesList.length === 2) return `${servicesList[0]} and ${servicesList[1]}`;
    // For 3+: "A, B, C and D"
    const allButLast = servicesList.slice(0, -1).join(", ");
    const last = servicesList[servicesList.length - 1];
    return `${allButLast} and ${last}`;
  };

  const formatDocumentType = (type: string): string => {
    const typeMap: Record<string, string> = {
      passport: "Passport",
      emirates_id_front: "Emirates ID",
      emirates_id_back: "Emirates ID",
      proof_of_address: "Proof of Address",
      national_id: "National ID",
    };
    return typeMap[type] || type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">
          Review your application
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Please confirm the details below before sending your application to the Sitara compliance team.
        </p>
        <p className="mt-2 text-[11px] text-neutral-500">
          Most applications are reviewed within{" "}
          <span className="text-neutral-200">1–2 business days</span>.
        </p>
      </Section>

      {/* Identity Section - Document-derived fields */}
      <div className="grid gap-4 md:grid-cols-2">
        <Section>
          <div className="flex items-center justify-between mb-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
              Identity
            </div>
            <span className="text-[10px] text-neutral-500">
              From documents
            </span>
          </div>

          <div className="space-y-4 text-xs">
            {/* Full Name */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="text-neutral-400">Full name</span>
                {extractedData.fullName.source !== "manual" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/20 text-emerald-300 border border-emerald-800/40">
                    {formatDocumentType(extractedData.fullName.source)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-100 font-medium">
                  {extractedData.fullName.value || "—"}
                </span>
                {isLowConfidence(extractedData.fullName.confidence) && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleEditField("fullName", extractedData.fullName.value)}
                      className="text-[10px] px-2 py-0.5 rounded border border-amber-600/40 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 transition"
                    >
                      Low confidence - Edit
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Nationality */}
            <div>
              <div className="flex items-start justify-between gap-3 mb-1">
                <span className="text-neutral-400">Nationality</span>
                {extractedData.nationality.source !== "manual" && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/20 text-emerald-300 border border-emerald-800/40">
                    {formatDocumentType(extractedData.nationality.source)}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-100 font-medium">
                  {extractedData.nationality.value || "—"}
                </span>
                {isLowConfidence(extractedData.nationality.confidence) && (
                  <button
                    type="button"
                    onClick={() => handleEditField("nationality", extractedData.nationality.value)}
                    className="text-[10px] px-2 py-0.5 rounded border border-amber-600/40 bg-amber-900/20 text-amber-300 hover:bg-amber-900/40 transition"
                  >
                    Low confidence - Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        </Section>

        {/* Contact */}
        <Section>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-4">
            Contact
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-400">Email</span>
              <span className="text-neutral-100">
                {answers.email || "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-neutral-400">Mobile</span>
              <span className="text-neutral-100">
                {answers.phone || "—"}
              </span>
            </div>
          </div>
        </Section>
      </div>

      {/* Profile & Expected Use */}
      <Section>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-4">
          Profile & expected use
        </div>

        <div className="grid gap-3 md:grid-cols-2 text-xs">
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Occupation</span>
            <span className="text-neutral-100">
              {answers.occupation || "Not provided"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Expected frequency</span>
            <span className="text-neutral-100">
              {formatFrequency(answers.expectedFrequency)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Source of income</span>
            <span className="text-neutral-100">
              {answers.sourceOfIncome || "Not provided"}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3">
            <span className="text-neutral-400">Typical value</span>
            <span className="text-neutral-100">
              {formatValue(answers.expectedValue)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-3 md:col-span-2">
            <span className="text-neutral-400">Service categories</span>
            <span className="text-neutral-100">
              {formatServicesList(services)}
            </span>
          </div>
        </div>
      </Section>

      {/* Risk Declarations */}
      <Section>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-4">
          Risk declarations
        </div>

        <div className="space-y-3 text-xs">
          {[
            { label: "Politically Exposed Person (PEP)", value: answers.ind_pepSelf },
            { label: "Sanctions / restrictions", value: answers.ind_sanctionsSelf },
            { label: "Acting on behalf of a third party", value: answers.ind_thirdPartyUse },
          ].map((item) => {
            const answered = typeof item.value === "boolean";
            const isYes = item.value === true;

            return (
              <div key={item.label} className="flex items-center justify-between gap-3">
                <span className="text-neutral-300">{item.label}</span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-[11px] ${
                    !answered
                      ? "border-neutral-700 bg-neutral-900 text-neutral-300"
                      : "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
                  }`}
                >
                  {!answered ? "Not answered" : isYes ? "Yes" : "No"}
                </span>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Documents Section - Enhanced */}
      <Section>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-4">
          Uploaded documents
        </div>

        {loading ? (
          <div className="text-sm text-neutral-400 py-4">Loading documents...</div>
        ) : displayDocuments.length === 0 ? (
          <div className="text-sm text-neutral-400 py-4">No documents uploaded yet</div>
        ) : (
          <div className="space-y-3">
            {displayDocuments.map((docGroup) => {
              const status = getDocumentStatus(docGroup.files);
              const uploadDate = getLatestUploadDate(docGroup.files);
              const totalSize = docGroup.files.reduce((sum, f) => sum + (f.file_size_bytes || 0), 0);

              return (
                <div
                  key={docGroup.id}
                  className="flex items-center justify-between gap-4 p-3 rounded-xl border border-neutral-800 bg-black/40"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-neutral-100">
                      {docGroup.displayName}
                    </div>
                    <div className="text-xs text-neutral-400 mt-0.5">
                      {docGroup.files.length > 1
                        ? `${docGroup.files.length} files • ${formatFileSize(totalSize)}`
                        : `${docGroup.files[0].original_file_name || "—"} • ${formatFileSize(totalSize)}`
                      }
                    </div>
                    <div className="text-[10px] text-neutral-500 mt-1">
                      Uploaded: {formatDate(uploadDate)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-2 py-1 rounded-full border ${status.className}`}>
                      {status.status}
                    </span>

                    {docGroup.files.length === 1 ? (
                      <button
                        type="button"
                        onClick={() => handleViewDocument(docGroup.files[0].id)}
                        style={{ borderColor: GOLD, color: GOLD }}
                        className="text-xs px-3 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
                      >
                        View
                      </button>
                    ) : (
                      <div className="flex gap-1">
                        {docGroup.files.map((file, idx) => (
                          <button
                            key={file.id}
                            type="button"
                            onClick={() => handleViewDocument(file.id)}
                            style={{ borderColor: GOLD, color: GOLD }}
                            className="text-xs px-2 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
                            title={`View ${idx === 0 ? 'Front' : 'Back'}`}
                          >
                            {idx === 0 ? 'Front' : 'Back'}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Section>

      {/* Declaration with Privacy & Terms */}
      <Section>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400 mb-3">
          Declaration
        </div>

        <p className="text-[11px] leading-relaxed text-neutral-400 mb-4">
          By submitting this application, you confirm that all information and documents provided are true,
          accurate, and complete to the best of your knowledge. You understand that Sitara may request
          additional information or documentation, and that providing false or misleading information may
          result in your account being declined or closed and, where required, reported to the relevant
          authorities under applicable AML / CFT regulations.
        </p>

        <div className="space-y-3">
          {/* Main declaration */}
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={answers.submitDeclarationAccepted === true}
              onChange={(e) => setValue("submitDeclarationAccepted", e.target.checked)}
              style={{ accentColor: GOLD }}
              className="mt-[2px] h-4 w-4 rounded border-neutral-700 bg-neutral-950"
            />
            <span className="text-xs text-neutral-200">
              I confirm the above statements and authorise Sitara to use this information to perform
              customer due diligence and ongoing compliance checks.
            </span>
          </label>

          {/* Privacy Policy */}
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={answers.privacyPolicyAccepted === true}
              onChange={(e) => setValue("privacyPolicyAccepted", e.target.checked)}
              style={{ accentColor: GOLD }}
              className="mt-[2px] h-4 w-4 rounded border-neutral-700 bg-neutral-950"
            />
            <span className="text-xs text-neutral-200">
              I have read and agree to the{" "}
              <a
                href="/privacy-policy"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: GOLD }}
                className="underline hover:no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                Privacy Policy
              </a>
            </span>
          </label>

          {/* Terms of Service */}
          <label className="flex cursor-pointer items-start gap-2">
            <input
              type="checkbox"
              checked={answers.termsAccepted === true}
              onChange={(e) => setValue("termsAccepted", e.target.checked)}
              style={{ accentColor: GOLD }}
              className="mt-[2px] h-4 w-4 rounded border-neutral-700 bg-neutral-950"
            />
            <span className="text-xs text-neutral-200">
              I accept the{" "}
              <a
                href="/terms-of-service"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: GOLD }}
                className="underline hover:no-underline"
                onClick={(e) => e.stopPropagation()}
              >
                Terms of Service
              </a>
            </span>
          </label>
        </div>
      </Section>

      {/* Edit Field Modal */}
      {editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-950 p-6">
            <h3 className="text-lg font-semibold text-neutral-100 mb-4">
              Edit {editingField === "fullName" ? "Full Name" : "Nationality"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  Corrected Value <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm text-neutral-300 mb-2">
                  Reason for correction (optional)
                </label>
                <textarea
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  rows={2}
                  placeholder="e.g., OCR misread character, missing middle name"
                  className="w-full rounded-lg border border-neutral-800 bg-black/60 px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:border-[#bfa76f] focus:outline-none focus:ring-1 focus:ring-[#bfa76f]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingField(null)}
                  className="flex-1 rounded-lg border border-neutral-700 bg-neutral-900 px-4 py-2 text-sm text-neutral-100 hover:bg-neutral-800 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  style={{ backgroundColor: GOLD }}
                  className="flex-1 rounded-lg px-4 py-2 text-sm font-medium text-black hover:opacity-90 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PersonalReviewStep;
