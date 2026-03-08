import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeOrder } from "@/lib/serializers";

const validStatuses = new Set(["PENDING", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED", "CANCELLED"]);

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
  const status = body?.status;
  if (typeof status !== "string" || !validStatuses.has(status)) {
    return jsonError("Invalid status payload", 422);
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status },
    include: { items: true },
  });

  return jsonOk(serializeOrder(order));
}
