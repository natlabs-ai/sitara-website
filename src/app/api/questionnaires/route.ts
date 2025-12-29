// src/app/api/questionnaires/route.ts

import { NextRequest, NextResponse } from "next/server";

const KORA_API_BASE =
  process.env.NEXT_PUBLIC_KORA_API_BASE_URL ??
  process.env.KORA_API_BASE_URL ??
  "http://localhost:8000";

const API_PREFIX = "/api/v1";

function buildUpstreamUrl(path: string, req: NextRequest) {
  const base = KORA_API_BASE.replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;

  // Preserve querystring
  const url = new URL(`${base}${p}`);
  req.nextUrl.searchParams.forEach((value, key) => {
    url.searchParams.set(key, value);
  });

  return url.toString();
}

/**
 * Forward request headers that may matter for auth/session later.
 * (Keeps current behaviour but future-proofs the proxy.)
 */
function forwardHeaders(req: NextRequest) {
  const headers = new Headers();

  const auth = req.headers.get("authorization");
  if (auth) headers.set("authorization", auth);

  const cookie = req.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);

  return headers;
}

async function proxyUpstream(upstreamUrl: string, init: RequestInit) {
  const res = await fetch(upstreamUrl, init);

  // Try to return JSON if possible; else pass text through.
  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");

  if (isJson) {
    const data = await res.json().catch(() => null);
    return NextResponse.json(data, { status: res.status });
  }

  const text = await res.text().catch(() => "");
  return new NextResponse(text, { status: res.status });
}

export async function GET(req: NextRequest) {
  const upstreamUrl = buildUpstreamUrl(`${API_PREFIX}/questionnaires`, req);

  try {
    return await proxyUpstream(upstreamUrl, {
      method: "GET",
      headers: forwardHeaders(req),
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to reach upstream Kora API" },
      { status: 502 },
    );
  }
}

export async function PUT(req: NextRequest) {
  const upstreamUrl = buildUpstreamUrl(`${API_PREFIX}/questionnaires`, req);

  let body: any = null;
  try {
    body = await req.json();
  } catch {
    // Keep null
  }

  try {
    const headers = forwardHeaders(req);
    headers.set("Content-Type", "application/json");

    return await proxyUpstream(upstreamUrl, {
      method: "PUT",
      headers,
      body: body ? JSON.stringify(body) : "{}",
    });
  } catch (err: any) {
    return NextResponse.json(
      { detail: err?.message || "Failed to reach upstream Kora API" },
      { status: 502 },
    );
  }
}
