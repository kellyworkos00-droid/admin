import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isMainAdminIdentity } from "@/lib/admin-policy";

type SessionPayload = {
  id: string;
  email: string;
  role: "ADMIN" | "STAFF" | "CUSTOMER";
  sellerId?: string;
  isMainAdmin?: boolean;
};

export function getCurrentSession(): SessionPayload | null {
  const token = cookies().get("auth_token")?.value;
  if (!token) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString()) as SessionPayload;
    return {
      ...decoded,
      isMainAdmin:
        decoded.isMainAdmin === true ||
        isMainAdminIdentity(decoded.email, decoded.role),
    };
  } catch {
    return null;
  }
}

export function requireMainAdminPageAccess() {
  const session = getCurrentSession();

  if (!session) {
    redirect("/auth/login");
  }

  if (session.role !== "ADMIN") {
    redirect("/seller/products");
  }

  if (session.isMainAdmin !== true) {
    redirect("/admin");
  }

  return session;
}
