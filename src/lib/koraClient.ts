// src/lib/koraClient.ts
// Sitara-specific Kora API client.
// All requests go through the Next.js proxy at /api/kora/[...path] (which adds
// X-Tenant-Key and forwards auth cookies) or the dedicated auth routes at /api/auth/*.

export type AccountType = "individual" | "business";

/** -------- Applications -------- */

export type CreateApplicationPayload = {
  tenant_code: string;
  account_type: AccountType;
  email: string;
  phone_country_code?: string | null;
  phone_number?: string | null;
  phone_e164?: string | null;
  password?: string | null;
};

export type CreateApplicationResponse = {
  application_id: string;
  applicant_id: string;
  tenant_id: string;
  status: string;
  account_type: string;
  external_reference: string;
};

/** -------- Applicant Profiles -------- */

export type ApplicantProfilePayload = {
  tenant_id: string;
  application_id: string;
  applicant_id: string;
  full_name: string;
  nationality: string;
  occupation: string;
  source_of_income: string;
  expected_frequency?: string | null;
  expected_value?: string | null;
  selected_services: string[];
  is_pep_self?: boolean;
  pep_self_details?: string | null;
  is_sanctions_self?: boolean;
  sanctions_self_details?: string | null;
  is_third_party_use?: boolean;
  third_party_use_details?: string | null;
};

export type ApplicantProfileResponse = {
  id: number;
  tenant_id: string;
  application_id: string;
  applicant_id: string;
  full_name: string;
  nationality: string;
  occupation: string;
  source_of_income: string;
  expected_frequency: string | null;
  expected_value: string | null;
  selected_services: string[];
  is_pep_self: boolean;
  pep_self_details: string | null;
  is_sanctions_self: boolean;
  sanctions_self_details: string | null;
  is_third_party_use: boolean;
  third_party_use_details: string | null;
  created_at: string;
  updated_at: string;
};

/** -------- Onboarding Resolver -------- */

export type OnboardingResolveRequest = {
  takes_ownership_of_metals: boolean;
  holds_client_assets_or_funds: boolean;
  acts_as_intermediary: boolean;
  settlement_facilitation?: boolean | null;
};

export type OnboardingResolveResponse = {
  low_risk_service_provider: boolean;
  monitoring_level: "standard" | "enhanced" | string;
  question_sets: string[];
  document_sets: string[];
  custody_required: boolean;
  escrow_required: boolean;
  intermediation_required: boolean;
  economic_activity_required: boolean;
};

/** -------- Evidence Pack -------- */

export type EvidencePackDocument = {
  id: string;
  document_type: string;
  category?: string | null;
  blob?: { container: string; name: string } | null;
  file?: {
    original_name?: string | null;
    mime_type?: string | null;
    size_bytes?: number | null;
    sha256?: string | null;
  } | null;
  dates?: {
    uploaded_at?: string | null;
    issued_on?: string | null;
    expires_on?: string | null;
    extracted_at?: string | null;
  } | null;
  issuer?: string | null;
  document_number?: string | null;
  extraction?: {
    status?: string | null;
    provider?: string | null;
    model?: string | null;
    confidence?: number | null;
    payload?: any;
  } | null;
  verification?: {
    status?: string | null;
    verified_by?: string | null;
    verified_at?: string | null;
    notes?: string | null;
  } | null;
};

export type EvidencePackDerived = {
  document_sets?: string[];
  required_document_types?: string[];
  missing_document_types?: string[];
  latest_documents_by_type?: Record<string, string>;
  expiry_summary?: { expired?: Array<any>; next_expiring?: Array<any> };
};

export type EvidencePackResponse = {
  meta: { version: string; tenant_id: string; application_id: string; generated_at: string };
  application: any;
  company_profile: any;
  applicant_profile: any;
  documents: EvidencePackDocument[];
  overrides: any[];
  derived: EvidencePackDerived;
};

/** -------- Questionnaires -------- */

export type QuestionnaireCode = string;

export type QuestionnaireUpsertPayload = {
  tenant_id: string;
  application_id: string;
  questionnaire_code: QuestionnaireCode;
  questionnaire_version: string;
  responses: Record<string, any>;
};

export type QuestionnaireResponse = QuestionnaireUpsertPayload & {
  id: string;
  created_at?: string;
  updated_at?: string;
};

/** -------- Company Profile -------- */

export type CompanyProfile = {
  id: number;
  tenant_id: string;
  application_id: string;
  applicant_id: string;
  legal_name?: string | null;
  trading_name?: string | null;
  country_of_incorporation?: string | null;
  registration_number?: string | null;
  registration_jurisdiction?: string | null;
  incorporation_date?: string | null;
  legal_form?: string | null;
  registered_address?: string | null;
  operating_address?: string | null;
  operating_address_is_different?: boolean | null;
  main_business_activity?: string | null;
  activity_risk_category?: string | null;
  has_tax_registration?: boolean | null;
  tax_registration_number?: string | null;
  has_precious_metals_permit?: boolean | null;
  precious_metals_permit_ref?: string | null;
  precious_metals_permit_expiry?: string | null;
  license_number?: string | null;
  license_issue_date?: string | null;
  license_expiry_date?: string | null;
  license_issuing_authority?: string | null;
  authorized_person_name?: string | null;
  authorized_person_role?: string | null;
  authorized_person_source?: string | null;
  authorized_person_extracted_confidence?: number | null;
  created_at: string;
  updated_at: string;
};

export type CompanyProfileCreatePayload = {
  tenant_id: string;
  application_id: string;
  applicant_id: string;
  country_of_incorporation?: string | null;
  registration_jurisdiction?: string | null;
};

export type CompanyProfilePatchPayload = Partial<
  Omit<CompanyProfile, "id" | "tenant_id" | "application_id" | "applicant_id" | "created_at" | "updated_at">
>;

/** -------- Beneficial Owners -------- */

export type OwnerType = "individual" | "company" | "spv" | "trust" | "foundation" | "other_entity";

export type BeneficialOwner = {
  id: string;
  tenant_id: string;
  application_id: string;
  owner_type: OwnerType;
  ownership_percentage?: number | null;
  control_percentage?: number | null;
  individual_full_name?: string | null;
  individual_nationality?: string | null;
  individual_date_of_birth?: string | null;
  individual_id_document_id?: string | null;
  individual_address_document_id?: string | null;
  entity_legal_name?: string | null;
  entity_jurisdiction?: string | null;
  entity_registration_number?: string | null;
  entity_legal_form?: string | null;
  entity_incorporation_date?: string | null;
  entity_legal_existence_document_id?: string | null;
  entity_ownership_proof_document_id?: string | null;
  control_mechanisms?: string[] | null;
  is_ubo?: boolean;
  verification_status: string;
  notes?: string | null;
  created_at: string;
  updated_at: string;
};

export type BeneficialOwnerCreatePayload = {
  tenant_id: string;
  application_id: string;
  owner_type: OwnerType;
  ownership_percentage?: number | null;
  control_percentage?: number | null;
  individual_full_name?: string | null;
  individual_nationality?: string | null;
  individual_date_of_birth?: string | null;
  individual_id_document_id?: string | null;
  individual_address_document_id?: string | null;
  entity_legal_name?: string | null;
  entity_jurisdiction?: string | null;
  entity_registration_number?: string | null;
  entity_legal_form?: string | null;
  entity_incorporation_date?: string | null;
  entity_legal_existence_document_id?: string | null;
  entity_ownership_proof_document_id?: string | null;
  control_mechanisms?: string[] | null;
  is_ubo?: boolean;
  notes?: string | null;
};

export type BeneficialOwnerPatchPayload = Partial<
  Omit<BeneficialOwner, "id" | "tenant_id" | "application_id" | "created_at" | "updated_at" | "verification_status">
>;

/** -------- Authorized Persons -------- */

export type AuthorizedPerson = {
  id: string;
  tenant_id: string;
  application_id: string;
  applicant_id?: string | null;
  full_name: string;
  email?: string | null;
  role?: string | null;
  id_document_id?: string | null;
  address_document_id?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type AuthorizedPersonCreatePayload = {
  tenant_id: string;
  application_id: string;
  applicant_id?: string | null;
  full_name: string;
  email?: string | null;
  role?: string | null;
  id_document_id?: string | null;
  address_document_id?: string | null;
  notes?: string | null;
};

export type AuthorizedPersonPatchPayload = Partial<
  Omit<AuthorizedPersonCreatePayload, "tenant_id" | "application_id" | "applicant_id">
>;

/** -------- Authentication -------- */

export type LoginPayload = { email: string; password: string };

export type ApplicationSummary = {
  id: string;
  external_reference: string | null;
  account_type: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export type LoginResponse = {
  access_token: string;
  token_type: string;
  applicant_id: string;
  email: string;
  applications: ApplicationSummary[];
  tenant_id?: string | null;
};

/** -------- Application Details -------- */

export type ApplicationDetails = {
  id: string;
  tenant_id: string;
  applicant_id: string;
  account_type: string;
  status: string;
  external_reference: string | null;
  source: string | null;
  onboarding_resolution: any;
  created_at: string;
  updated_at: string;
  applicant: {
    id: string;
    email: string;
    phone_country_code: string | null;
    phone_number: string | null;
    phone_e164: string | null;
  } | null;
  applicant_profile: {
    id: number;
    full_name: string;
    nationality: string;
    occupation: string;
    source_of_income: string;
    expected_frequency: string | null;
    expected_value: string | null;
    selected_services: string[];
    is_pep_self: boolean | null;
    pep_self_details: string | null;
    is_sanctions_self: boolean | null;
    sanctions_self_details: string | null;
    is_third_party_use: boolean | null;
    third_party_use_details: string | null;
  } | null;
};

// ============================================================
// Internal helpers
// ============================================================

async function _readJsonOrNull(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * All API calls go through the Sitara Next.js proxy at /api/kora/[...path].
 * The proxy adds X-Tenant-Key and forwards the access_token cookie as Authorization.
 * Auth cookies are sent automatically (same-origin, credentials: "include").
 */
async function _koraFetch(path: string, init?: RequestInit): Promise<Response> {
  const url = `/api/kora${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, { credentials: "include", ...init });
}

// ============================================================
// Applications
// ============================================================

export async function checkEmailAvailability(
  tenantCode: string,
  email: string,
): Promise<{ available: boolean; email: string }> {
  const res = await _koraFetch("/applications/check-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tenant_code: tenantCode, email }),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to check email");
  return body;
}

export async function createApplication(
  payload: CreateApplicationPayload,
): Promise<CreateApplicationResponse> {
  const res = await _koraFetch("/applications", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to create application");
  return body as CreateApplicationResponse;
}

export async function submitApplication(
  applicationId: string,
): Promise<{ id: string; status: string; external_reference: string; submitted_at: string | null }> {
  const res = await _koraFetch(`/applications/${applicationId}/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to submit application");
  return body;
}

export async function deleteApplication(
  applicationId: string,
): Promise<{ id: string; status: string; message: string }> {
  const res = await _koraFetch(`/applications/${applicationId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to delete application");
  return body;
}

// ============================================================
// Applicant Profile
// ============================================================

export async function createApplicantProfile(
  payload: ApplicantProfilePayload,
): Promise<ApplicantProfileResponse> {
  const res = await _koraFetch("/profiles", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to save applicant profile");
  return body as ApplicantProfileResponse;
}

// ============================================================
// Onboarding Resolution
// ============================================================

export async function resolveOnboarding(
  applicationId: string,
  payload: OnboardingResolveRequest,
): Promise<OnboardingResolveResponse> {
  const res = await _koraFetch(`/applications/${applicationId}/resolve-onboarding`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to resolve onboarding requirements");
  return body as OnboardingResolveResponse;
}

// ============================================================
// Evidence Pack
// ============================================================

export async function fetchEvidencePack(applicationId: string): Promise<EvidencePackResponse> {
  const res = await _koraFetch(`/evidence/applications/${applicationId}`, { method: "GET" });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to fetch evidence pack");
  return body as EvidencePackResponse;
}

// ============================================================
// Company Profile
// ============================================================

export async function upsertCompanyProfile(
  payload: CompanyProfileCreatePayload,
): Promise<CompanyProfile> {
  const res = await _koraFetch("/profiles/company", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to create company profile");
  return body as CompanyProfile;
}

export async function fetchCompanyProfile(applicationId: string): Promise<CompanyProfile> {
  const res = await _koraFetch(`/profiles/company/${encodeURIComponent(applicationId)}`, {
    method: "GET",
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to fetch company profile");
  return body as CompanyProfile;
}

export async function patchCompanyProfile(
  applicationId: string,
  patch: CompanyProfilePatchPayload,
): Promise<CompanyProfile> {
  const res = await _koraFetch(`/profiles/company/${encodeURIComponent(applicationId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to update company profile");
  return body as CompanyProfile;
}

export async function applyBusinessDocumentToCompanyProfile(
  applicationId: string,
  documentId: string,
): Promise<CompanyProfile> {
  const res = await _koraFetch(
    `/profiles/company/${encodeURIComponent(applicationId)}/apply-document/${encodeURIComponent(documentId)}`,
    { method: "PATCH" },
  );
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to apply document to company profile");
  return body as CompanyProfile;
}

// ============================================================
// Questionnaires
// ============================================================

export async function upsertQuestionnaire(
  payload: QuestionnaireUpsertPayload,
): Promise<QuestionnaireResponse> {
  const res = await _koraFetch("/questionnaires", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to save questionnaire");
  return body as QuestionnaireResponse;
}

export async function fetchQuestionnaire(params: {
  tenant_id: string;
  application_id: string;
  questionnaire_code: QuestionnaireCode;
}): Promise<QuestionnaireResponse> {
  const qs = new URLSearchParams({
    tenant_id: params.tenant_id,
    application_id: params.application_id,
    questionnaire_code: params.questionnaire_code,
  }).toString();
  const res = await _koraFetch(`/questionnaires?${qs}`, { method: "GET" });
  if (res.status === 404) {
    const err: any = new Error("Questionnaire not found");
    err.status = 404;
    throw err;
  }
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to fetch questionnaire");
  return body as QuestionnaireResponse;
}

export async function autosaveQuestionnaireDraft(args: {
  tenant_id: string;
  application_id: string;
  questionnaire_code: QuestionnaireCode;
  questionnaire_version: string;
  patch: Record<string, any>;
}): Promise<QuestionnaireResponse> {
  let existing: QuestionnaireResponse | null = null;
  try {
    existing = await fetchQuestionnaire({
      tenant_id: args.tenant_id,
      application_id: args.application_id,
      questionnaire_code: args.questionnaire_code,
    });
  } catch (e: any) {
    if (e?.status !== 404) throw e;
  }
  return upsertQuestionnaire({
    tenant_id: args.tenant_id,
    application_id: args.application_id,
    questionnaire_code: args.questionnaire_code,
    questionnaire_version: args.questionnaire_version,
    responses: { ...(existing?.responses ?? {}), ...args.patch },
  });
}

// ============================================================
// Beneficial Owners
// ============================================================

export async function createBeneficialOwner(
  payload: BeneficialOwnerCreatePayload,
): Promise<BeneficialOwner> {
  const res = await _koraFetch("/beneficial-owners", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to create beneficial owner");
  return body as BeneficialOwner;
}

export async function listBeneficialOwners(
  applicationId: string,
  tenantId?: string,
): Promise<BeneficialOwner[]> {
  const params = new URLSearchParams({ application_id: applicationId });
  if (tenantId) params.set("tenant_id", tenantId);
  const res = await _koraFetch(`/beneficial-owners?${params.toString()}`, { method: "GET" });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to list beneficial owners");
  return body as BeneficialOwner[];
}

export async function getBeneficialOwner(id: string): Promise<BeneficialOwner> {
  const res = await _koraFetch(`/beneficial-owners/${encodeURIComponent(id)}`, { method: "GET" });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to fetch beneficial owner");
  return body as BeneficialOwner;
}

export async function updateBeneficialOwner(
  id: string,
  patch: BeneficialOwnerPatchPayload,
): Promise<BeneficialOwner> {
  const res = await _koraFetch(`/beneficial-owners/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  const body = await _readJsonOrNull(res);
  if (!res.ok) throw new Error(body?.detail || body?.error || "Failed to update beneficial owner");
  return body as BeneficialOwner;
}

export async function deleteBeneficialOwner(id: string): Promise<void> {
  const res = await _koraFetch(`/beneficial-owners/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await _readJsonOrNull(res);
    throw new Error(body?.detail || body?.error || "Failed to delete beneficial owner");
  }
}

// ============================================================
// Authorized Persons
// ============================================================

export async function createAuthorizedPerson(
  payload: AuthorizedPersonCreatePayload,
): Promise<AuthorizedPerson> {
  const res = await _koraFetch("/authorized-persons", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await _readJsonOrNull(res);
    throw new Error(body?.detail || body?.error || "Failed to create authorized person");
  }
  return res.json();
}

export async function listAuthorizedPersons(
  applicationId: string,
  tenantId?: string,
): Promise<AuthorizedPerson[]> {
  const params = new URLSearchParams({ application_id: applicationId });
  if (tenantId) params.set("tenant_id", tenantId);
  const res = await _koraFetch(`/authorized-persons?${params}`, { method: "GET" });
  if (!res.ok) {
    const body = await _readJsonOrNull(res);
    throw new Error(body?.detail || body?.error || "Failed to list authorized persons");
  }
  return res.json();
}

export async function getAuthorizedPerson(id: string): Promise<AuthorizedPerson> {
  const res = await _koraFetch(`/authorized-persons/${encodeURIComponent(id)}`, { method: "GET" });
  if (!res.ok) {
    const body = await _readJsonOrNull(res);
    throw new Error(body?.detail || body?.error || "Failed to get authorized person");
  }
  return res.json();
}

export async function updateAuthorizedPerson(
  id: string,
  patch: AuthorizedPersonPatchPayload,
): Promise<AuthorizedPerson> {
  const res = await _koraFetch(`/authorized-persons/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  });
  if (!res.ok) {
    const body = await _readJsonOrNull(res);
    throw new Error(body?.detail || body?.error || "Failed to update authorized person");
  }
  return res.json();
}

export async function deleteAuthorizedPerson(id: string): Promise<void> {
  const res = await _koraFetch(`/authorized-persons/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
  if (!res.ok) {
    const body = await _readJsonOrNull(res);
    throw new Error(body?.detail || body?.error || "Failed to delete authorized person");
  }
}

// ============================================================
// Authentication  (routes through /api/auth/*, not /api/kora/*)
// ============================================================

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await _readJsonOrNull(res);
    throw new Error(body?.detail || "Invalid credentials");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
}

export async function getCurrentUser(): Promise<LoginResponse> {
  const res = await fetch("/api/auth/me", { method: "GET", credentials: "include" });
  if (!res.ok) throw new Error("Unauthorized");
  return res.json();
}
