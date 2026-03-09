import { prisma } from "@/lib/prisma";

export type SalesRow = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  paymentMethod: string;
  status: string;
  total: number;
  createdAt: Date;
};

export function getRangeStart(range: "7d" | "30d" | "90d") {
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function getSalesRows(range: "7d" | "30d" | "90d" = "30d"): Promise<SalesRow[]> {
  const start = getRangeStart(range);

  const rows = await prisma.order.findMany({
    where: {
      createdAt: { gte: start },
      status: { not: "CANCELLED" },
    },
    orderBy: { createdAt: "asc" },
    select: {
      orderNumber: true,
      customerName: true,
      customerPhone: true,
      paymentMethod: true,
      status: true,
      total: true,
      createdAt: true,
    },
  });

  return rows.map((row) => ({
    ...row,
    total: Number(row.total),
    paymentMethod: String(row.paymentMethod),
    status: String(row.status),
  }));
}

export function aggregateDaily(rows: SalesRow[], range: "7d" | "30d" | "90d") {
  const start = getRangeStart(range);
  const points = new Map<string, number>();

  const horizonDays = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  for (let i = 0; i < horizonDays; i += 1) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    points.set(key, 0);
  }

  for (const row of rows) {
    const key = row.createdAt.toISOString().slice(0, 10);
    if (points.has(key)) {
      points.set(key, (points.get(key) ?? 0) + row.total);
    }
  }

  return Array.from(points.entries()).map(([date, total]) => ({ date, total }));
}

export async function getTopProductsAndCategories(range: "7d" | "30d" | "90d" = "30d") {
  const start = getRangeStart(range);

  const items = await prisma.orderItem.findMany({
    where: {
      order: {
        createdAt: { gte: start },
        status: { not: "CANCELLED" },
      },
    },
    select: {
      quantity: true,
      lineTotal: true,
      product: {
        select: {
          name: true,
          category: true,
        },
      },
    },
  });

  const productTotals = new Map<string, { units: number; revenue: number }>();
  const categoryTotals = new Map<string, { units: number; revenue: number }>();

  for (const item of items) {
    const productName = item.product?.name ?? "Unknown";
    const category = item.product?.category ?? "Unknown";
    const units = item.quantity;
    const revenue = Number(item.lineTotal);

    const existingProduct = productTotals.get(productName) ?? { units: 0, revenue: 0 };
    productTotals.set(productName, {
      units: existingProduct.units + units,
      revenue: existingProduct.revenue + revenue,
    });

    const existingCategory = categoryTotals.get(category) ?? { units: 0, revenue: 0 };
    categoryTotals.set(category, {
      units: existingCategory.units + units,
      revenue: existingCategory.revenue + revenue,
    });
  }

  const topProducts = Array.from(productTotals.entries())
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topCategories = Array.from(categoryTotals.entries())
    .map(([name, totals]) => ({ name, ...totals }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return { topProducts, topCategories };
}
