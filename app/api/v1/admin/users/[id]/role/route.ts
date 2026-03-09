import { prisma } from "@/lib/prisma";
import { getAdminApiIdentity, hasAdminPermission, isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeUser } from "@/lib/serializers";
import { logAuditEvent } from "@/lib/audit";
import { sendAdminAlert } from "@/lib/alerts";

const validRoles = new Set(["ADMIN", "STAFF", "CUSTOMER"]);
type ValidRole = "ADMIN" | "STAFF" | "CUSTOMER";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const identity = getAdminApiIdentity(request);
  if (!hasAdminPermission(identity.role, "users:manage")) {
    return jsonError("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (typeof role !== "string" || !validRoles.has(role)) {
    return jsonError("Invalid role payload", 422);
  }

  const nextRole = role as ValidRole;

  const before = await prisma.user.findUnique({ where: { id: params.id }, select: { role: true, email: true } });

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role: nextRole },
  });

  await logAuditEvent({
    action: "USER_ROLE_UPDATED",
    entityType: "user",
    entityId: user.id,
    actor: identity.actor,
    actorRole: identity.role,
    channel: "admin_api",
    metadata: {
      email: before?.email ?? user.email,
      previousRole: before?.role ?? null,
      nextRole,
    },
  });

  await sendAdminAlert({
    title: "User role updated",
    severity: "critical",
    actor: identity.actor,
    source: "admin_api",
    details: {
      userId: user.id,
      email: before?.email ?? user.email,
      previousRole: before?.role ?? null,
      nextRole,
    },
  });

  return jsonOk(serializeUser(user));
}
