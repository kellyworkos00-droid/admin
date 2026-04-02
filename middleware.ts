import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth_token");
  const pathname = request.nextUrl.pathname;

  // Allow auth pages without token
  if (pathname.startsWith("/auth")) {
    return NextResponse.next();
  }

  // Require auth for admin pages
  if (pathname.startsWith("/admin")) {
    if (!authToken) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*"],
};
