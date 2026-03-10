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
  sizes: string[];
  sizePrices: Record<string, number>;
}>;

function normalizeSizes(sizes: string[] | undefined): string[] {
  if (!Array.isArray(sizes)) {
    return [];
  }

  return sizes
    .map((size) => String(size).trim())
    .filter(Boolean)
    .filter((size, index, all) => all.findIndex((item) => item.toLowerCase() === size.toLowerCase()) === index)
    .slice(0, 12);
}

function normalizeSizePrices(sizePrices: Record<string, number> | undefined): Record<string, number> {
  if (!sizePrices || typeof sizePrices !== "object") {
    return {};
  }

  const normalized: Record<string, number> = {};
  for (const [size, price] of Object.entries(sizePrices)) {
    const normalizedSize = String(size).trim();
    const normalizedPrice = Number(price);
    if (!normalizedSize || !Number.isFinite(normalizedPrice) || normalizedPrice <= 0) {
      continue;
    }
    normalized[normalizedSize] = normalizedPrice;
  }

  return normalized;
}

function mergeSizesIntoDescription(
  description: string | undefined,
  sizes: string[] | undefined,
  sizePrices: Record<string, number> | undefined
) {
  const base = (description ?? "").trim();
  const normalizedSizes = normalizeSizes(sizes);
  const normalizedSizePrices = normalizeSizePrices(sizePrices);

  if (normalizedSizes.length === 0 && Object.keys(normalizedSizePrices).length === 0) {
    return base || undefined;
  }

  const metadataParts: string[] = [];
  if (normalizedSizes.length > 0) {
    metadataParts.push(`[sizes]${normalizedSizes.join("|")}`);
  }
  if (Object.keys(normalizedSizePrices).length > 0) {
    const pricesPayload = Object.entries(normalizedSizePrices)
      .map(([size, price]) => `${size}:${price}`)
      .join("|");
    metadataParts.push(`[size_prices]${pricesPayload}`);
  }

  const metadata = metadataParts.join("\n");
  return base ? `${base}\n\n${metadata}` : metadata;
}

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

  const { sizes, sizePrices, ...rest } = body;
  let descriptionSource = body.description;

  if ((sizes !== undefined || sizePrices !== undefined) && descriptionSource === undefined) {
    const existing = await prisma.product.findUnique({
      where: { id: params.id },
      select: { description: true },
    });
    descriptionSource = existing?.description ?? undefined;
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: {
      ...rest,
      ...(sizes !== undefined || sizePrices !== undefined || body.description !== undefined
        ? { description: mergeSizesIntoDescription(descriptionSource, sizes, sizePrices) }
        : {}),
    },
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
