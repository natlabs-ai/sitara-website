import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";

function baseUrl() {
  return KORA_API_BASE.replace(/\/$/, "");
}

export async function GET(
  _req: NextRequest,
  ctx: { params: { applicationId: string } },
) {
  try {
    const { applicationId } = ctx.params;

    const res = await fetch(
      `${baseUrl()}/api/v1/profiles/company/${encodeURIComponent(applicationId)}`,
      { method: "GET" },
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
        { error: body?.detail || body?.error || body?.raw || "Failed to fetch company profile" },
        { status: res.status },
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("GET /api/profiles/company/[applicationId] error", err);
    return NextResponse.json(
      { error: "Unexpected error fetching company profile." },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: { applicationId: string } },
) {
  try {
    const { applicationId } = ctx.params;

    const payload = await req.json().catch(() => null);
    if (!payload || typeof payload !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const res = await fetch(
      `${baseUrl()}/api/v1/profiles/company/${encodeURIComponent(applicationId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      },
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
        { error: body?.detail || body?.error || body?.raw || "Failed to update company profile" },
        { status: res.status },
      );
    }

    return NextResponse.json(body, { status: 200 });
  } catch (err) {
    console.error("PATCH /api/profiles/company/[applicationId] error", err);
    return NextResponse.json(
      { error: "Unexpected error updating company profile." },
      { status: 500 },
    );
  }
}
