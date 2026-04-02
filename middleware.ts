import { NextRequest, NextResponse } from "next/server";

type SessionPayload = {
  role?: "ADMIN" | "STAFF" | "CUSTOMER";
  sellerId?: string;
};

function decodeSessionToken(token: string | undefined): SessionPayload | null {
  if (!token) {
    return null;
  }

  try {
    return JSON.parse(Buffer.from(token, "base64").toString()) as SessionPayload;
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth_token")?.value;
  const session = decodeSessionToken(authToken);
  const pathname = request.nextUrl.pathname;

  // Allow auth pages without token
  if (pathname.startsWith("/auth")) {
    if (session) {
      if (session.role === "ADMIN") {
        return NextResponse.redirect(new URL("/admin", request.url));
      }

      if (session.sellerId) {
        return NextResponse.redirect(new URL("/seller/products", request.url));
      }
    }
    return NextResponse.next();
  }

  // Require auth for admin pages
  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/seller/products", request.url));
    }
  }

  // Require auth + seller link for seller pages
  if (pathname.startsWith("/seller")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/login", request.url));
    }

    if (!session.sellerId && session.role !== "ADMIN") {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/auth/:path*", "/seller/:path*"],
};
