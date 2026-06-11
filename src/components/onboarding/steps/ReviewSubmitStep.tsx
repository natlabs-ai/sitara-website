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

// ─── Utility helpers ─────────────────────────────────────────────────────────

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

function formatVal(v: any): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) {
    const strs = v.map((x) => titleCase(String(x))).filter(Boolean);
    return strs.length ? strs.join(", ") : "—";
  }
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return titleCase(String(v));
}

// ─── Document categorization ─────────────────────────────────────────────────

const DOCUMENT_CATEGORIES = {
  legal_existence: {
    title: "Legal Existence & Registration",
    types: [
      "trade_license", "business_license", "certificate_of_incorporation",
      "moa", "aoa", "memorandum_of_association", "articles_of_association",
      "legal_existence_proof", "business_legal_existence_proof",
      "constitutional_documents", "business_constitutional_documents",
      "legal_existence", "constitutional_corporate",
    ],
  },
  tax_compliance: {
    title: "Tax & Compliance",
    types: [
      "tax_registration", "vat_certificate", "trn_certificate",
      "tax_registration_certificate", "business_tax_registration",
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
      "business_address_proof", "business_business_address_proof",
      "operating_address_proof", "business_operating_address_proof",
      "registered_address", "operating_address",
    ],
  },
  business_activity: {
    title: "Business Activity Evidence",
    types: [
      "business_activity_evidence", "business_business_activity_evidence",
      "precious_metals_permits", "business_precious_metals_permits",
      "activity_evidence",
    ],
  },
  other: {
    title: "Additional Documents",
    types: [],
  },
};

// ─── Small shared primitives ─────────────────────────────────────────────────

type StatusLevel = "complete" | "attention" | "incomplete";

function StatusBadge({ level }: { level: StatusLevel }) {
  const cfg: Record<StatusLevel, { label: string; cls: string }> = {
    complete: {
      label: "✓ Complete",
      cls: "border-emerald-500/40 bg-emerald-900/20 text-emerald-300",
    },
    attention: {
      label: "⚠ Attention",
      cls: "border-amber-500/40 bg-amber-900/20 text-amber-300",
    },
    incomplete: {
      label: "✗ Incomplete",
      cls: "border-red-500/40 bg-red-900/20 text-red-300",
    },
  };
  const { label, cls } = cfg[level];
  return (
    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

function FieldRow({ label, value }: { label: string; value: any }) {
  const display = formatVal(value);
  if (!display || display === "—") return null;
  return (
    <div className="flex items-start justify-between gap-3 py-1 text-xs">
      <span className="text-neutral-400 shrink-0">{label}</span>
      <span className="text-neutral-100 text-right">{display}</span>
    </div>
  );
}

// ─── Collapsible ReviewCard ───────────────────────────────────────────────────

type ReviewCardProps = {
  title: string;
  preview?: string;
  status: StatusLevel;
  onEdit?: () => void;
  children: React.ReactNode;
  defaultOpen?: boolean;
};

function ReviewCard({
  title,
  preview,
  status,
  onEdit,
  children,
  defaultOpen = false,
}: ReviewCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-xl border border-neutral-800 bg-black/30 overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Toggle */}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex-1 flex items-center gap-3 text-left min-w-0"
        >
          <svg
            className={`w-4 h-4 text-neutral-400 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          <span className="text-sm font-medium text-neutral-100">{title}</span>
          {!open && preview ? (
            <span className="text-xs text-neutral-500 truncate hidden sm:block">{preview}</span>
          ) : null}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <StatusBadge level={status} />
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              style={{ borderColor: GOLD, color: GOLD }}
              className="text-xs px-2.5 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
            >
              {/* pencil icon */}
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828A2 2 0 019 16H7v-2a2 2 0 01.586-1.414z"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expandable body */}
      {open && (
        <div className="px-4 pb-4 pt-1 border-t border-neutral-800/60 divide-y divide-neutral-800/40">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Owner / Signatory mini-cards ─────────────────────────────────────────────

function OwnerCard({
  owner,
  documents,
  onViewDocument,
}: {
  owner: BeneficialOwner;
  documents: EvidencePackDocument[];
  onViewDocument: (id: string) => void;
}) {
  const isIndividual = owner.owner_type === "individual";
  const idDoc = owner.individual_id_document_id
    ? documents.find((d) => d.id === owner.individual_id_document_id)
    : null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-black/40 p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-neutral-100">
              {isIndividual ? owner.individual_full_name || "—" : owner.entity_legal_name || "—"}
            </span>
            {owner.is_ubo && (
              <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-500/40 bg-emerald-900/20 text-emerald-300">
                UBO
              </span>
            )}
          </div>
          <div className="mt-1 space-y-0.5 text-xs text-neutral-400">
            {isIndividual ? (
              <>
                {owner.individual_nationality && <div>Nationality: {owner.individual_nationality}</div>}
                {owner.individual_date_of_birth && <div>DOB: {formatDate(owner.individual_date_of_birth)}</div>}
              </>
            ) : (
              <>
                {owner.entity_jurisdiction && <div>Jurisdiction: {owner.entity_jurisdiction}</div>}
                {owner.entity_registration_number && <div>Reg. No: {owner.entity_registration_number}</div>}
              </>
            )}
            <div className="flex items-center gap-2">
              {owner.ownership_percentage != null && <span>Ownership: {owner.ownership_percentage}%</span>}
              {owner.control_percentage != null && <span>Control: {owner.control_percentage}%</span>}
            </div>
          </div>
          {idDoc && (
            <button
              type="button"
              onClick={() => onViewDocument(idDoc.id)}
              style={{ borderColor: GOLD, color: GOLD }}
              className="mt-2 text-xs px-3 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
            >
              View ID Document
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function SignatoryCard({
  person,
  documents,
  onViewDocument,
}: {
  person: AuthorizedPerson;
  documents: EvidencePackDocument[];
  onViewDocument: (id: string) => void;
}) {
  const idDoc = person.id_document_id
    ? documents.find((d) => d.id === person.id_document_id)
    : null;

  return (
    <div className="rounded-xl border border-neutral-800 bg-black/40 p-3">
      <div className="text-sm font-medium text-neutral-100">{person.full_name}</div>
      <div className="mt-1 space-y-0.5 text-xs text-neutral-400">
        {person.role && <div>Role: {person.role}</div>}
        {person.email && <div>Email: {person.email}</div>}
      </div>
      {idDoc && (
        <button
          type="button"
          onClick={() => onViewDocument(idDoc.id)}
          style={{ borderColor: GOLD, color: GOLD }}
          className="mt-2 text-xs px-3 py-1 rounded-lg border hover:bg-[#bfa76f]/10 transition"
        >
          View ID Document
        </button>
      )}
    </div>
  );
}

// ─── Document section (collapsible, categorized) ──────────────────────────────

function getDocumentStatus(doc: EvidencePackDocument): { status: string; className: string } {
  const extractionStatus = doc.extraction?.status;
  const anyFailed = extractionStatus === "failed" || extractionStatus === "error";
  const uploaded = extractionStatus === "success" || extractionStatus === "pending";
  if (anyFailed) return { status: "Upload failed", className: "border-red-500/40 bg-red-900/20 text-red-300" };
  if (uploaded) return { status: "Uploaded", className: "border-emerald-500/40 bg-emerald-900/20 text-emerald-300" };
  return { status: "Processing", className: "border-amber-500/40 bg-amber-900/20 text-amber-300" };
}

function DocumentSection({
  title,
  documents,
  required,
  missing,
  onViewDocument,
}: {
  title: string;
  documents: EvidencePackDocument[];
  required: string[];
  missing: string[];
  onViewDocument: (id: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const isComplete = missing.length === 0 && required.length > 0;

  return (
    <Section className="bg-black/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-4 hover:bg-black/40 transition"
      >
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-neutral-100">{title}</span>
          {required.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full border ${
              isComplete
                ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-300"
                : "border-amber-500/40 bg-amber-900/20 text-amber-300"
            }`}>
              {documents.length}/{required.length}
            </span>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-neutral-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0 space-y-3">
          {documents.map((doc) => {
            const s = getDocumentStatus(doc);
            return (
              <div
                key={doc.id}
                className="flex items-center justify-between gap-4 p-3 rounded-xl border border-neutral-800 bg-black/40"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-100">{docTypeLabel(doc.document_type)}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {doc.file?.original_name || "—"} · {formatFileSize(doc.file?.size_bytes)}
                  </div>
                  <div className="text-[10px] text-neutral-500 mt-1">
                    Uploaded: {formatDate(doc.dates?.uploaded_at)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] px-2 py-1 rounded-full border ${s.className}`}>{s.status}</span>
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

          {missing.map((type) => (
            <div
              key={type}
              className="flex items-center justify-between gap-4 p-3 rounded-xl border border-amber-500/40 bg-amber-900/10"
            >
              <div className="flex-1">
                <div className="text-sm font-medium text-neutral-100">{docTypeLabel(type)}</div>
                <div className="text-xs text-amber-300/80 mt-0.5">Not uploaded</div>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-full border border-amber-500/40 bg-amber-900/20 text-amber-300">
                Missing
              </span>
            </div>
          ))}

          {documents.length === 0 && missing.length === 0 && (
            <div className="text-xs text-neutral-400 p-3">No documents in this category</div>
          )}
        </div>
      )}
    </Section>
  );
}

// ─── Pill helper ──────────────────────────────────────────────────────────────

function pill(ok: boolean) {
  return `rounded-full border px-2.5 py-1 text-[11px] ${
    ok
      ? "border-emerald-500/40 bg-emerald-900/20 text-emerald-200"
      : "border-neutral-700 bg-neutral-900 text-neutral-300"
  }`;
}

// ─── Props ────────────────────────────────────────────────────────────────────

type ReviewSubmitStepProps = {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  setGlobalError?: (msg: string | null) => void;
  isSubmitting?: boolean;
  goToStep?: (stepId: string) => void;
};

// ─── IndividualCards props ────────────────────────────────────────────────────

type IndividualCardsProps = {
  answers: Record<string, any>;
  goToStep?: (stepId: string) => void;
};

function IndividualCards({ answers, goToStep }: IndividualCardsProps) {
  const a = answers;
  const idFields = (a.idConfirmedFields as Record<string, any>) ?? {};
  const get = (key: string) => idFields[key] ?? a[key];

  const isUAE = String(a.nationality ?? "").toLowerCase() === "ae" ||
    String(a.countryOfResidence ?? "").toLowerCase() === "ae";

  // Status helpers
  const hasIdentity = !!(get("fullName") || get("dateOfBirth") || get("nationality"));
  const hasProfile = !!(a.occupation || a.sourceOfIncome);
  const pepRisk = !!(a.ind_pepSelf === true || a.ind_pepSelf === "true" ||
    a.ind_sanctionsSelf === true || a.ind_sanctionsSelf === "true" ||
    a.ind_thirdPartyUse === true || a.ind_thirdPartyUse === "true");
  const hasPassport = !!(a.passportDocId || a.idDocumentDocId);
  const hasAddress = !!a.proofOfAddressDocId;
  const hasEmiratesId = !!(a.emiratesIdFrontDocId && a.emiratesIdBackDocId);
  const docsOk = hasPassport && (!isUAE || hasEmiratesId) && hasAddress;

  // Source of income display
  const soi = a.sourceOfIncome;
  let soiDisplay = "—";
  if (soi) {
    if (typeof soi === "string") {
      soiDisplay = soi;
    } else if (typeof soi === "object") {
      const { selected = [], other_details = "" } = soi as { selected?: string[]; other_details?: string };
      const INCOME_LABEL: Record<string, string> = {
        salary: "Salary / employment income", business_profits: "Business profits",
        rental: "Rental income", investments: "Investment returns",
        pension: "Pension / retirement funds", inheritance: "Inheritance / gift", other: "Other",
      };
      const labels = (selected as string[]).map((v) => INCOME_LABEL[v] ?? v).join(", ");
      soiDisplay = other_details?.trim() ? `${labels} (${other_details.trim()})` : labels || "—";
    }
  }

  return (
    <>
      {/* 1. Account */}
      <ReviewCard
        title="Account"
        preview={a.email}
        status={a.email ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("login") : undefined}
      >
        <FieldRow label="Email" value={a.email} />
        <FieldRow label="Phone" value={a.phone} />
      </ReviewCard>

      {/* 2. Identity */}
      <ReviewCard
        title="Identity"
        preview={get("fullName")}
        status={hasIdentity ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("identity") : undefined}
      >
        <FieldRow label="Full name" value={get("fullName")} />
        <FieldRow label="Date of birth" value={get("dateOfBirth")} />
        <FieldRow label="Nationality" value={get("nationality")} />
        <FieldRow label="Passport number" value={get("passportNumber")} />
        <FieldRow label="Country of residence" value={get("countryOfResidence")} />
      </ReviewCard>

      {/* 3. Profile & Expected Use */}
      <ReviewCard
        title="Profile & Expected Use"
        preview={a.occupation}
        status={hasProfile ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("profile") : undefined}
      >
        <FieldRow label="Occupation" value={a.occupation} />
        <FieldRow label="Source of income" value={soiDisplay} />
        <FieldRow label="Service categories" value={a.selectedServices} />
        <FieldRow label="Expected frequency" value={a.expectedFrequency} />
        <FieldRow label="Expected value" value={a.expectedValue} />
      </ReviewCard>

      {/* 4. Risk Declarations */}
      <ReviewCard
        title="Risk Declarations"
        status={pepRisk ? "attention" : "complete"}
        onEdit={goToStep ? () => goToStep("riskDeclarations") : undefined}
      >
        <FieldRow label="Politically exposed person (PEP)" value={a.ind_pepSelf === true || a.ind_pepSelf === "true" ? "Yes" : "No"} />
        <FieldRow label="Sanctions / restrictions" value={a.ind_sanctionsSelf === true || a.ind_sanctionsSelf === "true" ? "Yes" : "No"} />
        <FieldRow label="Acting on behalf of third party" value={a.ind_thirdPartyUse === true || a.ind_thirdPartyUse === "true" ? "Yes" : "No"} />
      </ReviewCard>

      {/* 5. Documents */}
      <ReviewCard
        title="Documents"
        status={docsOk ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("identity") : undefined}
      >
        <div className="space-y-1 py-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Passport / ID</span>
            <span className={hasPassport ? "text-emerald-300" : "text-neutral-400"}>
              {hasPassport ? "Uploaded" : "Not uploaded"}
            </span>
          </div>
          {isUAE && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-neutral-400">Emirates ID (front + back)</span>
              <span className={hasEmiratesId ? "text-emerald-300" : "text-neutral-400"}>
                {hasEmiratesId ? "Uploaded" : "Not uploaded"}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-400">Proof of address</span>
            <span className={hasAddress ? "text-emerald-300" : "text-neutral-400"}>
              {hasAddress ? "Uploaded" : "Not uploaded"}
            </span>
          </div>
        </div>
      </ReviewCard>
    </>
  );
}

// ─── BusinessCards props ──────────────────────────────────────────────────────

type BusinessCardsProps = {
  answers: Record<string, any>;
  goToStep?: (stepId: string) => void;
  beneficialOwners: BeneficialOwner[];
  authorizedPersons: AuthorizedPerson[];
  documents: EvidencePackDocument[];
  evidence: EvidencePackResponse | null;
  missingTypes: string[];
  loading: boolean;
  loadError: string | null;
  handleViewDocument: (docId: string) => void;
};

function BusinessCards({
  answers,
  goToStep,
  beneficialOwners,
  authorizedPersons,
  documents,
  evidence,
  missingTypes,
  loading,
  loadError,
  handleViewDocument,
}: BusinessCardsProps) {
  const a = answers;

  const hasCash = Array.isArray(a.relationship_payment_methods)
    ? (a.relationship_payment_methods as string[]).includes("cash")
    : String(a.relationship_payment_methods ?? "").includes("cash");

  const hasOwners = beneficialOwners.length > 0 || !!(a.owners && Array.isArray(a.owners) && a.owners.length > 0);
  const hasPersons = authorizedPersons.length > 0;

  const amlFields = ["pep_exposure", "sanctions_screening", "ubo_disclosed_verified", "aml_policy", "kyc_sops"];
  const amlFilled = amlFields.filter((f) => a[f] !== undefined && a[f] !== null && a[f] !== "").length;

  const hasDocuments = documents.length > 0;

  return (
    <>
      {/* 1. Account */}
      <ReviewCard
        title="Account"
        preview={a.email}
        status={a.email ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("login") : undefined}
      >
        <FieldRow label="Email" value={a.email} />
        <FieldRow label="Phone" value={a.phone} />
      </ReviewCard>

      {/* 2. Company Identity */}
      <ReviewCard
        title="Company Identity"
        preview={a.incCountry}
        status={a.incCountry ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("companyDetails") : undefined}
      >
        <FieldRow label="Country of incorporation" value={a.incCountry} />
        <FieldRow label="Company name" value={a.companyName} />
        <FieldRow label="Registration number" value={a.registrationNumber} />
      </ReviewCard>

      {/* 3. Relationship Profile */}
      <ReviewCard
        title="Relationship Profile"
        status={hasCash ? "attention" : (a.transaction_direction ? "complete" : "incomplete")}
        onEdit={goToStep ? () => goToStep("relationship") : undefined}
      >
        <FieldRow label="Transaction direction" value={a.transaction_direction} />
        <FieldRow label="Products / services" value={a.relationship_products} />
        <FieldRow label="Frequency" value={a.relationship_frequency} />
        <FieldRow label="Value band (USD)" value={a.relationship_value_band_usd} />
        <FieldRow label="Payment methods" value={a.relationship_payment_methods} />
        {hasCash && (
          <div className="text-xs text-amber-300 py-1">
            ⚠ Cash payment method selected — additional scrutiny may apply.
          </div>
        )}
      </ReviewCard>

      {/* 4. Beneficial Owners */}
      <ReviewCard
        title="Beneficial Owners"
        status={hasOwners ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("ownership") : undefined}
      >
        {beneficialOwners.length > 0 ? (
          <div className="space-y-2 py-2">
            {beneficialOwners.map((owner) => (
              <OwnerCard
                key={owner.id}
                owner={owner}
                documents={documents}
                onViewDocument={handleViewDocument}
              />
            ))}
          </div>
        ) : Array.isArray(a.owners) && a.owners.length > 0 ? (
          <div className="space-y-1 py-1">
            {(a.owners as any[]).map((o, i) => (
              <div key={o.id ?? i} className="text-xs text-neutral-300">
                {o.name || "—"}{o.share != null ? ` — ${o.share}%` : ""}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-neutral-400 py-1">No owners recorded.</div>
        )}
      </ReviewCard>

      {/* 5. Authorised Persons */}
      <ReviewCard
        title="Authorised Persons"
        status={hasPersons ? "complete" : "incomplete"}
        onEdit={goToStep ? () => goToStep("authorisedPeople") : undefined}
      >
        {authorizedPersons.length > 0 ? (
          <div className="space-y-2 py-2">
            {authorizedPersons.map((person) => (
              <SignatoryCard
                key={person.id}
                person={person}
                documents={documents}
                onViewDocument={handleViewDocument}
              />
            ))}
          </div>
        ) : (
          <div className="text-xs text-neutral-400 py-1">No authorised persons recorded.</div>
        )}
      </ReviewCard>

      {/* 6. AML Compliance */}
      <ReviewCard
        title="AML Compliance"
        preview={`${amlFilled}/${amlFields.length} answered`}
        status={amlFilled === amlFields.length ? "complete" : amlFilled > 0 ? "attention" : "incomplete"}
        onEdit={goToStep ? () => goToStep("questionnaire") : undefined}
      >
        <FieldRow label="PEP exposure" value={a.pep_exposure} />
        <FieldRow label="Sanctions screening" value={a.sanctions_screening} />
        <FieldRow label="UBO disclosed & verified" value={a.ubo_disclosed_verified} />
        <FieldRow label="AML policy in place" value={a.aml_policy} />
        <FieldRow label="KYC SOPs in place" value={a.kyc_sops} />
      </ReviewCard>

      {/* 7. Documents */}
      <ReviewCard
        title="Documents"
        status={!evidence ? "incomplete" : (missingTypes.length === 0 || DEV_MODE) ? "complete" : "attention"}
        onEdit={goToStep ? () => goToStep("companyDetails") : undefined}
      >
        {!evidence ? (
          <div className="text-xs text-neutral-400 py-1">
            {loading ? "Loading evidence pack…" : loadError ?? "Evidence pack not loaded yet."}
          </div>
        ) : hasDocuments ? (
          <div className="text-xs text-neutral-300 py-1">
            {documents.length} document{documents.length !== 1 ? "s" : ""} uploaded.
            {missingTypes.length > 0 && !DEV_MODE && (
              <span className="text-amber-300 ml-1">{missingTypes.length} missing.</span>
            )}
          </div>
        ) : (
          <div className="text-xs text-neutral-400 py-1">No documents uploaded yet.</div>
        )}
      </ReviewCard>
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReviewSubmitStep({
  answers,
  setValue,
  setGlobalError,
  isSubmitting,
  goToStep,
}: ReviewSubmitStepProps) {
  const applicationId = answers.koraApplicationId as string | undefined;
  const isBusiness = answers.accountType === "business";

  const [loading, setLoading] = React.useState(false);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const [beneficialOwners, setBeneficialOwners] = React.useState<BeneficialOwner[]>([]);
  const [authorizedPersons, setAuthorizedPersons] = React.useState<AuthorizedPerson[]>([]);

  const autoRefreshAttemptedRef = React.useRef(false);

  const evidence: EvidencePackResponse | null =
    (answers.evidencePack as EvidencePackResponse | null) ?? null;

  const requiredTypes = React.useMemo<string[]>(
    () => evidence?.derived?.required_document_types ?? [],
    [evidence],
  );
  const missingTypes = React.useMemo<string[]>(
    () => evidence?.derived?.missing_document_types ?? [],
    [evidence],
  );
  const latestByType = React.useMemo<Record<string, string>>(
    () => evidence?.derived?.latest_documents_by_type ?? {},
    [evidence],
  );
  const documents = React.useMemo(
    () => (Array.isArray(evidence?.documents) ? evidence!.documents : []),
    [evidence],
  );

  const _latestDocFor = React.useCallback(
    (docType: string) => {
      const latestId = latestByType?.[docType];
      if (!latestId) return null;
      return documents.find((d) => d.id === latestId) ?? null;
    },
    [documents, latestByType],
  );
  void _latestDocFor;

  // ── Staleness ──
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

  // ── Categorize documents ──
  const categorizedDocuments = React.useMemo(() => {
    const result: Record<string, { documents: EvidencePackDocument[]; required: string[]; missing: string[] }> = {};

    Object.keys(DOCUMENT_CATEGORIES).forEach((categoryKey) => {
      const category = DOCUMENT_CATEGORIES[categoryKey as keyof typeof DOCUMENT_CATEGORIES];
      const categoryDocs: EvidencePackDocument[] = [];
      const categoryRequired: string[] = [];
      const categoryMissing: string[] = [];

      if (categoryKey === "other") {
        const allCategorizedTypes = new Set(
          Object.values(DOCUMENT_CATEGORIES)
            .filter((c) => c.types.length > 0)
            .flatMap((c) => c.types)
        );
        documents.forEach((doc) => {
          if (!allCategorizedTypes.has(doc.document_type)) categoryDocs.push(doc);
        });
        requiredTypes.forEach((type) => {
          if (!allCategorizedTypes.has(type)) {
            categoryRequired.push(type);
            if (missingTypes.includes(type)) categoryMissing.push(type);
          }
        });
      } else {
        category.types.forEach((type) => {
          const docsOfType = documents.filter((d) => d.document_type === type);
          categoryDocs.push(...docsOfType);
          if (requiredTypes.includes(type)) {
            categoryRequired.push(type);
            if (missingTypes.includes(type)) categoryMissing.push(type);
          }
        });
      }

      if (categoryDocs.length > 0 || categoryRequired.length > 0) {
        result[categoryKey] = { documents: categoryDocs, required: categoryRequired, missing: categoryMissing };
      }
    });

    return result;
  }, [documents, requiredTypes, missingTypes]);

  // ── Document viewing ──
  const handleViewDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/kora/documents/${docId}/view`, { credentials: "include" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to generate view URL");
      if (data.view_url) window.open(data.view_url, "_blank");
      else throw new Error("No view_url in response");
    } catch (err) {
      alert(`Failed to open document: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  };

  // ── Load evidence ──
  async function loadEvidence(opts?: { reason?: "manual" | "auto" }) {
    if (!isBusiness) return;
    if (!applicationId) {
      const msg = "Missing application reference. Please go back to Login and try again.";
      setLoadError(msg);
      setGlobalError?.(msg);
      return;
    }
    try {
      setLoading(true);
      setLoadError(null);
      if (opts?.reason === "manual") setGlobalError?.(null);
      const [data, owners, persons] = await Promise.all([
        fetchEvidencePack(applicationId),
        listBeneficialOwners(applicationId),
        listAuthorizedPersons(applicationId),
      ]);
      setValue("evidencePack", data);
      setValue("evidencePackFetchedAt", new Date().toISOString());
      setBeneficialOwners(owners);
      setAuthorizedPersons(persons);
    } catch (e: any) {
      const msg = e?.message || "Could not load evidence pack. Please try again or refresh.";
      setLoadError(msg);
      if (opts?.reason === "manual") setGlobalError?.(msg);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    if (!isBusiness) return;
    if (!evidence && applicationId) { loadEvidence({ reason: "auto" }); return; }
    if (evidence && isStale && applicationId && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      loadEvidence({ reason: "auto" });
      return;
    }
    if (evidence && applicationId && !autoRefreshAttemptedRef.current) {
      autoRefreshAttemptedRef.current = true;
      loadEvidence({ reason: "auto" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isBusiness, applicationId, !!evidence, isStale]);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Review cards */}
      {isBusiness ? (
        <BusinessCards
          answers={answers}
          goToStep={goToStep}
          beneficialOwners={beneficialOwners}
          authorizedPersons={authorizedPersons}
          documents={documents}
          evidence={evidence}
          missingTypes={missingTypes}
          loading={loading}
          loadError={loadError}
          handleViewDocument={handleViewDocument}
        />
      ) : (
        <IndividualCards answers={answers} goToStep={goToStep} />
      )}

      {/* Business: evidence pack detail section */}
      {isBusiness && (
        <Section>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-400">
                Business evidence pack
              </div>
              <p className="mt-1 text-xs text-neutral-400">
                Derived from your onboarding resolution and the documents stored for this application.
              </p>
              {evidence && (
                <div className="mt-2 text-[11px] text-neutral-500">
                  Generated:{" "}
                  <span className="text-neutral-300">{formatTime(evidence.meta?.generated_at)}</span>
                  {maxUploadedAtMs !== null && (
                    <>
                      {" · "}Latest upload:{" "}
                      <span className="text-neutral-300">
                        {formatTime(new Date(maxUploadedAtMs).toISOString())}
                      </span>
                    </>
                  )}
                </div>
              )}
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

          {evidence && isStale && (
            <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
              Evidence pack may be out of date. Please refresh to ensure this page reflects the latest documents.
            </div>
          )}

          <div className="mt-4">
            {!evidence ? (
              <div className="rounded-xl border border-neutral-800 bg-black/25 p-4 text-xs text-neutral-300">
                {loading ? "Loading evidence pack…" : loadError ? loadError : "Evidence pack not loaded yet."}
              </div>
            ) : (
              <>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Document sets</div>
                    <div className="mt-2 text-xs text-neutral-200">
                      {(evidence.derived?.document_sets || []).length
                        ? (evidence.derived?.document_sets || []).map((s) => titleCase(String(s))).join(", ")
                        : "—"}
                    </div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Required types</div>
                    <div className="mt-2 text-xs text-neutral-200">{requiredTypes.length || "—"}</div>
                  </div>
                  <div className="rounded-xl border border-neutral-800 bg-black/25 p-4">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Completeness</div>
                    <div className="mt-2">
                      {DEV_MODE ? (
                        <span className={pill(true)}>DEV_MODE (not gated)</span>
                      ) : missingTypes.length === 0 ? (
                        <span className={pill(true)}>Complete</span>
                      ) : (
                        <span className={pill(false)}>Missing {missingTypes.length}</span>
                      )}
                    </div>
                  </div>
                </div>

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
                      />
                    );
                  })}

                  {Object.keys(categorizedDocuments).length === 0 && (
                    <div className="rounded-xl border border-neutral-800 bg-black/25 p-4 text-xs text-neutral-300">
                      No required document types were returned. This usually means onboarding resolution has not been stored yet.
                    </div>
                  )}

                  {!DEV_MODE && missingTypes.length > 0 && (
                    <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-900/15 p-4 text-xs text-amber-100/90">
                      Missing documents must be uploaded before you can submit.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </Section>
      )}

      <input type="hidden" value={String(isComplete)} readOnly />
    </div>
  );
}
