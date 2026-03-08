import type { Order, OrderItem, Product, User } from "@prisma/client";
import { decimalToNumber } from "@/lib/api";

export function serializeProduct(product: Product) {
  return {
    ...product,
    price: decimalToNumber(product.price),
    bulkPrice: decimalToNumber(product.bulkPrice),
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
