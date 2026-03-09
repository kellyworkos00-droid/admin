import { prisma } from "@/lib/prisma";
import { getAdminApiIdentity, hasAdminPermission, isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeProduct } from "@/lib/serializers";
import { logAuditEvent } from "@/lib/audit";

type UpdateProductPayload = Partial<{
  sku: string;
  name: string;
  slug: string;
  description: string;
  category: string;
  imageUrl: string;
  price: number;
  bulkPrice: number;
  minOrder: number;
  stockQty: number;
  discountPct: number;
  isActive: boolean;
}>;

function isValidUpdateProductPayload(value: unknown): value is UpdateProductPayload {
  if (!value || typeof value !== "object") {
    return false;
  }
  return Object.keys(value as object).length > 0;
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
  if (!hasAdminPermission(identity.role, "catalog:write")) {
    return jsonError("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  if (!isValidUpdateProductPayload(body)) {
    return jsonError("Invalid product payload", 422);
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: body,
  });

  await logAuditEvent({
    action: "PRODUCT_UPDATED",
    entityType: "product",
    entityId: updated.id,
    actor: identity.actor,
    actorRole: identity.role,
    channel: "admin_api",
    metadata: { sku: updated.sku, name: updated.name, isActive: updated.isActive },
  });

  return jsonOk(serializeProduct(updated));
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const identity = getAdminApiIdentity(request);
  if (!hasAdminPermission(identity.role, "catalog:write")) {
    return jsonError("Forbidden", 403);
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  await logAuditEvent({
    action: "PRODUCT_DEACTIVATED",
    entityType: "product",
    entityId: updated.id,
    actor: identity.actor,
    actorRole: identity.role,
    channel: "admin_api",
    metadata: { sku: updated.sku, name: updated.name },
  });

  return jsonOk(serializeProduct(updated));
}
