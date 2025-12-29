// src/lib/koraClient.ts

export type AccountType = "individual" | "business";

/** -------- Applications -------- */

export type CreateApplicationPayload = {
  tenant_code: string; // e.g. "sitara-core"
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

  // Optional flags (safe defaults if not used by UI yet)
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

/** -------- Onboarding Resolver (Deterministic Model) -------- */

export type OnboardingResolveRequest = {
  takes_ownership_of_metals: boolean; // Q1
  holds_client_assets_or_funds: boolean; // Q2
  acts_as_intermediary: boolean; // Q3
  settlement_facilitation?: boolean | null; // only meaningful if Q2=true
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
  blob?: {
    container: string;
    name: string;
  } | null;
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
  expiry_summary?: {
    expired?: Array<any>;
    next_expiring?: Array<any>;
  };
};

export type EvidencePackResponse = {
  meta: {
    version: string;
    tenant_id: string;
    application_id: string;
    generated_at: string;
  };
  application: any;
  company_profile: any;
  applicant_profile: any;
  documents: EvidencePackDocument[];
  overrides: any[];
  derived: EvidencePackDerived;
};

/** -------- Questionnaires -------- */

export type QuestionnaireCode = string; // e.g. "uae_business_questions";

export type QuestionnaireUpsertPayload = {
  tenant_id: string;
  application_id: string;
  questionnaire_code: QuestionnaireCode;
  questionnaire_version: string; // e.g. "v1"
  responses: Record<string, any>;
};

export type QuestionnaireResponse = QuestionnaireUpsertPayload & {
  id: string;
  created_at?: string;
  updated_at?: string;
};

/** -------- Base config -------- */

// Keep these for SERVER-side calls (Node / FastAPI direct).
// For CLIENT-side calls, prefer Next.js API routes (/api/...) to avoid CORS and centralise auth later.
const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

/** -------- Internal helpers -------- */

async function _readJsonOrNull(res: Response) {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Standardised fetch wrapper:
 * - If called in the browser: use Next.js API routes (/api/...)
 * - If called server-side: call FastAPI directly (KORA_API_BASE + /api/v1)
 */
async function _koraFetch(
  path:
    | string
    | {
        client: string; // e.g. "/api/..."
        server: string; // e.g. "/api/v1/..."
      },
  init?: RequestInit,
): Promise<Response> {
  const isBrowser = typeof window !== "undefined";

  if (typeof path === "string") {
    if (isBrowser) return fetch(path, init);
    const base = KORA_API_BASE.replace(/\/$/, "");
    const p = path.startsWith("/") ? path : `/${path}`;
    return fetch(`${base}${p}`, init);
  }

  if (isBrowser) return fetch(path.client, init);

  const base = KORA_API_BASE.replace(/\/$/, "");
  const p = path.server.startsWith("/") ? path.server : `/${path.server}`;
  return fetch(`${base}${p}`, init);
}

/** -------- Existing helpers -------- */

export async function fetchPassport(passportId: number) {
  // No Next proxy for passports currently; keep direct.
  const res = await fetch(
    `${KORA_API_BASE}${API_PREFIX}/passports/${passportId}`,
    { method: "GET" },
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch passport ${passportId}`);
  }

  return res.json();
}

/** -------- Create application -------- */

export async function createApplication(
  payload: CreateApplicationPayload,
): Promise<CreateApplicationResponse> {
  // Prefer direct for now (often called from client, but your setup already uses KORA_API_BASE).
  const res = await fetch(`${KORA_API_BASE}${API_PREFIX}/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Kora /applications error", res.status, body);
    throw new Error(body?.detail || body?.error || "Failed to create application");
  }

  return body as CreateApplicationResponse;
}

/** -------- Applicant profile -------- */

export async function createApplicantProfile(
  payload: ApplicantProfilePayload,
): Promise<ApplicantProfileResponse> {
  let res: Response;

  try {
    res = await fetch(`${KORA_API_BASE}${API_PREFIX}/profiles`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Network error calling /profiles:", error);
    throw new Error("Could not reach Kora API for profiles");
  }

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Kora /profiles error", res.status, body);
    throw new Error(body?.detail || body?.error || "Failed to save applicant profile");
  }

  return body as ApplicantProfileResponse;
}

/** -------- Resolve onboarding -------- */

export async function resolveOnboarding(
  applicationId: string,
  payload: OnboardingResolveRequest,
): Promise<OnboardingResolveResponse> {
  let res: Response;

  try {
    res = await fetch(
      `${KORA_API_BASE}${API_PREFIX}/applications/${applicationId}/resolve-onboarding`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
    );
  } catch (error) {
    console.error("Network error calling resolve-onboarding:", error);
    throw new Error("Could not reach Kora API for onboarding resolution");
  }

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Kora resolve-onboarding error", res.status, body);
    throw new Error(body?.detail || body?.error || "Failed to resolve onboarding requirements");
  }

  return body as OnboardingResolveResponse;
}

/** -------- Evidence pack -------- */

export async function fetchEvidencePack(
  applicationId: string,
): Promise<EvidencePackResponse> {
  let res: Response;

  try {
    res = await fetch(
      `${KORA_API_BASE}${API_PREFIX}/evidence/applications/${applicationId}`,
      { method: "GET" },
    );
  } catch (error) {
    console.error("Network error calling evidence pack:", error);
    throw new Error("Could not reach Kora API for evidence pack");
  }

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Kora evidence pack error", res.status, body);
    throw new Error(body?.detail || body?.error || "Failed to fetch evidence pack");
  }

  return body as EvidencePackResponse;
}

/** =====================================================================
 * COMPANY PROFILE (BUSINESS)
 * ===================================================================== */

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
  incorporation_date?: string | null; // ISO date
  legal_form?: string | null;

  registered_address?: string | null;
  operating_address?: string | null;

  main_business_activity?: string | null;
  activity_risk_category?: string | null;

  has_tax_registration?: boolean | null;
  tax_registration_number?: string | null;

  has_precious_metals_permit?: boolean | null;
  precious_metals_permit_ref?: string | null;
  precious_metals_permit_expiry?: string | null; // ISO date

  license_number?: string | null;
  license_issue_date?: string | null; // ISO date
  license_expiry_date?: string | null; // ISO date
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

  // Optional initial fields
  country_of_incorporation?: string | null;
  registration_jurisdiction?: string | null;
};

export type CompanyProfilePatchPayload = Partial<
  Omit<
    CompanyProfile,
    | "id"
    | "tenant_id"
    | "application_id"
    | "applicant_id"
    | "created_at"
    | "updated_at"
  >
>;

/**
 * NOTE:
 * You said: "We should standardise on dynamic route".
 * Therefore these 3 functions use Next.js API routes when running in the browser:
 * - GET /api/profiles/company/[applicationId]
 * - PATCH /api/profiles/company/[applicationId]
 * - PATCH /api/profiles/company/apply-document/[applicationId]/[documentId]
 *
 * Server-side fallback still uses FastAPI directly.
 */

export async function upsertCompanyProfile(
  payload: CompanyProfileCreatePayload,
): Promise<CompanyProfile> {
  // You have no Next proxy route for POST yet, so keep direct for now.
  let res: Response;

  try {
    res = await fetch(`${KORA_API_BASE}${API_PREFIX}/profiles/company`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (error) {
    console.error("Network error calling /profiles/company:", error);
    throw new Error("Could not reach Kora API for company profile");
  }

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Kora /profiles/company error", res.status, body);
    throw new Error(body?.detail || body?.error || "Failed to create company profile");
  }

  return body as CompanyProfile;
}

export async function fetchCompanyProfile(
  applicationId: string,
): Promise<CompanyProfile> {
  const res = await _koraFetch(
    {
      client: `/api/profiles/company/${encodeURIComponent(applicationId)}`,
      server: `${API_PREFIX}/profiles/company/${encodeURIComponent(applicationId)}`,
    },
    { method: "GET" },
  );

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Company profile GET error", res.status, body);
    throw new Error(
      body?.detail || body?.error || body?.message || "Failed to fetch company profile",
    );
  }

  return body as CompanyProfile;
}

export async function patchCompanyProfile(
  applicationId: string,
  patch: CompanyProfilePatchPayload,
): Promise<CompanyProfile> {
  const res = await _koraFetch(
    {
      client: `/api/profiles/company/${encodeURIComponent(applicationId)}`,
      server: `${API_PREFIX}/profiles/company/${encodeURIComponent(applicationId)}`,
    },
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    },
  );

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Company profile PATCH error", res.status, body);
    throw new Error(
      body?.detail || body?.error || body?.message || "Failed to update company profile",
    );
  }

  return body as CompanyProfile;
}

export async function applyBusinessDocumentToCompanyProfile(
  applicationId: string,
  documentId: string,
): Promise<CompanyProfile> {
  const res = await _koraFetch(
    {
      client: `/api/profiles/company/apply-document/${encodeURIComponent(
        applicationId,
      )}/${encodeURIComponent(documentId)}`,
      server: `${API_PREFIX}/profiles/company/${encodeURIComponent(
        applicationId,
      )}/apply-document/${encodeURIComponent(documentId)}`,
    },
    { method: "PATCH" },
  );

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Company profile apply-document error", res.status, body);
    throw new Error(
      body?.detail ||
        body?.error ||
        body?.message ||
        "Failed to apply document to company profile",
    );
  }

  return body as CompanyProfile;
}

/** -------- Questionnaires (draft autosave) -------- */

export async function upsertQuestionnaire(
  payload: QuestionnaireUpsertPayload,
): Promise<QuestionnaireResponse> {
  const res = await _koraFetch(
    {
      client: `/api/questionnaires`,
      server: `${API_PREFIX}/questionnaires`,
    },
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Questionnaire PUT error", res.status, body);
    throw new Error(
      body?.detail || body?.error || body?.message || "Failed to save questionnaire",
    );
  }

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

  const res = await _koraFetch(
    {
      client: `/api/questionnaires?${qs}`,
      server: `${API_PREFIX}/questionnaires?${qs}`,
    },
    { method: "GET" },
  );

  if (res.status === 404) {
    const err: any = new Error("Questionnaire not found");
    err.status = 404;
    throw err;
  }

  const body = await _readJsonOrNull(res);

  if (!res.ok) {
    console.error("Questionnaire GET error", res.status, body);
    throw new Error(
      body?.detail || body?.error || body?.message || "Failed to fetch questionnaire",
    );
  }

  return body as QuestionnaireResponse;
}

/**
 * Autosave helper:
 * - merges patch into current responses (optionally fetching existing first)
 * - then UPSERTs
 *
 * If your UI already holds the full responses object, skip this and call upsertQuestionnaire() directly.
 */
export async function autosaveQuestionnaireDraft(args: {
  tenant_id: string;
  application_id: string;
  questionnaire_code: QuestionnaireCode;
  questionnaire_version: string;
  patch: Record<string, any>;
}): Promise<QuestionnaireResponse> {
  // Fetch existing (treat 404 as empty)
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

  const mergedResponses = {
    ...(existing?.responses ?? {}),
    ...(args.patch ?? {}),
  };

  return upsertQuestionnaire({
    tenant_id: args.tenant_id,
    application_id: args.application_id,
    questionnaire_code: args.questionnaire_code,
    questionnaire_version: args.questionnaire_version,
    responses: mergedResponses,
  });
}
