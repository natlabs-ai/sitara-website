import { NextRequest, NextResponse } from "next/server";
import { koraFetch } from "@/lib/koraServer";

type Context = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, context: Context) {
  const { path } = await context.params;
  const pathStr = "/" + path.join("/");
  const search  = req.nextUrl.search;
  const method  = req.method;
  const token   = req.cookies.get("access_token")?.value;

  const contentType = req.headers.get("content-type") ?? "";
  const isFormData  = contentType.includes("multipart/form-data");

  let upstream: Response;
  try {
    if (isFormData) {
      // Forward FormData (document uploads) without JSON-encoding
      const formData = await req.formData();
      upstream = await koraFetch(`/api/v1${pathStr}${search}`, {
        method,
        formData,
        accessToken: token,
      });
    } else if (method !== "GET" && method !== "HEAD") {
      const body = await req.json().catch(() => undefined);
      upstream = await koraFetch(`/api/v1${pathStr}${search}`, {
        method,
        body,
        accessToken: token,
      });
    } else {
      upstream = await koraFetch(`/api/v1${pathStr}${search}`, {
        method,
        accessToken: token,
      });
    }
  } catch {
    return NextResponse.json({ detail: "Upstream unavailable" }, { status: 502 });
  }

  // Forward response — preserve content-type (could be JSON or file stream)
  const upstreamContentType = upstream.headers.get("content-type") ?? "";
  if (upstreamContentType.includes("application/json")) {
    const data = await upstream.json().catch(() => ({}));
    return NextResponse.json(data, { status: upstream.status });
  }

  // Non-JSON (e.g. file download): stream through
  const blob = await upstream.blob();
  return new NextResponse(blob, {
    status: upstream.status,
    headers: { "content-type": upstreamContentType },
  });
}

export const GET    = proxy;
export const POST   = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;
