import type { Order, OrderItem, Product, User } from "@prisma/client";
import { decimalToNumber } from "@/lib/api";

export function serializeProduct(product: Product) {
  const descriptionRaw = product.description ?? "";
  const sizesMarker = "[sizes]";
  const sizePricesMarker = "[size_prices]";

  const extractMarkerPayload = (source: string, marker: string) => {
    const markerIndex = source.indexOf(marker);
    if (markerIndex === -1) {
      return "";
    }

    const afterMarker = source.slice(markerIndex + marker.length);
    const nextIndexes = [sizesMarker, sizePricesMarker]
      .map((candidate) => afterMarker.indexOf(candidate))
      .filter((index) => index >= 0);

    const endIndex = nextIndexes.length > 0 ? Math.min(...nextIndexes) : afterMarker.length;
    return afterMarker.slice(0, endIndex).trim();
  };

  const parseSizePrices = (value: string) => {
    const map: Record<string, number> = {};
    const entries = value
      .split(/[|,]/g)
      .map((item) => item.trim())
      .filter(Boolean);

    for (const entry of entries) {
      const [sizeRaw, priceRaw] = entry.split(":");
      const size = String(sizeRaw ?? "").trim();
      const price = Number(String(priceRaw ?? "").trim());
      if (!size || !Number.isFinite(price) || price <= 0) {
        continue;
      }
      map[size] = price;
    }

    return map;
  };

  const sizesIndex = descriptionRaw.indexOf(sizesMarker);
  const sizePricesIndex = descriptionRaw.indexOf(sizePricesMarker);
  const metadataIndexes = [sizesIndex, sizePricesIndex].filter((index) => index >= 0);
  const metadataStartIndex = metadataIndexes.length > 0 ? Math.min(...metadataIndexes) : -1;
  const metadataSection = metadataStartIndex >= 0 ? descriptionRaw.slice(metadataStartIndex) : "";

  const sizes =
    metadataSection
      ? extractMarkerPayload(metadataSection, sizesMarker)
          .split(/[|,\/]/g)
          .map((size) => size.trim())
          .filter(Boolean)
      : [];

  const sizePrices = metadataSection ? parseSizePrices(extractMarkerPayload(metadataSection, sizePricesMarker)) : {};

  return {
    ...product,
    description: metadataStartIndex >= 0 ? descriptionRaw.slice(0, metadataStartIndex).trim() : descriptionRaw,
    price: decimalToNumber(product.price),
    bulkPrice: decimalToNumber(product.bulkPrice),
    sizes,
    sizePrices,
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
