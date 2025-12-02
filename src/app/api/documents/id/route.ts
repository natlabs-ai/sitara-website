// src/app/api/documents/id/route.ts
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
        { status: 400 }
      );
    }

    // IDs from the client (IdDocumentUploader)
    const tenantId = incoming.get("tenantId");
    const applicationId = incoming.get("applicationId");
    const applicantId = incoming.get("applicantId");

    const outbound = new FormData();
    outbound.append("file", file);

    // Match FastAPI param names:
    if (tenantId) outbound.append("tenant_id", String(tenantId));
    if (applicationId) outbound.append("application_id", String(applicationId));
    if (applicantId) outbound.append("applicant_id", String(applicantId));

    const base = KORA_API_BASE.replace(/\/$/, "");
    const res = await fetch(`${base}/api/v1/documents/id`, {
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
      console.error("FastAPI /documents/id error", res.status, body);
      return NextResponse.json(
        {
          error:
            body?.detail ||
            body?.error ||
            body?.raw ||
            "Failed to analyze ID document via Kora API",
        },
        { status: res.status }
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("ID upload proxy error", err);
    return NextResponse.json(
      {
        error:
          "Unexpected error uploading or analyzing ID document. Please try again.",
      },
      { status: 500 }
    );
  }
}
