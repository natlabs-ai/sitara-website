// src/lib/koraClient.ts

export type CreateApplicationPayload = {
  tenant_code: string;              // e.g. "sitara-core"
  account_type: "individual" | "business";
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
};

// Base URL: host + port ONLY (no /api/v1 here)
const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";

// Central API prefix
const API_PREFIX = "/api/v1";

export async function fetchPassport(passportId: number) {
  const res = await fetch(
    `${KORA_API_BASE}${API_PREFIX}/passports/${passportId}`,
    {
      method: "GET",
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch passport ${passportId}`);
  }

  return res.json();
}

export async function createApplication(
  payload: CreateApplicationPayload
): Promise<CreateApplicationResponse> {
  const res = await fetch(
    `${KORA_API_BASE}${API_PREFIX}/applications`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    console.error("Kora /applications error", res.status, body);
    throw new Error(
      body?.detail || body?.error || "Failed to create application"
    );
  }

  return body as CreateApplicationResponse;
}
