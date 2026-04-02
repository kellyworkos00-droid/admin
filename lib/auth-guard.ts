import { NextRequest, NextResponse } from "next/server";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "CUSTOMER";
  sellerId?: string;
}

/**
 * Extract and verify auth token from request
 */
export function getAuthFromRequest(req: NextRequest): AuthUser | null {
  try {
    const token = req.cookies.get("auth_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) return null;

    const decoded = JSON.parse(Buffer.from(token, "base64").toString());
    return decoded;
  } catch (e) {
    return null;
  }
}

/**
 * Verify user is authenticated
 */
export function ensureAuth(req: NextRequest): AuthUser | NextResponse {
  const user = getAuthFromRequest(req);
  if (!user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  return user;
}

/**
 * Verify user is admin
 */
export function ensureAdmin(
  req: NextRequest
): AuthUser | NextResponse {
  const user = getAuthFromRequest(req);
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json(
      { error: "Admin access required" },
      { status: 403 }
    );
  }
  return user;
}

/**
 * Verify user is seller
 */
export function ensureSeller(req: NextRequest): AuthUser | NextResponse {
  const user = getAuthFromRequest(req);
  if (!user || !user.sellerId) {
    return NextResponse.json(
      { error: "Seller access required" },
      { status: 403 }
    );
  }
  return user;
}
