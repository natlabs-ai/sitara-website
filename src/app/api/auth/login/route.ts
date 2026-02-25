import { NextRequest, NextResponse } from "next/server";
import { koraFetch } from "@/lib/koraServer";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ detail: "Invalid request body" }, { status: 400 });
  }

  const upstream = await koraFetch("/api/v1/auth/login", {
    method: "POST",
    body,
  });

  if (!upstream.ok) {
    const error = await upstream.json().catch(() => ({ detail: "Login failed" }));
    return NextResponse.json(error, { status: upstream.status });
  }

  const data = await upstream.json();
  const isProd = process.env.NODE_ENV === "production";

  // Return user data (not the raw tokens — those go into HttpOnly cookies)
  const response = NextResponse.json({
    message: "logged in",
    access_token: "", // cookie-based; empty here so callers don't use it for localStorage
    token_type: data.token_type ?? "bearer",
    applicant_id: data.applicant_id ?? null,
    email: data.email ?? null,
    applications: data.applications ?? [],
    tenant_id: data.tenant_id ?? null,
  });

  response.cookies.set("access_token", data.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });

  if (data.refresh_token) {
    response.cookies.set("refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: isProd,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60,
      path: "/api/auth",
    });
  }

  return response;
}
