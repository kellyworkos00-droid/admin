export function isAdminRequest(request: Request): boolean {
  const token = request.headers.get("x-admin-token");
  const expected = process.env.ADMIN_API_TOKEN;
  if (!expected) {
    return false;
  }
  return token === expected;
}
