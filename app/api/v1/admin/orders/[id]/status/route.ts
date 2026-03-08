import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeOrder } from "@/lib/serializers";
import type { OrderStatus } from "@prisma/client";

const validStatuses: OrderStatus[] = ["PENDING", "CONFIRMED", "PACKING", "SHIPPED", "DELIVERED", "CANCELLED"];

function isOrderStatus(value: string): value is OrderStatus {
  return validStatuses.includes(value as OrderStatus);
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

  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (typeof status !== "string" || !isOrderStatus(status)) {
    return jsonError("Invalid status payload", 422);
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: { status },
    include: { items: true },
  });

  return jsonOk(serializeOrder(order));
}
