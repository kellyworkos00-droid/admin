const DEFAULT_MAIN_ADMIN_EMAIL = "eterna@admin.com";

export function getMainAdminEmail(): string {
  return (process.env.MAIN_ADMIN_EMAIL || DEFAULT_MAIN_ADMIN_EMAIL).trim().toLowerCase();
}

export function isMainAdminIdentity(email: string | null | undefined, role: string | null | undefined): boolean {
  if (!email || !role) {
    return false;
  }

  return role.toUpperCase() === "ADMIN" && email.trim().toLowerCase() === getMainAdminEmail();
}
