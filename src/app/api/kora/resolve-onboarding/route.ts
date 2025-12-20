// src/app/api/kora/resolve-onboarding/route.ts

import { NextResponse } from "next/server";

const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

type ResolveOnboardingBody = {
  application_id: string;
  takes_ownership_of_metals: boolean;
  holds_client_assets_or_funds: boolean;
  acts_as_intermediary: boolean;
  settlement_facilitation?: boolean | null;
};

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Partial<ResolveOnboardingBody>;

    const applicationId = String(payload.application_id || "").trim();
    if (!applicationId) {
      return NextResponse.json(
        { detail: "Missing required field: application_id" },
        { status: 400 },
      );
    }

    // Do not forward application_id inside the resolver payload to backend
    // (backend expects it in the URL path, not the body)
    const { application_id: _omit, ...resolverPayload } = payload;

    const res = await fetch(
      `${KORA_API_BASE}${API_PREFIX}/applications/${applicationId}/resolve-onboarding`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolverPayload),
      },
    );

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        {
          detail:
            body?.detail || body?.error || "Failed to resolve onboarding",
        },
        { status: res.status },
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { detail: e?.message || "Unexpected error" },
      { status: 500 },
    );
  }
}
