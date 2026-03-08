import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeUser } from "@/lib/serializers";

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const users = await prisma.user.findMany({ orderBy: { createdAt: "desc" } });
  return jsonOk(users.map(serializeUser));
}
