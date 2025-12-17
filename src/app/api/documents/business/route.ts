// src/app/api/documents/business/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const file = incoming.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 },
      );
    }

    const tenantId = incoming.get("tenantId");
    const applicationId = incoming.get("applicationId");
    const docCategory = incoming.get("docCategory");

    const outbound = new FormData();
    outbound.append("file", file);

    // Match FastAPI parameter names
    if (tenantId) outbound.append("tenant_id", String(tenantId));
    if (applicationId)
      outbound.append("application_id", String(applicationId));
    if (docCategory) outbound.append("category", String(docCategory));

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
      {
        error:
          "Unexpected error uploading company document. Please try again.",
      },
      { status: 500 },
    );
  }
}
