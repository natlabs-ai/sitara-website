import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("refresh_token")?.value;

  if (!refreshToken) {
    return NextResponse.json({ detail: "No refresh token" }, { status: 401 });
  }

  const upstream = await fetch(
    `${process.env.KORA_API_URL}/api/v1/auth/refresh`,
    {
      method: "POST",
      headers: {
        "Cookie": `refresh_token=${refreshToken}`,
        "X-Tenant-Key": process.env.KORA_TENANT_API_KEY!,
      },
    }
  ).catch(() => null);

  if (!upstream || !upstream.ok) {
    const error = await upstream?.json().catch(() => ({ detail: "Refresh failed" }));
    return NextResponse.json(error ?? { detail: "Refresh failed" }, { status: upstream?.status ?? 500 });
  }

  const data = await upstream.json();

  if (!data.access_token) {
    return NextResponse.json({ detail: "No access token in refresh response" }, { status: 500 });
  }

  const isProd = process.env.NODE_ENV === "production";
  const response = NextResponse.json({ message: "token refreshed" });

  response.cookies.set("access_token", data.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    maxAge: 15 * 60,
    path: "/",
  });

  return response;
}
