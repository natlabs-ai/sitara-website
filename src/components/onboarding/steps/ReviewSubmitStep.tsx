// src/app/onboarding/steps/ReviewSubmitStep.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import { DEV_MODE, GOLD } from "../onboardingShared";
import {
  fetchEvidencePack,
  listBeneficialOwners,
  listAuthorizedPersons,
  type EvidencePackResponse,
  type EvidencePackDocument,
  type BeneficialOwner,
  type AuthorizedPerson,
} from "@/lib/koraClient";
import { Section } from "@/components/ui";

function titleCase(s: string): string {
  if (!s) return s;
  return s
    .split(/[\s_\-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(" ");
}

function docTypeLabel(docType: string): string {
  return titleCase(docType);
}

function parseIsoToMs(v?: string | null): number | null {
  if (!v) return null;
  const ms = Date.parse(v);
  return Number.isFinite(ms) ? ms : null;
}

function formatTime(v?: string | null): string {
  if (!v) return "—";
  const ms = parseIsoToMs(v);
  if (!ms) return "—";
  try {
    return new Date(ms).toLocaleString();
  } catch {
    return v;
  }
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(dateStr: string | null | undefined): string {
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
}

// Document categorization
const DOCUMENT_CATEGORIES = {
  legal_existence: {
    title: "Legal Existence & Registration",
    types: [
      "trade_license", "business_license", "certificate_of_incorporation",
      "moa", "aoa", "memorandum_of_association", "articles_of_association",
      // New category names from refactored BusinessDocumentsStep
      "legal_existence_proof", "business_legal_existence_proof",
      "constitutional_documents", "business_constitutional_documents",
      // Legacy names for backwards compatibility
      "legal_existence", "constitutional_corporate",
    ],
  },
  tax_compliance: {
    title: "Tax & Compliance",
    types: [
      "tax_registration", "vat_certificate", "trn_certificate", "tax_registration_certificate",
      "business_tax_registration",
    ],
  },
  identity: {
    title: "Identity Documents",
    types: ["passport", "emirates_id_front", "emirates_id_back", "national_id"],
  },
  proof_of_address: {
    title: "Proof of Address",
    types: [
      "proof_of_address", "utility_bill", "bank_statement",
      // New category names from refactored BusinessDocumentsStep
      "business_address_proof", "business_business_address_proof",
      "operating_address_proof", "business_operating_address_proof",
      // Legacy names for backwards compatibility
      "registered_address", "operating_address",
    ],
  },
  business_activity: {
    title: "Business Activity Evidence",
    types: [
      "business_activity_evidence", "business_business_activity_evidence",
      "precious_metals_permits", "business_precious_metals_permits",
      // Legacy names for backwards compatibility
      "activity_evidence",
    ],
  },
  other: {
    title: "Additional Documents",
    types: [],
  },
};

type OwnerCardProps = {
  owner: BeneficialOwner;
  documents: EvidencePackDocument[];
  onViewDocument: (docId: string) => void;
};

function OwnerCard({ owner, documents, onViewDocument }: OwnerCardProps) {
  const isIndividual = owner.owner_type === "individual";

  // Find linked passport/ID document
  const idDocument = owner.individual_id_document_id
    ? documents.find((d) => d.id === owner.individual_id_document_id)
    : null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium text-neutral-100">
              {isIndividual
                ? owner.individual_full_name || "—"
                : owner.entity_legal_name || "—"}
            </div>
            {owner.is_ubo && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-900/20 text-emerald-300">
                UBO
              </span>
            )}
          </div>

          <div className="mt-1 space-y-0.5 text-xs text-neutral-400">
            {isIndividual ? (
              <>
                {owner.individual_nationality && (
                  <div>Nationality: {owner.individual_nationality}</div>
                )}
                {owner.individual_date_of_birth && (
                  <div>DOB: {formatDate(owner.individual_date_of_birth)}</div>
                )}
              </>
            ) : (
              <>
                {owner.entity_jurisdiction && (
                  <div>Jurisdiction: {owner.entity_jurisdiction}</div>
                )}
                {owner.entity_registration_number && (
                  <div>Reg. No: {owner.entity_registration_number}</div>
                )}
              </>
            )}

            <div className="flex items-center gap-2">
              {owner.ownership_percentage != null && (
                <span>Ownership: {owner.ownership_percentage}%</span>
              )}
              {owner.control_percentage != null && (
                <span>Control: {owner.control_percentage}%</span>
              )}
            </div>
          </div>

          {idDocument && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onViewDocument(idDocument.id)}
                style={{ borderColor: GOLD, color: GOLD }}
                className="text-xs px-3 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
              >
                View ID Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type SignatoryCardProps = {
  person: AuthorizedPerson;
  documents: EvidencePackDocument[];
  onViewDocument: (docId: string) => void;
};

function SignatoryCard({ person, documents, onViewDocument }: SignatoryCardProps) {
  // Find linked passport/ID document
  const idDocument = person.id_document_id
    ? documents.find((d) => d.id === person.id_document_id)
    : null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="text-sm font-medium text-neutral-100">
            {person.full_name}
          </div>

          <div className="mt-1 space-y-0.5 text-xs text-neutral-400">
            {person.role && <div>Role: {person.role}</div>}
            {person.email && <div>Email: {person.email}</div>}
          </div>

          {idDocument && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => onViewDocument(idDocument.id)}
                style={{ borderColor: GOLD, color: GOLD }}
                className="text-xs px-3 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
              >
                View ID Document
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

type DocumentSectionProps = {
  title: string;
  documents: EvidencePackDocument[];
  required: string[];
  missing: string[];
  onViewDocument: (docId: string) => void;
  getDocumentStatus: (doc: EvidencePackDocument) => { status: string; className: string };
};

function DocumentSection({
  title,
  documents,
  required,
  missing,
  onViewDocument,
  getDocumentStatus,
}: DocumentSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const uploadedCount = documents.length;
  const requiredCount = required.length;
  const isComplete = missing.length === 0 && requiredCount > 0;

  return (
    <Section className="bg-black/20 overflow-hidden">
      {/* Collapsible header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/40 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-neutral-100">{title}</span>
          {requiredCount > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              isComplete
                ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-300"
                : "border-amber-500/40 bg-amber-900/20 text-amber-300"
            }`}>
              {uploadedCount}/{requiredCount}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expandable content */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {documents.map((doc) => {
            const status = getDocumentStatus(doc);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-4 p-3 rounded-xl border border-neutral-800 bg-black/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-100">
                    {docTypeLabel(doc.document_type)}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {doc.file?.original_name || "—"} • {formatFileSize(doc.file?.size_bytes)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    Uploaded: {formatDate(doc.dates?.uploaded_at)}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full border ${status.className}`}>
                    {status.status}
                  </span>
                  <button
                    type="button"
                    onClick={() => onViewDocument(doc.id)}
                    style={{ borderColor: GOLD, color: GOLD }}
                    className="text-xs px-3 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
                  >
                    View
                  </button>
                </div>
              </div>
            );
          })}

          {/* Show missing documents */}
          {missing.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between gap-4 p-3 rounded-xl border border-amber-500/40 bg-amber-900/10"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-100">
                  {docTypeLabel(type)}
                </div>
                <div className="text-xs text-amber-300/80 mt-0.5">
                  Not uploaded
                </div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full border border-amber-500/40 bg-amber-900/20 text-amber-300">
                Missing
              </span>
            </div>
          ))}

          {documents.length === 0 && missing.length === 0 && (
            <div className="text-xs text-neutral-400 p-3">
              No documents in this category
            </div>
          )}
        </div>
      )}
    </Section>
  );
}

type ReviewSubmitStepProps = {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  setGlobalError?: (msg: string | null) => void;
  isSubmitting?: boolean;
};

export default function ReviewSubmitStep({
  answers,
  setValue,
  setGlobalError,
  isSubmitting,
}: ReviewSubmitStepProps) {
  const applicationId = answers.koraApplicationId as string | undefined;
  const isBusiness = answers.accountType === "business";

  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  // Beneficial owners and authorized persons
  const [beneficialOwners, setBeneficialOwners] = React.useState<BeneficialOwner[]>([]);
  const [authorizedPersons, setAuthorizedPersons] = React.useState<AuthorizedPerson[]>([]);

  // Prevent repeated auto-refresh loops
  const autoRefreshAttemptedRef = React.useRef(false);

  const evidence: EvidencePackResponse | null =
    (answers.evidencePack as EvidencePackResponse | null) ?? null;

  const requiredTypes: string[] = evidence?.derived?.required_document_types ?? [];
  const missingTypes: string[] = evidence?.derived?.missing_document_types ?? [];
  const latestByType: Record<string, string> =
    evidence?.derived?.latest_documents_by_type ?? {};

  const documents = Array.isArray(evidence?.documents) ? evidence!.documents : [];

  const _latestDocFor = React.useCallback(
    (docType: string) => {
      const latestId = latestByType?.[docType];
      if (!latestId) return null;
      return documents.find((d) => d.id === latestId) ?? null;
    },
    [documents, latestByType],
  );

  // ---- Server-driven staleness detection ----
  const generatedAtIso = evidence?.meta?.generated_at ?? null;
  const generatedAtMs = parseIsoToMs(generatedAtIso);

  const maxUploadedAtMs = React.useMemo(() => {
    let max: number | null = null;
    for (const d of documents) {
      const ms = parseIsoToMs(d?.dates?.uploaded_at ?? null);
      if (ms === null) continue;
      if (max === null || ms > max) max = ms;
    }
    return max;
  }, [documents]);

  const isStale =
    !!evidence &&
    generatedAtMs !== null &&
    maxUploadedAtMs !== null &&
    maxUploadedAtMs > generatedAtMs;

  const isComplete =
    !isBusiness || DEV_MODE || (!!evidence && (missingTypes?.length ?? 0) === 0);

  // Categorize documents
  const categorizedDocuments = React.useMemo(() => {
    const result: Record<string, { documents: EvidencePackDocument[]; required: string[]; missing: string[] }> = {};

    Object.keys(DOCUMENT_CATEGORIES).forEach((categoryKey) => {
      const category = DOCUMENT_CATEGORIES[categoryKey as keyof typeof DOCUMENT_CATEGORIES];
      const categoryDocs: EvidencePackDocument[] = [];
      const categoryRequired: string[] = [];
      const categoryMissing: string[] = [];

      // For "other" category, collect documents not in any other category
      if (categoryKey === "other") {
        const allCategorizedTypes = new Set(
          Object.values(DOCUMENT_CATEGORIES)
            .filter((c) => c.types.length > 0)
            .flatMap((c) => c.types)
        );

        documents.forEach((doc) => {
          if (!allCategorizedTypes.has(doc.document_type)) {
            categoryDocs.push(doc);
          }
        });

        requiredTypes.forEach((type) => {
          if (!allCategorizedTypes.has(type)) {
            categoryRequired.push(type);
            if (missingTypes.includes(type)) {
              categoryMissing.push(type);
            }
          }
        });
      } else {
        // For specific categories, filter by document type
        category.types.forEach((type) => {
          const docsOfType = documents.filter((d) => d.document_type === type);
          categoryDocs.push(...docsOfType);

          if (requiredTypes.includes(type)) {
            categoryRequired.push(type);
            if (missingTypes.includes(type)) {
              categoryMissing.push(type);
            }
          }
        });
      }

      if (categoryDocs.length > 0 || categoryRequired.length > 0) {
        result[categoryKey] = {
          documents: categoryDocs,
          required: categoryRequired,
          missing: categoryMissing,
        };
      }
    });

    return result;
  }, [documents, requiredTypes, missingTypes]);

  // Document viewing
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

  const getDocumentStatus = (doc: EvidencePackDocument): { status: string; className: string } => {
    const extractionStatus = doc.extraction?.status;
    const anyFailed = extractionStatus === "failed" || extractionStatus === "error";
    const uploaded = extractionStatus === "success" || extractionStatus === "pending";

    if (anyFailed) {
      return {
        status: "Upload failed",
        className: "border-red-500/40 bg-red-900/20 text-red-300",
      };
    }
    if (uploaded) {
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

  async function loadEvidence(opts?: { reason?: "manual" | "auto" }) {
    if (!isBusiness) return;

    if (!applicationId) {
      const msg =
        "Missing application reference. Please go back to Login and try again.";
      setLoadError(msg);
      setGlobalError?.(msg);
      return;
    }

    try {
      setLoading(true);
      setLoadError(null);

      // Only clear global error on manual refresh (auto refresh shouldn't flicker the top error)
      if (opts?.reason === "manual") setGlobalError?.(null);

      // Fetch evidence pack, beneficial owners, and authorized persons in parallel
      const [data, owners, persons] = await Promise.all([
        fetchEvidencePack(applicationId),
        listBeneficialOwners(applicationId),
        listAuthorizedPersons(applicationId),
      ]);

      // Store on answers so OnboardingRenderer can gate submit and reuse it.
      setValue("evidencePack", data);
      setValue("evidencePackFetchedAt", new Date().toISOString());

      // Update local state
      setBeneficialOwners(owners);
      setAuthorizedPersons(persons);
    } catch (e: any) {
      console.error("Failed to fetch evidence pack", e);
      const msg =
        e?.message || "Could not load evidence pack. Please try again or refresh.";
      setLoadError(msg);

      // For manual refresh, bubble it up
      if (opts?.reason === "manual") setGlobalError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isBusiness) return;

    // Auto-load when we land on submit step (business only)
    if (!evidence && applicationId) {
      loadEvidence({ reason: "auto" });
      return;
    }

    // If evidence exists but is stale, auto-refresh ONCE (optional, safe)
    if (evidence && isStale && applicationId && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      loadEvidence({ reason: "auto" });
      return;
    }

    // Always refresh when landing on review step to get latest owners/persons
    if (evidence && applicationId && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      loadEvidence({ reason: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusiness, applicationId, !!evidence, isStale]);

  const pill = (ok: boolean) =>
    `rounded-full border px-2.5 py-1 text-[11px] ${
      ok
        ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
        : "border-neutral-700 bg-neutral-900 text-neutral-300"
    }`;

  return (
    <div className="space-y-5">
      {isBusiness ? (
        <Section>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Business evidence pack
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                This section is derived from your onboarding resolution and the
                documents currently stored for this application.
              </p>

              {evidence ? (
                <div className="mt-2 text-[11px] text-neutral-500">
                  Generated:{" "}
                  <span className="text-neutral-300">
                    {formatTime(evidence.meta?.generated_at)}
                  </span>
                  {maxUploadedAtMs !== null ? (
                    <>
                      {" "}
                      · Latest upload:{" "}
                      <span className="text-neutral-300">
                        {formatTime(new Date(maxUploadedAtMs).toISOString())}
                      </span>
                    </>
                  ) : null}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              onClick={() => loadEvidence({ reason: "manual" })}
              disabled={loading || isSubmitting}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition ${
                loading || isSubmitting
                  ? "cursor-not-allowed bg-neutral-800 text-neutral-500"
                  : "border border-[--gold-color] text-[--gold-color] hover:bg-[--gold-bg-soft]"
              }`}
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          </div>

          {/* Staleness banner (server-driven) */}
          {evidence && isStale ? (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
              Evidence pack may be out of date (a newer document upload exists).
              Please refresh to ensure this page reflects the latest documents.
            </div>
          ) : null}

          <div className="mt-4">
            {!evidence ? (
              <div className="rounded-xl border border-neutral-800 bg-black/25 p-4 text-xs text-neutral-300">
                {loading
                  ? "Loading evidence pack…"
                  : loadError
                    ? loadError
                    : "Evidence pack not loaded yet."}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Document sets
                    </div>
                    <div className="mt-2 text-xs text-neutral-200">
                      {(evidence.derived?.document_sets || []).length
                        ? (evidence.derived?.document_sets || [])
                            .map((s) => titleCase(String(s)))
                            .join(", ")
                        : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Required types
                    </div>
                    <div className="mt-2 text-xs text-neutral-200">
                      {requiredTypes.length ? requiredTypes.length : "—"}
                    </div>
                  </div>

                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                      Completeness
                    </div>
                    <div className="mt-2">
                      {DEV_MODE ? (
                        <span className={pill(true)}>DEV_MODE (not gated)</span>
                      ) : missingTypes.length === 0 ? (
                        <span className={pill(true)}>Complete</span>
                      ) : (
                        <span className={pill(false)}>
                          Missing {missingTypes.length}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Ownership Structure */}
                {beneficialOwners.length > 0 && (
                  <Section className="mt-4 bg-black/20">
                    <div className="text-sm font-semibold text-neutral-100 mb-3">
                      Ownership Structure
                    </div>
                    <div className="space-y-2">
                      {beneficialOwners.map((owner) => (
                        <OwnerCard
                          key={owner.id}
                          owner={owner}
                          documents={documents}
                          onViewDocument={handleViewDocument}
                        />
                      ))}
                    </div>
                  </Section>
                )}

                {/* Authorized Signatories */}
                {authorizedPersons.length > 0 && (
                  <Section className="mt-4 bg-black/20">
                    <div className="text-sm font-semibold text-neutral-100 mb-3">
                      Authorized Signatories
                    </div>
                    <div className="space-y-2">
                      {authorizedPersons.map((person) => (
                        <SignatoryCard
                          key={person.id}
                          person={person}
                          documents={documents}
                          onViewDocument={handleViewDocument}
                        />
                      ))}
                    </div>
                  </Section>
                )}

                {/* Categorized Document Sections */}
                <div className="mt-4 space-y-3">
                  {Object.keys(categorizedDocuments).map((categoryKey) => {
                    const category = DOCUMENT_CATEGORIES[categoryKey as keyof typeof DOCUMENT_CATEGORIES];
                    const data = categorizedDocuments[categoryKey];

                    return (
                      <DocumentSection
                        key={categoryKey}
                        title={category.title}
                        documents={data.documents}
                        required={data.required}
                        missing={data.missing}
                        onViewDocument={handleViewDocument}
                        getDocumentStatus={getDocumentStatus}
                      />
                    );
                  })}

                  {Object.keys(categorizedDocuments).length === 0 && (
                    <div className="rounded-xl border border-neutral-800 bg-black/25 p-4 text-xs text-neutral-300">
                      No required document types were returned. This usually
                      means onboarding resolution has not been stored yet.
                    </div>
                  )}

                  {!DEV_MODE && missingTypes.length > 0 ? (
                    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
                      Missing documents must be uploaded before you can submit.
                    </div>
                  ) : null}
                </div>
              </>
            )}
          </div>
        </Section>
      ) : null}

      <input type="hidden" value={String(isComplete)} readOnly />
    </div>
  );
}
