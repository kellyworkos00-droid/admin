import { prisma } from "@/lib/prisma";
import { jsonError, jsonNoContent, jsonOk } from "@/lib/api";
import { calculatePromoDiscount, consumePromo, getValidPromoByCode } from "@/lib/promos";
import { serializeOrder } from "@/lib/serializers";

type OrderPayload = {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  addressLine1: string;
  city: string;
  notes?: string;
  paymentMethod: "CARD" | "MPESA" | "BANK" | "COD";
  promoCode?: string;
  items: Array<{ productId: string; quantity: number }>;
};

function isValidOrderPayload(value: unknown): value is OrderPayload {
  if (!value || typeof value !== "object") {
    return false;
  }

  const payload = value as Partial<OrderPayload>;
  const paymentMethods = new Set(["CARD", "MPESA", "BANK", "COD"]);

  return (
    typeof payload.customerName === "string" &&
    payload.customerName.length >= 2 &&
    typeof payload.customerPhone === "string" &&
    payload.customerPhone.length >= 7 &&
    typeof payload.addressLine1 === "string" &&
    payload.addressLine1.length >= 3 &&
    typeof payload.city === "string" &&
    payload.city.length >= 2 &&
    typeof payload.paymentMethod === "string" &&
    paymentMethods.has(payload.paymentMethod) &&
    Array.isArray(payload.items) &&
    payload.items.length > 0 &&
    payload.items.every(
      (item) =>
        item &&
        typeof item.productId === "string" &&
        item.productId.length > 0 &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0
    )
  );
}

export function OPTIONS() {
  return jsonNoContent();
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!isValidOrderPayload(body)) {
    return jsonError("Invalid order payload", 422);
  }

  const payload = body;

  const products = await prisma.product.findMany({
    where: { id: { in: payload.items.map((item) => item.productId) }, isActive: true },
  });

  if (products.length !== payload.items.length) {
    return jsonError("One or more products are invalid", 404);
  }

  const subtotal = payload.items.reduce((sum, item) => {
    const product = products.find((entry: { id: string; bulkPrice: unknown }) => entry.id === item.productId)!;
    return sum + Number(product.bulkPrice) * item.quantity;
  }, 0);

  let promoId: string | null = null;
  let promoCodeUsed: string | null = null;
  let discountAmount = 0;

  if (payload.promoCode && payload.promoCode.trim()) {
    const promo = await getValidPromoByCode(payload.promoCode);
    if (!promo) {
      return jsonError("Invalid or expired promo code", 422);
    }

    const pricedItems = payload.items.map((item) => {
      const product = products.find((entry: { id: string; category: string; bulkPrice: unknown }) => entry.id === item.productId)!;
      return {
        productId: product.id,
        category: product.category,
        lineTotal: Number(product.bulkPrice) * item.quantity,
      };
    });

    discountAmount = calculatePromoDiscount({
      promo,
      items: pricedItems,
      subtotal,
    });

    promoId = promo.id;
    promoCodeUsed = promo.code;
  }

  const shippingFee = 750;
  const total = Math.max(0, subtotal - discountAmount) + shippingFee;
  const orderNumber = `ETR-${Date.now()}`;

  const order = await prisma.order.create({
    data: {
      orderNumber,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      customerEmail: payload.customerEmail,
      addressLine1: payload.addressLine1,
      city: payload.city,
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentMethod === "COD" ? "PENDING" : "PENDING",
      subtotal,
      shippingFee,
      total,
      notes:
        promoCodeUsed && discountAmount > 0
          ? `${payload.notes ? `${payload.notes} | ` : ""}Promo ${promoCodeUsed} applied (KES ${discountAmount.toFixed(2)})`
          : payload.notes,
      items: {
        create: payload.items.map((item) => {
          const product = products.find((entry: { id: string; bulkPrice: unknown }) => entry.id === item.productId)!;
          const unitPrice = Number(product.bulkPrice);
          return {
            productId: product.id,
            quantity: item.quantity,
            unitPrice,
            lineTotal: unitPrice * item.quantity,
          };
        }),
      },
    },
    include: { items: true },
  });

  if (promoId && discountAmount > 0) {
    await consumePromo(promoId);
  }

  return jsonOk(serializeOrder(order), 201);
}
