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

/** -------- Base config -------- */

// Base URL: host + port ONLY (no /api/v1 here)
const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";

// Central API prefix
const API_PREFIX = "/api/v1";

/** -------- Existing helpers -------- */

export async function fetchPassport(passportId: number) {
  const res = await fetch(`${KORA_API_BASE}${API_PREFIX}/passports/${passportId}`, {
    method: "GET",
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch passport ${passportId}`);
  }

  return res.json();
}

/** -------- Create application -------- */

export async function createApplication(
  payload: CreateApplicationPayload,
): Promise<CreateApplicationResponse> {
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

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // ignore parse errors
  }

  if (!res.ok) {
    console.error("Kora /profiles error", res.status, body);
    throw new Error(body?.detail || body?.error || "Failed to save applicant profile");
  }

  return body as ApplicantProfileResponse;
}

/** -------- Resolve onboarding --------
 * For local dev you can call backend directly.
 * If you prefer routing via Next API, switch the fetch URL to "/api/kora/resolve-onboarding"
 */

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

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // ignore
  }

  if (!res.ok) {
    console.error("Kora resolve-onboarding error", res.status, body);
    throw new Error(body?.detail || body?.error || "Failed to resolve onboarding requirements");
  }

  return body as OnboardingResolveResponse;
}
