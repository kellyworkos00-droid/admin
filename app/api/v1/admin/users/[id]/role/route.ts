import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeUser } from "@/lib/serializers";

const validRoles = new Set(["ADMIN", "STAFF", "CUSTOMER"]);

type RouteContext = {
  params: {
    id: string;
  };
};

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const body = await request.json().catch(() => null);
  const role = body?.role;
  if (typeof role !== "string" || !validRoles.has(role)) {
    return jsonError("Invalid role payload", 422);
  }

  const user = await prisma.user.update({
    where: { id: params.id },
    data: { role },
  });

  return jsonOk(serializeUser(user));
}
