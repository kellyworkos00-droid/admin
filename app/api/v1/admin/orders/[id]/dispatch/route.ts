import { prisma } from "@/lib/prisma";
import { getAdminApiIdentity, hasAdminPermission, isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeOrder } from "@/lib/serializers";
import { logAuditEvent } from "@/lib/audit";

type RouteContext = {
  params: {
    id: string;
  };
};

type DispatchPayload = {
  riderName?: string;
  riderPhone?: string;
  logisticsPartner?: string;
  status?: "CONFIRMED" | "PACKING" | "READY_FOR_PICKUP" | "PICKED_UP" | "ON_DELIVERY";
};

const ALLOWED_STATUS_VALUES = new Set([
  "CONFIRMED",
  "PACKING",
  "READY_FOR_PICKUP",
  "PICKED_UP",
  "ON_DELIVERY",
]);

function normalizeOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizePhone(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const compact = value.replace(/\s+/g, "");
  return /^\+?[0-9-]{7,20}$/.test(compact) ? compact : null;
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const identity = getAdminApiIdentity(request);
  if (!hasAdminPermission(identity.role, "orders:write")) {
    return jsonError("Forbidden", 403);
  }

  const body = (await request.json().catch(() => null)) as DispatchPayload | null;
  if (!body || typeof body !== "object") {
    return jsonError("Invalid dispatch payload", 422);
  }

  const riderName = normalizeOptionalString(body.riderName);
  const riderPhone = normalizePhone(normalizeOptionalString(body.riderPhone));
  const logisticsPartner = normalizeOptionalString(body.logisticsPartner);
  const requestedStatus = typeof body.status === "string" ? body.status.trim().toUpperCase() : null;

  if (body.riderPhone && !riderPhone) {
    return jsonError("Invalid rider phone number", 422);
  }

  if (requestedStatus && !ALLOWED_STATUS_VALUES.has(requestedStatus)) {
    return jsonError("Invalid dispatch status", 422);
  }

  if (!riderName && !riderPhone && !logisticsPartner && !requestedStatus) {
    return jsonError("No dispatch changes supplied", 422);
  }

  const previous = await prisma.order.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      orderNumber: true,
      status: true,
      riderName: true,
      riderPhone: true,
      logisticsPartner: true,
    },
  });

  if (!previous) {
    return jsonError("Order not found", 404);
  }

  const order = await prisma.order.update({
    where: { id: params.id },
    data: {
      ...(riderName !== null ? { riderName } : {}),
      ...(riderPhone !== null ? { riderPhone } : {}),
      ...(logisticsPartner !== null ? { logisticsPartner } : {}),
      ...(requestedStatus ? { status: requestedStatus as any } : {}),
    },
    include: { items: true },
  });

  await logAuditEvent({
    action: "ORDER_DISPATCH_ASSIGNED",
    entityType: "order",
    entityId: order.id,
    actor: identity.actor,
    actorRole: identity.role,
    channel: "admin_api",
    metadata: {
      orderNumber: order.orderNumber,
      previousStatus: previous.status,
      nextStatus: order.status,
      previousRiderName: previous.riderName,
      previousRiderPhone: previous.riderPhone,
      previousLogisticsPartner: previous.logisticsPartner,
      riderName: order.riderName,
      riderPhone: order.riderPhone,
      logisticsPartner: order.logisticsPartner,
    },
  });

  return jsonOk(serializeOrder(order));
}
