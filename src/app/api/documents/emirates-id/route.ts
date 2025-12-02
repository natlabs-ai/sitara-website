// src/app/api/documents/emirates-id/route.ts
import { NextRequest, NextResponse } from "next/server";

const KORA_API_BASE =
  process.env.KORA_API_BASE ?? "http://localhost:8000/api/v1";

/**
 * Proxy route for uploading Emirates ID (front + back) from the browser
 * to the Kora FastAPI backend.
 *
 * Expects a multipart/form-data body with:
 *  - front: File (Emirates ID front)
 *  - back: File (Emirates ID back)
 *  - tenant_id: string (UUID)
 *  - application_id: string (UUID)
 *  - applicant_id: string (UUID, optional)
 *
 * It simply forwards the FormData to FastAPI at:
 *   POST {KORA_API_BASE}/documents/emirates-id
 */
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const res = await fetch(`${KORA_API_BASE}/documents/emirates-id`, {
      method: "POST",
      body: formData,
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error("Error proxying Emirates ID upload:", err);
    return NextResponse.json(
      { detail: "Failed to upload Emirates ID" },
      { status: 500 }
    );
  }
}
