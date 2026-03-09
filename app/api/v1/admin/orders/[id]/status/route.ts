import { prisma } from "@/lib/prisma";
import { getAdminApiIdentity, hasAdminPermission, isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeOrder } from "@/lib/serializers";
import { logAuditEvent } from "@/lib/audit";

type OrderStatusValue = "PENDING" | "CONFIRMED" | "PACKING" | "SHIPPED" | "DELIVERED" | "CANCELLED";

const validStatuses: OrderStatusValue[] = ["PENDING", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED", "CANCELLED"];

function isOrderStatus(value: string): value is OrderStatusValue {
  return validStatuses.includes(value as OrderStatusValue);
}

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
  if (!hasAdminPermission(identity.role, "orders:write")) {
    return jsonError("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== "string" || !isOrderStatus(status)) {
    return jsonError("Invalid status payload", 422);
  }

  const previous = await prisma.order.findUnique({ where: { id: params.id }, select: { status: true, orderNumber: true } });

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status },
    include: { items: true },
  });

  await logAuditEvent({
    action: "ORDER_STATUS_UPDATED",
    entityType: "order",
    entityId: order.id,
    actor: identity.actor,
    actorRole: identity.role,
    channel: "admin_api",
    metadata: {
      orderNumber: previous?.orderNumber ?? order.orderNumber,
      previousStatus: previous?.status ?? null,
      nextStatus: status,
    },
  });

  return jsonOk(serializeOrder(order));
}
