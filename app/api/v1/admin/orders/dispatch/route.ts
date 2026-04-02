import { prisma } from "@/lib/prisma";
import { getAdminApiIdentity, hasAdminPermission, isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk, parsePageParams } from "@/lib/api";

const DISPATCHABLE_STATUSES = ["PENDING", "CONFIRMED", "PACKING", "READY_FOR_PICKUP", "PICKED_UP", "ON_DELIVERY"] as const;

type DispatchableStatus = (typeof DISPATCHABLE_STATUSES)[number];

function isDispatchableStatus(value: string): value is DispatchableStatus {
  return DISPATCHABLE_STATUSES.includes(value as DispatchableStatus);
}

export async function GET(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const identity = getAdminApiIdentity(request);
  if (!hasAdminPermission(identity.role, "orders:write")) {
    return jsonError("Forbidden", 403);
  }

  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePageParams(searchParams);
  const statusParam = searchParams.get("status")?.trim().toUpperCase();

  const where =
    statusParam && isDispatchableStatus(statusParam)
      ? { status: statusParam }
      : { status: { in: [...DISPATCHABLE_STATUSES] } };

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentStatus: true,
        customerName: true,
        customerPhone: true,
        city: true,
        addressLine1: true,
        riderName: true,
        riderPhone: true,
        logisticsPartner: true,
        total: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.order.count({ where }),
  ]);

  return jsonOk({
    data: orders.map((order) => ({
      ...order,
      total: Number(order.total),
      isAssigned: Boolean(order.riderName && order.riderPhone),
    })),
    meta: { page, limit, total },
  });
}
