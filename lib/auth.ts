export function isAdminRequest(request: Request): boolean {
  const token = request.headers.get("x-admin-token");
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return false;
  }
  return token === expected;
}

export function isMainAdminActor(actor: string): boolean {
  const expected = (process.env.MAIN_ADMIN_EMAIL || "eterna@admin.com").trim().toLowerCase();
  return actor.trim().toLowerCase() === expected;
}

export type AdminRole = "ADMIN" | "STAFF" | "SYSTEM";

export type AdminPermission =
  | "orders:write"
  | "catalog:write"
  | "marketing:write"
  | "customers:write"
  | "users:manage";

export function hasAdminPermission(role: AdminRole, permission: AdminPermission): boolean {
  if (role === "SYSTEM") {
    return true;
  }

  if (role === "ADMIN") {
    return true;
  }

  if (role === "STAFF") {
    return permission !== "users:manage";
  }

  return false;
}

export function getAdminApiIdentity(request: Request): { actor: string; role: AdminRole } {
  const actor = request.headers.get("x-admin-user")?.trim() || "admin-api";
  const roleHeader = request.headers.get("x-admin-role")?.trim().toUpperCase();
  const role: AdminRole = roleHeader === "STAFF" ? "STAFF" : roleHeader === "SYSTEM" ? "SYSTEM" : "ADMIN";
  return { actor, role };
}
