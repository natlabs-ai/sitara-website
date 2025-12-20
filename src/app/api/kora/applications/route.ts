import { NextResponse } from "next/server";

const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";
const API_PREFIX = "/api/v1";

export async function POST(req: Request) {
  try {
    const payload = await req.json();

    const res = await fetch(`${KORA_API_BASE}${API_PREFIX}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      return NextResponse.json(
        { detail: body?.detail || body?.error || "Failed to create application" },
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
