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
  sizes?: string[];
  sizePrices?: Record<string, number>;
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

function withSizesInDescription(
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

  const defaultSeller = await prisma.seller.findFirst({
    where: { status: "VERIFIED" },
    select: { id: true },
  });
  if (!defaultSeller) {
    return jsonError("No verified seller found for product assignment", 422);
  }

  const created = await prisma.product.create({
    data: {
      sku: body.sku,
      name: body.name,
      slug: body.slug,
      category: body.category,
      price: body.price,
      bulkPrice: body.bulkPrice,
      minOrder: body.minOrder,
      description: withSizesInDescription(body.description, body.sizes, body.sizePrices),
      imageUrl: body.imageUrl?.trim() || FALLBACK_IMAGE_URL,
      stockQty: body.stockQty ?? 0,
      discountPct: body.discountPct ?? 0,
      seller: { connect: { id: defaultSeller.id } },
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
