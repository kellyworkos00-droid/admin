import type { Order, OrderItem, Product, User } from "@prisma/client";
import { decimalToNumber } from "@/lib/api";

export function serializeProduct(product: Product) {
  const descriptionRaw = product.description ?? "";
  const marker = "[sizes]";
  const markerIndex = descriptionRaw.lastIndexOf(marker);

  const sizes =
    markerIndex >= 0
      ? descriptionRaw
          .slice(markerIndex + marker.length)
          .split(/[|,\/]/g)
          .map((size) => size.trim())
          .filter(Boolean)
      : [];

  return {
    ...product,
    description: markerIndex >= 0 ? descriptionRaw.slice(0, markerIndex).trim() : descriptionRaw,
    price: decimalToNumber(product.price),
    bulkPrice: decimalToNumber(product.bulkPrice),
    sizes,
  };
}

export function serializeOrder(order: Order & { items?: OrderItem[] }) {
  return {
    ...order,
    subtotal: decimalToNumber(order.subtotal),
    shippingFee: decimalToNumber(order.shippingFee),
    total: decimalToNumber(order.total),
    items: order.items?.map((item) => ({
      ...item,
      unitPrice: decimalToNumber(item.unitPrice),
      lineTotal: decimalToNumber(item.lineTotal),
    })),
  };
}

export function serializeUser(user: User) {
  return user;
}
