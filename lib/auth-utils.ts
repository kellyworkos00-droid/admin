import { cookies } from "next/headers";
import { isMainAdminIdentity } from "@/lib/admin-policy";

export interface AuthUser {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  sellerId?: string;
  isMainAdmin?: boolean;
}

/**
 * Get auth token from cookies
 */
export function getAuthToken(): string | null {
  const cookieStore = cookies();
  const token = cookieStore.get("auth_token")?.value;
  return token || null;
}

/**
 * Verify and decode auth token
 */
export function verifyAuthToken(token: string): AuthUser | null {
  try {
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
 * Get current user from auth token
 */
export function getCurrentUser(): AuthUser | null {
  const token = getAuthToken();
  if (!token) return null;
  return verifyAuthToken(token);
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return getAuthToken() !== null;
}

/**
 * Check if user is admin
 */
export function isAdmin(): boolean {
  const user = getCurrentUser();
  return user?.role === "ADMIN";
}

export function isMainAdmin(): boolean {
  const user = getCurrentUser();
  return user?.isMainAdmin === true;
}

/**
 * Check if user is seller
 */
export function isSeller(): boolean {
  const user = getCurrentUser();
  return user?.role === "CUSTOMER" && !!user?.sellerId;
}
