import { NextRequest, NextResponse } from "next/server";
import { koraFetch } from "@/lib/koraServer";

export async function GET(req: NextRequest) {
  const token = req.cookies.get("access_token")?.value;

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const upstream = await koraFetch("/api/v1/auth/me", { accessToken: token });

  if (!upstream.ok) {
    return NextResponse.json({ authenticated: false }, { status: 401 });
  }

  const user = await upstream.json();
  return NextResponse.json({ authenticated: true, user });
}
