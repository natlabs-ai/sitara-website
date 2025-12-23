// src/app/api/documents/business/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";

function firstNonEmpty(...vals: Array<FormDataEntryValue | null>) {
  for (const v of vals) {
    if (v === null || v === undefined) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();

    const file = incoming.get("file");
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    // Accept both client naming styles (camelCase and snake_case)
    const tenantId = firstNonEmpty(incoming.get("tenant_id"), incoming.get("tenantId"));
    const applicationId = firstNonEmpty(
      incoming.get("application_id"),
      incoming.get("applicationId"),
    );
    const applicantId = firstNonEmpty(
      incoming.get("applicant_id"),
      incoming.get("applicantId"),
    );
    const category = firstNonEmpty(
      incoming.get("category"),
      incoming.get("docCategory"),
      incoming.get("doc_category"),
    );

    // FastAPI requires category (Form(...)); tenant_id/application_id are also required in your handler
    if (!tenantId || !applicationId || !category) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          missing: {
            tenant_id: !tenantId,
            application_id: !applicationId,
            category: !category,
          },
        },
        { status: 400 },
      );
    }

    const outbound = new FormData();
    outbound.append("file", file);
    outbound.append("tenant_id", tenantId);
    outbound.append("application_id", applicationId);
    outbound.append("category", category);
    if (applicantId) outbound.append("applicant_id", applicantId);

    const base = KORA_API_BASE.replace(/\/$/, "");
    const res = await fetch(`${base}/api/v1/documents/business`, {
      method: "POST",
      body: outbound,
    });

    const rawText = await res.text();
    let body: any = null;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = { raw: rawText };
    }

    if (!res.ok) {
      console.error("FastAPI /documents/business error", res.status, body);
      return NextResponse.json(
        {
          error:
            body?.detail ||
            body?.error ||
            body?.raw ||
            "Failed to upload company document via Kora API",
        },
        { status: res.status },
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("Business document upload proxy error", err);
    return NextResponse.json(
      { error: "Unexpected error uploading company document. Please try again." },
      { status: 500 },
    );
  }
}
