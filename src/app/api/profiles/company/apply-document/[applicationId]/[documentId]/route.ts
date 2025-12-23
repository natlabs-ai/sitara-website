// src/app/api/profiles/company/apply-document/[applicationId]/[documentId]/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";

function baseUrl() {
  return KORA_API_BASE.replace(/\/$/, "");
}

export async function PATCH(
  _req: NextRequest,
  ctx: { params: Promise<{ applicationId: string; documentId: string }> },
) {
  try {
    const { applicationId, documentId } = await ctx.params;

    const res = await fetch(
      `${baseUrl()}/api/v1/profiles/company/${encodeURIComponent(
        applicationId,
      )}/apply-document/${encodeURIComponent(documentId)}`,
      { method: "PATCH" },
    );

    const rawText = await res.text();
    let body: any = null;
    try {
      body = rawText ? JSON.parse(rawText) : null;
    } catch {
      body = { raw: rawText };
    }

    if (!res.ok) {
      return NextResponse.json(
        {
          error:
            body?.detail ||
            body?.error ||
            body?.raw ||
            "Failed to apply document to company profile",
        },
        { status: res.status },
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error(
      "PATCH /api/profiles/company/apply-document/[applicationId]/[documentId] error",
      err,
    );
    return NextResponse.json(
      { error: "Unexpected error applying document to company profile." },
      { status: 500 },
    );
  }
}
