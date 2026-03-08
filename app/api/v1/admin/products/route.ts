import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeProduct } from "@/lib/serializers";

type CreateProductPayload = {
  sku: string;
  name: string;
  slug: string;
  description?: string;
  category: string;
  imageUrl: string;
  price: number;
  bulkPrice: number;
  minOrder: number;
  stockQty?: number;
  discountPct?: number;
};

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
    typeof payload.imageUrl === "string" &&
    payload.imageUrl.startsWith("http") &&
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

  const body = await request.json().catch(() => null);
  if (!isValidCreateProductPayload(body)) {
    return jsonError("Invalid product payload", 422);
  }

  const created = await prisma.product.create({
    data: {
      ...body,
      stockQty: body.stockQty ?? 0,
      discountPct: body.discountPct ?? 0,
    },
  });
  return jsonOk(serializeProduct(created), 201);
}
