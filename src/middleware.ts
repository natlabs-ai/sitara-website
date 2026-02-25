import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side route guard.
 * Checks for the presence of the access_token HttpOnly cookie before
 * rendering protected pages. The full JWT is validated by the API routes
 * and AuthContext; this is a fast first gate that prevents the page HTML
 * from being served to unauthenticated visitors.
 */

const PROTECTED_PREFIXES = ["/dashboard"];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtected) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) {
      const loginUrl = new URL("/login", req.url);
      // Preserve the intended destination so we can redirect back after login
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*"],
};
