import { prisma } from "@/lib/prisma";
import { getAdminApiIdentity, hasAdminPermission, isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeProduct } from "@/lib/serializers";
import { logAuditEvent } from "@/lib/audit";

type CreateProductPayload = {
  sku: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  imageUrl?: string;
  price: number;
  bulkPrice: number;
  minOrder: number;
  stockQty?: number;
  discountPct?: number;
};

const FALLBACK_IMAGE_URL = "https://images.unsplash.com/photo-1488459716781-31db52582fe9?w=1200&q=80";

function isValidImageUrl(value: string | undefined): boolean {
  if (value === undefined) {
    return true;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  return trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.startsWith("data:image/");
}

function isValidCreateProductPayload(value: unknown): value is CreateProductPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<CreateProductPayload>;
  return (
    typeof payload.sku === "string" &&
    payload.sku.length >= 2 &&
    typeof payload.name === "string" &&
    payload.name.length >= 2 &&
    typeof payload.slug === "string" &&
    payload.slug.length >= 2 &&
    typeof payload.category === "string" &&
    payload.category.length >= 2 &&
    isValidImageUrl(payload.imageUrl) &&
    typeof payload.price === "number" &&
    payload.price > 0 &&
    typeof payload.bulkPrice === "number" &&
    payload.bulkPrice > 0 &&
    typeof payload.minOrder === "number" &&
    Number.isInteger(payload.minOrder) &&
    payload.minOrder > 0
  );
}

export async function POST(request: Request) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const identity = getAdminApiIdentity(request);
  if (!hasAdminPermission(identity.role, "catalog:write")) {
    return jsonError("Forbidden", 403);
  }

  const body = await request.json().catch(() => null);
  if (!isValidCreateProductPayload(body)) {
    return jsonError("Invalid product payload", 422);
  }

  const created = await prisma.product.create({
    data: {
      ...body,
      imageUrl: body.imageUrl?.trim() || FALLBACK_IMAGE_URL,
      stockQty: body.stockQty ?? 0,
      discountPct: body.discountPct ?? 0,
    },
  });

  await logAuditEvent({
    action: "PRODUCT_CREATED",
    entityType: "product",
    entityId: created.id,
    actor: identity.actor,
    actorRole: identity.role,
    channel: "admin_api",
    metadata: { sku: created.sku, name: created.name, category: created.category },
  });

  return jsonOk(serializeProduct(created), 201);
}
