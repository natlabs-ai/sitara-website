// src/components/onboarding/ApplicationSummary.tsx
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import {
  listBeneficialOwners,
  listAuthorizedPersons,
  type BeneficialOwner,
  type AuthorizedPerson,
} from "@/lib/koraClient";
import questionSpec from "@/config/questions/uae_business_questions.v1.json";

/** Returns true if a document field (any shape) has at least one uploaded doc */
function hasDoc(raw: any): boolean {
  if (!raw) return false;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return Array.isArray(raw.docs) && raw.docs.length > 0;
  }
  if (Array.isArray(raw)) return raw.length > 0;
  if (typeof raw === "string") return raw.length > 0;
  return false;
}

/** Resolves a questionnaire answer value to its human-readable label */
function resolveQLabel(code: string, value: any): string {
  const def = (questionSpec.questions as any[]).find((q) => q.code === code);
  if (!def) return String(value ?? "—");
  if (def.type === "ack") return value === true ? "✓ Acknowledged" : "—";
  if (def.type === "country_multi_select_iso2") {
    if (!Array.isArray(value) || value.length === 0) return "—";
    return value.join(", ");
  }
  if (def.type === "single_select") {
    const opt = (def.options || []).find((o: any) => o.value === value);
    return opt?.label || String(value ?? "—");
  }
  return String(value ?? "—");
}

/** Single label → value row */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 py-2.5 border-b border-neutral-800/60 last:border-0">
      <span className="text-xs text-neutral-500 w-52 shrink-0 leading-relaxed">{label}</span>
      <span className="text-xs text-neutral-200 flex-1 leading-relaxed">{value || "—"}</span>
    </div>
  );
}

/** Upload status badge */
function DocStatus({ uploaded }: { uploaded: boolean }) {
  return uploaded ? (
    <span className="inline-flex items-center gap-1.5 text-xs text-green-400">
      <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
      Uploaded
    </span>
  ) : (
    <span className="text-xs text-neutral-600">Not provided</span>
  );
}

/** Titled card section */
function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-black/20 overflow-hidden">
      <div className="px-4 py-2.5 bg-neutral-900/80 border-b border-neutral-800">
        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400">
          {title}
        </h4>
      </div>
      <div className="px-4 py-1">{children}</div>
    </div>
  );
}

/** ── Individual summary ── */
function IndividualSummary({ answers }: { answers: Record<string, any> }) {
  const hasId =
    !!answers.passportDocId ||
    !!answers.identityDocId ||
    !!answers.idDocumentDocId ||
    hasDoc(answers.passportDocId) ||
    hasDoc(answers.identityDocId);
  const hasPoA = !!answers.proofOfAddressDocId;

  const services = Array.isArray(answers.selectedServices)
    ? answers.selectedServices.join(", ")
    : answers.selectedServices || "—";

  return (
    <div className="space-y-4">
      <SummarySection title="Personal Details">
        <Row label="Full name" value={answers.fullName} />
        <Row label="Nationality" value={answers.nationality} />
        <Row label="Date of birth" value={answers.dateOfBirth} />
        <Row label="Occupation" value={answers.occupation} />
        <Row label="Source of income" value={(() => {
          const raw = answers.sourceOfIncome;
          if (!raw) return undefined;
          if (typeof raw === "string") return raw;
          const LABEL: Record<string, string> = {
            salary: "Salary / employment income", business_profits: "Business profits",
            rental: "Rental income", investments: "Investment returns",
            pension: "Pension / retirement funds", inheritance: "Inheritance / gift", other: "Other",
          };
          const { selected = [], other_details = "" } = raw as { selected?: string[]; other_details?: string };
          const labels = selected.map((v: string) => LABEL[v] ?? v).join(", ");
          return other_details.trim() ? `${labels} (${other_details.trim()})` : labels;
        })()} />
      </SummarySection>

      <SummarySection title="Services">
        <Row label="Selected services" value={services} />
      </SummarySection>

      <SummarySection title="Documents">
        <Row label="Identity document" value={<DocStatus uploaded={hasId} />} />
        <Row label="Proof of address" value={<DocStatus uploaded={hasPoA} />} />
      </SummarySection>
    </div>
  );
}

/** ── Business summary ── */
function BusinessSummary({
  answers,
  owners,
  persons,
}: {
  answers: Record<string, any>;
  owners: BeneficialOwner[];
  persons: AuthorizedPerson[];
}) {
  const profile = (answers.companyProfile as any) ?? {};
  const q = (answers.questionnaire as Record<string, any>) ?? {};

  const addressLabel =
    answers.addressClassification === "registered"
      ? "Registered business address"
      : answers.addressClassification === "operating"
      ? "Operating address (different from registered)"
      : "—";

  return (
    <div className="space-y-4">
      {/* Company Details */}
      <SummarySection title="Company Details">
        <Row label="Legal name" value={profile.legal_name} />
        <Row label="Trading name" value={profile.trading_name} />
        <Row label="Registration number" value={profile.registration_number} />
        <Row label="Legal form" value={profile.legal_form} />
        <Row label="Country of incorporation" value={answers.incCountry} />
        <Row label="Licence number" value={profile.license_number} />
        <Row label="Licence expiry" value={profile.license_expiry_date} />
        <Row label="Tax registration number" value={profile.tax_registration_number} />
      </SummarySection>

      {/* Section A */}
      <SummarySection title="Section A — Company Incorporation">
        <Row
          label="Proof of legal existence"
          value={<DocStatus uploaded={hasDoc(answers.legal_existence_proof_files)} />}
        />
        <Row
          label="Constitutional / corporate documents"
          value={<DocStatus uploaded={hasDoc(answers.constitutional_documents_files)} />}
        />
      </SummarySection>

      {/* Section B */}
      <SummarySection title="Section B — Address & Tax">
        <Row
          label="Proof of business address"
          value={<DocStatus uploaded={hasDoc(answers.business_address_proof_files)} />}
        />
        <Row label="Address type" value={addressLabel} />
        <Row
          label="Tax registration certificate"
          value={<DocStatus uploaded={hasDoc(answers.tax_registration_files)} />}
        />
      </SummarySection>

      {/* Section C */}
      <SummarySection title="Section C — Business Activity Evidence">
        <Row
          label="Activity evidence"
          value={<DocStatus uploaded={hasDoc(answers.business_activity_evidence_files)} />}
        />
      </SummarySection>

      {/* Beneficial Owners */}
      {owners.length > 0 && (
        <SummarySection title="Beneficial Owners">
          {owners.map((o) => (
            <div key={o.id} className="py-2.5 border-b border-neutral-800/60 last:border-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs text-neutral-200 font-medium">
                  {o.owner_type === "individual"
                    ? o.individual_full_name
                    : o.entity_legal_name}
                </span>
                {o.is_ubo && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 uppercase tracking-wide font-semibold">
                    UBO
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500 mb-1">
                <span>{o.owner_type === "individual" ? "Individual" : "Entity"}</span>
                {o.ownership_percentage != null && (
                  <span>{o.ownership_percentage}% ownership</span>
                )}
                {o.individual_nationality && <span>{o.individual_nationality}</span>}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-neutral-500">
                <span className="inline-flex items-center gap-1.5">
                  ID Doc:&nbsp;<DocStatus uploaded={!!o.individual_id_document_id} />
                </span>
                <span className="inline-flex items-center gap-1.5">
                  Proof of address:&nbsp;<DocStatus uploaded={!!o.individual_address_document_id} />
                </span>
              </div>
            </div>
          ))}
        </SummarySection>
      )}

      {/* Authorised People */}
      {persons.length > 0 && (
        <SummarySection title="Authorised People">
          {persons.map((p) => (
            <div
              key={p.id}
              className="flex items-start justify-between gap-3 py-2.5 border-b border-neutral-800/60 last:border-0"
            >
              <div>
                <span className="text-xs text-neutral-200">{p.full_name}</span>
                {p.role && (
                  <span className="ml-2 text-xs text-neutral-500">{p.role}</span>
                )}
                {p.email && (
                  <div className="text-xs text-neutral-600 mt-0.5">{p.email}</div>
                )}
              </div>
              <DocStatus uploaded={!!p.id_document_id} />
            </div>
          ))}
        </SummarySection>
      )}

      {/* Questionnaire */}
      <SummarySection title="Questionnaire">
        {(questionSpec.questions as any[]).map((def) => (
          <Row
            key={def.code}
            label={def.label}
            value={resolveQLabel(def.code, q[def.code])}
          />
        ))}
      </SummarySection>
    </div>
  );
}

/** ── Main export ── */
export default function ApplicationSummary({ answers }: { answers: Record<string, any> }) {
  const isBusiness = answers.accountType === "business";
  const applicationId = answers.koraApplicationId as string | undefined;

  const [owners, setOwners] = React.useState<BeneficialOwner[]>([]);
  const [persons, setPersons] = React.useState<AuthorizedPerson[]>([]);

  React.useEffect(() => {
    if (!isBusiness || !applicationId) return;
    listBeneficialOwners(applicationId).then(setOwners).catch(() => {});
    listAuthorizedPersons(applicationId).then(setPersons).catch(() => {});
  }, [isBusiness, applicationId]);

  if (!isBusiness) {
    return <IndividualSummary answers={answers} />;
  }

  return <BusinessSummary answers={answers} owners={owners} persons={persons} />;
}
