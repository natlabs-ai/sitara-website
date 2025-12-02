// src/app/api/documents/address/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const backendBaseUrl = process.env.KORA_API_BASE_URL;
    if (!backendBaseUrl) {
      console.error("KORA_API_BASE_URL is not set");
      return NextResponse.json(
        { error: "Backend URL is not configured" },
        { status: 500 },
      );
    }

    const backendUrl = `${backendBaseUrl}/api/v1/documents/address`;

    const res = await fetch(backendUrl, {
      method: "POST",
      body: formData,
    });

    let data: unknown = null;
    try {
      data = await res.json();
    } catch {
      // ignore JSON parse error, we'll just return empty body with same status
    }

    return NextResponse.json(data ?? {}, { status: res.status });
  } catch (error) {
    console.error("PoA proxy error:", error);
    return NextResponse.json(
      { error: "Failed to upload proof of address" },
      { status: 500 },
    );
  }
}
