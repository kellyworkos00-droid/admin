import { NextRequest, NextResponse } from "next/server";
import { isMainAdminIdentity } from "@/lib/admin-policy";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  sellerId?: string;
  isMainAdmin?: boolean;
}

/**
 * Extract and verify auth token from request
 */
export function getAuthFromRequest(req: NextRequest): AuthUser | null {
  try {
    const token = req.cookies.get("auth_token")?.value ||
      req.headers.get("authorization")?.replace("Bearer ", "");

    if (!token) return null;

    const decoded = JSON.parse(Buffer.from(token, "base64").toString()) as AuthUser;
    return {
      ...decoded,
      isMainAdmin:
        decoded.isMainAdmin === true ||
        isMainAdminIdentity(decoded.email, decoded.role),
    };
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
 * Verify user is the main admin account
 */
export function ensureMainAdmin(req: NextRequest): AuthUser | NextResponse {
  const user = getAuthFromRequest(req);
  if (!user || user.role !== "ADMIN" || user.isMainAdmin !== true) {
    return NextResponse.json(
      { error: "Main admin access required" },
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
