import { NextRequest, NextResponse } from "next/server";
import { koraFetch } from "@/lib/koraServer";

type Context = { params: Promise<{ path: string[] }> };

async function proxy(req: NextRequest, context: Context) {
  const { path } = await context.params;
  const pathStr  = "/" + path.join("/");
  const search   = req.nextUrl.search;
  const method   = req.method;
  const token    = req.cookies.get("access_token")?.value;

  let body: unknown;
  if (method !== "GET" && method !== "HEAD") {
    body = await req.json().catch(() => undefined);
  }

  let upstream: Response;
  try {
    upstream = await koraFetch(`/api/v1${pathStr}${search}`, { method, body, accessToken: token });
  } catch {
    return NextResponse.json({ detail: "Upstream unavailable" }, { status: 502 });
  }

  const data = await upstream.json().catch(() => ({}));
  return NextResponse.json(data, { status: upstream.status });
}

export const GET    = proxy;
export const POST   = proxy;
export const PATCH  = proxy;
export const DELETE = proxy;
