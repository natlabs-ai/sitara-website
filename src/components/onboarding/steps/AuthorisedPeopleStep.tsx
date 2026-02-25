// src/app/onboarding/steps/AuthorisedPeopleStep.tsx
"use client";

import React from "react";
import { countries } from "@/data/countries";
import { GoldCombobox } from "@/components/GoldCombobox";
import {
  type AuthorizedPerson,
  type AuthorizedPersonCreatePayload,
  type AuthorizedPersonPatchPayload,
  createAuthorizedPerson,
  listAuthorizedPersons,
  updateAuthorizedPerson,
  deleteAuthorizedPerson,
  fetchEvidencePack,
  type EvidencePackResponse,
} from "@/lib/koraClient";
import { GOLD, GOLD_BG_SOFT } from "../onboardingShared";

// Import UI components
import {
  Modal,
  Section,
  FormField,
  Input,
  Textarea,
  Button,
  Alert,
  DocumentUploadControl,
  type DocumentUploadStatus,
} from "@/components/ui";

interface AuthorisedPeopleStepProps {
  answers: Record<string, any>;
  setValue: (id: string, val: any) => void;
  isResuming?: boolean;
  showValidationErrors?: boolean;
}

type LocalPersonDraft = {
  id?: string;
  full_name: string;
  email: string;
  role: string;
  id_document_id: string | null;
  address_document_id: string | null;
  notes: string;

  // UI state
  isSaved: boolean;
  isEditing: boolean;
};

type DocRef = {
  id: string;
  name: string;
};

/** Helper to unwrap scalar values from extraction payloads */
function unwrapScalar(v: any): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") {
    if ("value" in v) return String((v as any).value ?? "");
    return "";
  }
  return String(v);
}

/** Helper to read v2 field from normalization */
function readV2Field(normalization: any, fieldKey: string): string {
  const fields = normalization?.fields;
  const node = fields?.[fieldKey];
  if (!node) return "";
  if (typeof node === "string") return node;
  if (typeof node === "object") return unwrapScalar(node);
  return "";
}

/** Helper to convert date strings to YYYY-MM-DD */
function toInputDate(v: any): string {
  const s = unwrapScalar(v);
  if (!s) return "";
  // Already YYYY-MM-DD or ISO datetime
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

/**
 * Document uploader for authorized person documents
 */
const PersonDocumentUploader: React.FC<{
  fieldId: string;
  label: string;
  description?: string;
  category: string;
  tenantId: string;
  applicationId: string;
  applicantId: string;
  onUploaded?: (info: { documentId: string; extracted?: any }) => Promise<void>;
}> = ({
  fieldId,
  label,
  description,
  category,
  tenantId,
  applicationId,
  applicantId,
  onUploaded,
}) => {
  const [status, setStatus] = React.useState<DocumentUploadStatus>("idle");
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [fileName, setFileName] = React.useState<string | null>(null);

  const handleFileSelect = async (file: File) => {
    console.log("Document upload - IDs:", { tenantId, applicationId, applicantId, category });

    if (!tenantId || !applicationId) {
      setStatus("error");
      setErrorMsg("Missing tenant_id or application_id. Please ensure you're in an active onboarding flow.");
      return;
    }

    setStatus("uploading");
    setErrorMsg(null);
    setFileName(file.name);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tenant_id", tenantId);
      formData.append("application_id", applicationId);
      formData.append("applicant_id", applicantId);
      formData.append("category", category);

      // Upload to appropriate endpoint based on category
      const endpoint = category.includes("person_id_")
        ? "/api/kora/documents/id"
        : "/api/kora/documents/address";

      const res = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Upload failed" }));
        throw new Error(errData?.detail || errData?.message || "Upload failed");
      }

      const data = await res.json();

      // Extract document ID from various possible response structures
      const docId: string | undefined =
        data?.id ?? data?.document_id ?? data?.document?.id ?? data?.documentId ?? data?.savedDocumentId;

      if (!docId) {
        throw new Error("Upload succeeded but no document id was returned by the server");
      }

      // Fetch evidence pack to get extraction
      const pack: EvidencePackResponse = await fetchEvidencePack(applicationId);
      const doc = (pack?.documents || []).find((d) => String(d.id) === String(docId));

      const extracted =
        doc?.extraction?.payload?.normalization ||
        doc?.extraction?.payload ||
        (doc as any)?.extraction?.payload?.extracted ||
        null;

      setStatus("success");

      // Call onUploaded callback
      await onUploaded?.({ documentId: String(docId), extracted });
    } catch (err: any) {
      console.error("Document upload error:", err);
      setStatus("error");
      setErrorMsg(err?.message || "Upload failed. Please try again.");
    }
  };

  return (
    <FormField label={label} helperText={description} htmlFor={fieldId}>
      <DocumentUploadControl
        status={status}
        errorMessage={errorMsg}
        onFileSelect={handleFileSelect}
        accept=".pdf,.jpg,.jpeg,.png"
        maxSizeMB={10}
        fileName={status === "success" ? fileName : undefined}
      />
    </FormField>
  );
};

/**
 * Modal for adding/editing an authorized person
 */
const PersonModal: React.FC<{
  person: LocalPersonDraft | null;
  onClose: () => void;
  onSave: (draft: LocalPersonDraft) => Promise<void>;
  tenantId: string;
  applicationId: string;
  applicantId: string;
}> = ({ person, onClose, onSave, tenantId, applicationId, applicantId }) => {
  const [draft, setDraft] = React.useState<LocalPersonDraft | null>(person);
  const [saving, setSaving] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [extractionInfo, setExtractionInfo] = React.useState<string>("");

  const handleIdDocUploaded = async ({ documentId, extracted }: { documentId: string; extracted?: any }) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, id_document_id: documentId };
    });

    if (extracted) {
      console.log("ID document extraction data:", extracted);

      // Read from autoFill structure (passport extraction)
      const autoFill = extracted.autoFill || {};
      const extractedData = extracted.extracted || {};

      const fullName =
        autoFill.fullName ||
        extractedData.fullName ||
        (extractedData.firstName && extractedData.lastName
          ? `${extractedData.firstName} ${extractedData.lastName}`.trim()
          : "") ||
        readV2Field(extracted, "full_name") ||
        unwrapScalar(extracted.fullName);

      console.log("Extracted full name:", fullName);

      setDraft((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          full_name: fullName || prev.full_name,
        };
      });

      setExtractionInfo("Extracted name from document.");
    }
  };

  const handleAddressDocUploaded = async ({ documentId }: { documentId: string; extracted?: any }) => {
    setDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, address_document_id: documentId };
    });
  };

  const handleSave = async () => {
    if (!draft) return;

    if (!draft.full_name || !draft.full_name.trim()) {
      setErrorMsg("Full name is required");
      return;
    }

    if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
      setErrorMsg("Please enter a valid email address");
      return;
    }

    setSaving(true);
    setErrorMsg(null);

    try {
      await onSave(draft);
      onClose();
    } catch (err: any) {
      console.error("Save authorized person error:", err);
      setErrorMsg(err?.message || "Failed to save authorized person");
    } finally {
      setSaving(false);
    }
  };

  if (!draft) return null;

  return (
    <Modal
      open={true}
      onClose={onClose}
      title={draft.id ? "Edit Authorized Person" : "Add Authorized Person"}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} loading={saving}>
            Save
          </Button>
        </>
      }
    >
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}
      {extractionInfo && <Alert variant="success">{extractionInfo}</Alert>}

      {/* Personal Details */}
      <Section title="Personal Details" titleColor="gold">
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Full Name" required htmlFor="full_name">
            <Input
              id="full_name"
              value={draft.full_name}
              onChange={(value) => setDraft((prev) => prev && { ...prev, full_name: value })}
              placeholder="e.g. John Smith"
            />
          </FormField>

          <FormField label="Email" htmlFor="email">
            <Input
              id="email"
              type="email"
              value={draft.email}
              onChange={(value) => setDraft((prev) => prev && { ...prev, email: value })}
              placeholder="john@example.com"
            />
          </FormField>

          <div className="md:col-span-2">
            <FormField label="Role / Title" htmlFor="role">
              <Input
                id="role"
                value={draft.role}
                onChange={(value) => setDraft((prev) => prev && { ...prev, role: value })}
                placeholder="e.g. Compliance Officer, Operations Manager"
              />
            </FormField>
          </div>
        </div>
      </Section>

      {/* Documents */}
      <Section title="Documents" titleColor="gold">
        <div className="space-y-4">
          <PersonDocumentUploader
            fieldId="id_doc"
            label="Identity Document (Passport or National ID)"
            description="Upload passport or national ID card"
            category="person_id_doc"
            tenantId={tenantId}
            applicationId={applicationId}
            applicantId={applicantId}
            onUploaded={handleIdDocUploaded}
          />

          <PersonDocumentUploader
            fieldId="address_doc"
            label="Proof of Address (Optional)"
            description="Utility bill, bank statement, or government letter (within 3 months)"
            category="person_address_proof"
            tenantId={tenantId}
            applicationId={applicationId}
            applicantId={applicantId}
            onUploaded={handleAddressDocUploaded}
          />
        </div>
      </Section>

      {/* Notes */}
      <FormField label="Notes (Optional)" htmlFor="notes">
        <Textarea
          id="notes"
          rows={3}
          value={draft.notes}
          onChange={(value) => setDraft((prev) => prev && { ...prev, notes: value })}
          placeholder="Any additional information..."
        />
      </FormField>
    </Modal>
  );
};

/**
 * Main Authorised People Step Component
 */
export default function AuthorisedPeopleStep({
  answers,
  setValue,
  isResuming = false,
}: AuthorisedPeopleStepProps) {
  const [persons, setPersons] = React.useState<AuthorizedPerson[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [modalOpen, setModalOpen] = React.useState(false);
  const [editingPerson, setEditingPerson] = React.useState<LocalPersonDraft | null>(null);

  const tenantId = answers.koraTenantId as string | undefined;
  const applicationId = answers.koraApplicationId as string | undefined;
  const applicantId = answers.koraApplicantId as string | undefined;

  // Load existing authorized persons ONLY when resuming an application
  React.useEffect(() => {
    // Skip loading on first create flow
    if (!isResuming || !applicationId || !tenantId) {
      setLoading(false);
      return;
    }

    listAuthorizedPersons(applicationId, tenantId as string)
      .then((data) => {
        setPersons(data);
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Could not load authorized persons:", err);
        setPersons([]);
        setLoading(false);
      });
  }, [applicationId, tenantId, isResuming]);

  const openAddModal = () => {
    setEditingPerson({
      full_name: "",
      email: "",
      role: "",
      id_document_id: null,
      address_document_id: null,
      notes: "",
      isSaved: false,
      isEditing: true,
    });
    setModalOpen(true);
  };

  const openEditModal = (person: AuthorizedPerson) => {
    setEditingPerson({
      id: person.id,
      full_name: person.full_name || "",
      email: person.email || "",
      role: person.role || "",
      id_document_id: person.id_document_id || null,
      address_document_id: person.address_document_id || null,
      notes: person.notes || "",
      isSaved: true,
      isEditing: true,
    });
    setModalOpen(true);
  };

  const handleSave = async (draft: LocalPersonDraft) => {
    if (!tenantId || !applicationId) {
      throw new Error("Missing tenant_id or application_id");
    }

    if (draft.id) {
      // Update existing
      const patch: AuthorizedPersonPatchPayload = {
        full_name: draft.full_name,
        email: draft.email || null,
        role: draft.role || null,
        id_document_id: draft.id_document_id || null,
        address_document_id: draft.address_document_id || null,
        notes: draft.notes || null,
      };

      const updated = await updateAuthorizedPerson(draft.id, patch);
      setPersons((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } else {
      // Create new
      const payload: AuthorizedPersonCreatePayload = {
        tenant_id: tenantId,
        application_id: applicationId,
        applicant_id: applicantId || null,
        full_name: draft.full_name,
        email: draft.email || null,
        role: draft.role || null,
        id_document_id: draft.id_document_id || null,
        address_document_id: draft.address_document_id || null,
        notes: draft.notes || null,
      };

      const created = await createAuthorizedPerson(payload);
      setPersons((prev) => [...prev, created]);
    }
  };

  const handleDelete = async (personId: string) => {
    if (!confirm("Are you sure you want to delete this authorized person?")) return;

    try {
      await deleteAuthorizedPerson(personId);
      setPersons((prev) => prev.filter((p) => p.id !== personId));
    } catch (err: any) {
      console.error("Delete authorized person error:", err);
      alert("Failed to delete authorized person: " + (err?.message || "Unknown error"));
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Section>
          <p className="text-sm text-neutral-300">Loading authorized persons...</p>
        </Section>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Section>
        <h2 className="text-sm font-semibold text-neutral-100">
          Authorized People
        </h2>
        <p className="mt-1 text-xs text-neutral-400">
          Add any additional users who should be allowed to access and operate the account
          (e.g. compliance officers, operations managers, finance personnel).
        </p>
      </Section>

      <div className="space-y-4">
        {persons.length === 0 ? (
          <Section>
            <p className="text-sm text-neutral-300">No authorized people added yet.</p>
          </Section>
        ) : (
          persons.map((person) => (
            <Section key={person.id}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-neutral-100">
                    {person.full_name}
                  </h3>
                  {person.role && (
                    <p className="mt-1 text-xs text-neutral-400">{person.role}</p>
                  )}
                  {person.email && (
                    <p className="mt-1 text-xs text-neutral-400">{person.email}</p>
                  )}
                  {person.id_document_id && (
                    <p className="mt-1 text-xs text-emerald-400">✓ ID document uploaded</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(person)}
                    className="text-xs text-neutral-400 underline-offset-2 hover:text-neutral-100 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(person.id)}
                    className="text-xs text-red-400 underline-offset-2 hover:text-red-300 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </Section>
          ))
        )}

        <Button variant="secondary" onClick={openAddModal}>
          Add authorized person
        </Button>
      </div>

      {modalOpen && editingPerson && tenantId && applicationId && (
        <PersonModal
          person={editingPerson}
          onClose={() => {
            setModalOpen(false);
            setEditingPerson(null);
          }}
          onSave={handleSave}
          tenantId={tenantId}
          applicationId={applicationId}
          applicantId={applicantId || ""}
        />
      )}
    </div>
  );
}
