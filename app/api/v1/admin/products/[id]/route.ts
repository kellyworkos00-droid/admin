import { prisma } from "@/lib/prisma";
import { isAdminRequest } from "@/lib/auth";
import { jsonError, jsonOk } from "@/lib/api";
import { serializeProduct } from "@/lib/serializers";

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

  const body = await request.json().catch(() => null);
  if (!isValidUpdateProductPayload(body)) {
    return jsonError("Invalid product payload", 422);
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: body,
  });

  return jsonOk(serializeProduct(updated));
}

export async function DELETE(request: Request, { params }: RouteContext) {
  if (!isAdminRequest(request)) {
    return jsonError("Unauthorized", 401);
  }

  const updated = await prisma.product.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return jsonOk(serializeProduct(updated));
}
