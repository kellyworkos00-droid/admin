import { prisma } from "@/lib/prisma";
import { calculatePromoDiscount, getValidPromoByCode } from "@/lib/promos";
import { jsonError, jsonNoContent, jsonOk } from "@/lib/api";

type ValidatePayload = {
  code: string;
  items: Array<{ productId: string; quantity: number }>;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return jsonNoContent();
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as ValidatePayload | null;
  if (!body || typeof body.code !== "string" || !Array.isArray(body.items) || body.items.length === 0) {
    return jsonError("Invalid payload", 422);
  }

  const promo = await getValidPromoByCode(body.code);
  if (!promo) {
    return jsonError("Invalid or expired promo code", 404);
  }

  const products = await prisma.product.findMany({
    where: { id: { in: body.items.map((item) => item.productId) }, isActive: true },
    select: { id: true, category: true, bulkPrice: true },
  });

  if (products.length !== body.items.length) {
    return jsonError("One or more products are invalid", 404);
  }

  const pricedItems = body.items.map((item) => {
    const product = products.find((entry) => entry.id === item.productId)!;
    const lineTotal = Number(product.bulkPrice) * item.quantity;
    return {
      productId: item.productId,
      category: product.category,
      lineTotal,
    };
  });

  const subtotal = pricedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const discount = calculatePromoDiscount({
    promo,
    items: pricedItems,
    subtotal,
  });

  return jsonOk({
    code: promo.code,
    discountType: promo.discountType,
    discountValue: promo.discountValue,
    discountAmount: discount,
  });
}
