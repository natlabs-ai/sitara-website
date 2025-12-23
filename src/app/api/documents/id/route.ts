import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/documents/id
 * Proxies multipart/form-data upload to Kora backend:
 * POST {KORA_API_BASE}/api/v1/documents/id
 *
 * Accepts file under keys: "file" | "document" | "upload"
 * Forwards as "file" (FastAPI convention)
 */
export async function POST(req: Request) {
  let form: FormData;

  try {
    form = await req.formData();
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Failed to parse multipart form data",
        detail: e?.message ?? String(e),
      },
      { status: 400 },
    );
  }

  // Helpful debug: what keys actually arrived
  const keys = Array.from(form.keys());
  const peek = (k: string) => {
    const v = form.get(k);
    if (v === null) return null;
    // In Next route handlers, uploaded files are Web File objects
    if (typeof v === "string") return { type: "string", length: v.length };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const f: any = v;
    return {
      type: "file",
      name: f?.name,
      size: f?.size,
      mime: f?.type,
    };
  };

  // Accept file under multiple possible field names
  const maybe =
    form.get("file") ?? form.get("document") ?? form.get("upload") ?? null;

  // Validate it is a File
  // (In Node runtime, this is typically a global File)
  const isFile =
    typeof maybe === "object" &&
    maybe !== null &&
    // @ts-ignore
    typeof (maybe as File).arrayBuffer === "function" &&
    // @ts-ignore
    typeof (maybe as File).name === "string";

  if (!isFile) {
    return NextResponse.json(
      {
        error: "No file uploaded",
        debug: {
          receivedKeys: keys,
          file: peek("file"),
          document: peek("document"),
          upload: peek("upload"),
        },
      },
      { status: 400 },
    );
  }

  const file = maybe as File;

  if (!file.name || (typeof file.size === "number" && file.size <= 0)) {
    return NextResponse.json(
      {
        error: "Empty file uploaded",
        debug: {
          receivedKeys: keys,
          file: { name: file.name, size: file.size, mime: file.type },
        },
      },
      { status: 400 },
    );
  }

  // Pull IDs from either snake_case or camelCase
  const tenantId =
    (form.get("tenant_id") as string | null) ??
    (form.get("tenantId") as string | null);
  const applicationId =
    (form.get("application_id") as string | null) ??
    (form.get("applicationId") as string | null);
  const applicantId =
    (form.get("applicant_id") as string | null) ??
    (form.get("applicantId") as string | null);

  // Build outbound multipart for FastAPI
  const out = new FormData();
  out.append("file", file); // IMPORTANT: backend expects "file"

  if (tenantId) out.append("tenant_id", String(tenantId));
  if (applicationId) out.append("application_id", String(applicationId));
  if (applicantId) out.append("applicant_id", String(applicantId));

  const KORA_API_BASE =
    process.env.NEXT_PUBLIC_KORA_API_BASE_URL ?? "http://localhost:8000";
  const API_PREFIX = "/api/v1";

  const targetUrl = `${KORA_API_BASE}${API_PREFIX}/documents/id`;

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(targetUrl, {
      method: "POST",
      body: out,
      // DO NOT set Content-Type for FormData; fetch will set proper boundary
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        error: "Could not reach Kora backend",
        detail: e?.message ?? String(e),
        targetUrl,
      },
      { status: 502 },
    );
  }

  const upstreamText = await upstreamRes.text();

  // Attempt to preserve JSON responses, but fall back to raw text
  let upstreamJson: any = null;
  try {
    upstreamJson = upstreamText ? JSON.parse(upstreamText) : null;
  } catch {
    upstreamJson = null;
  }

  if (!upstreamRes.ok) {
    return NextResponse.json(
      {
        error:
          upstreamJson?.detail ||
          upstreamJson?.error ||
          "Upstream upload failed",
        upstream_status: upstreamRes.status,
        upstream_body: upstreamJson ?? upstreamText,
      },
      { status: upstreamRes.status },
    );
  }

  // Successful: return the upstream JSON if possible
  if (upstreamJson) {
    return NextResponse.json(upstreamJson, { status: upstreamRes.status });
  }

  return new NextResponse(upstreamText, {
    status: upstreamRes.status,
    headers: { "Content-Type": upstreamRes.headers.get("Content-Type") || "text/plain" },
  });
}
