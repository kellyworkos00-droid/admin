import { prisma } from "@/lib/prisma";

function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminDashboardPage() {
  const now = new Date();
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  const [todayOrdersCount, todayRevenueAgg, lowStockCount, pendingOrdersCount, topProductGroups] = await Promise.all([
    prisma.order.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.order.aggregate({
      where: { createdAt: { gte: startOfToday }, status: { not: "CANCELLED" } },
      _sum: { total: true },
    }),
    prisma.product.count({ where: { isActive: true, stockQty: { lte: 10 } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
    prisma.orderItem.groupBy({
      by: ["productId"],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: "desc" } },
      take: 3,
    }),
  ]);

  const topProductIds = topProductGroups.map((entry) => entry.productId);
  const topProducts = topProductIds.length
    ? await prisma.product.findMany({ where: { id: { in: topProductIds } }, select: { id: true, name: true } })
    : [];

  const topProductNameById = new Map(topProducts.map((product) => [product.id, product.name]));
  const topSellingProducts = topProductGroups
    .map((entry) => ({
      productId: entry.productId,
      name: topProductNameById.get(entry.productId) ?? "Unknown product",
      quantity: entry._sum.quantity ?? 0,
    }))
    .filter((item) => item.quantity > 0);

  const todayRevenue = Number(todayRevenueAgg._sum.total ?? 0);

  const metrics = [
    { label: "Today Orders", value: String(todayOrdersCount), tone: "text-sky-700" },
    { label: "Revenue Today", value: formatKes(todayRevenue), tone: "text-emerald-700" },
    { label: "Low Stock Items", value: String(lowStockCount), tone: "text-amber-700" },
    { label: "Pending Orders", value: String(pendingOrdersCount), tone: "text-rose-700" },
  ];

  return (
    <main className="space-y-6">
      <section className="admin-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">Overview</p>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">Operations Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">Business health snapshot with live performance indicators.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map((item) => (
          <article key={item.label} className="admin-card">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
            <p className={`mt-2 text-xs font-semibold ${item.tone}`}>Live</p>
          </article>
        ))}

        <article className="admin-card sm:col-span-2 xl:col-span-1">
          <p className="text-sm text-gray-500">Top-Selling Products</p>
          {topSellingProducts.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-gray-700">No sales yet</p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {topSellingProducts.map((item) => (
                <li key={item.productId} className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-2 text-gray-700">
                  <span className="line-clamp-1 font-medium">{item.name}</span>
                  <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">{item.quantity}</span>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>
    </main>
  );
}
