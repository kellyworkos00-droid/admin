import { getSalesRows, aggregateDaily, getTopProductsAndCategories } from "@/lib/reports";

function formatKes(value: number) {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function AdminAnalyticsPage() {
  const rows = await getSalesRows("30d");
  const daily = aggregateDaily(rows, "30d");
  const maxDaily = Math.max(...daily.map((item) => item.total), 1);

  const weeklyRevenue = rows
    .filter((row) => row.createdAt >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000))
    .reduce((sum, row) => sum + row.total, 0);
  const monthlyRevenue = rows.reduce((sum, row) => sum + row.total, 0);
  const avgOrderValue = rows.length > 0 ? monthlyRevenue / rows.length : 0;

  const { topProducts, topCategories } = await getTopProductsAndCategories("30d");

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Analytics & Reports</h2>
        <p className="mt-1 text-sm text-gray-600">Track daily, weekly, and monthly performance in KES.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <a href="/api/v1/admin/reports/sales-csv?range=30d" className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Export CSV</a>
          <a href="/api/v1/admin/reports/sales-xlsx?range=30d" className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Export Excel</a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="admin-card"><p className="text-sm text-gray-500">Weekly Revenue</p><p className="mt-2 text-3xl font-bold text-gray-900">{formatKes(weeklyRevenue)}</p></article>
        <article className="admin-card"><p className="text-sm text-gray-500">Monthly Revenue</p><p className="mt-2 text-3xl font-bold text-gray-900">{formatKes(monthlyRevenue)}</p></article>
        <article className="admin-card"><p className="text-sm text-gray-500">Avg Order Value</p><p className="mt-2 text-3xl font-bold text-gray-900">{formatKes(avgOrderValue)}</p></article>
      </section>

      <section className="admin-card">
        <h3 className="text-lg font-bold text-gray-900">Daily Revenue (Last 30 Days)</h3>
        <div className="mt-4 space-y-2">
          {daily.map((item) => {
            const width = Math.max(4, Math.round((item.total / maxDaily) * 100));
            return (
              <div key={item.date} className="grid grid-cols-[90px_1fr_120px] items-center gap-3 text-xs">
                <span className="text-gray-500">{item.date.slice(5)}</span>
                <div className="h-2 rounded-full bg-gray-100"><div className="h-2 rounded-full bg-gradient-to-r from-rose-500 to-red-600" style={{ width: `${width}%` }} /></div>
                <span className="text-right font-semibold text-gray-700">{formatKes(item.total)}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <article className="admin-card">
          <h3 className="text-lg font-bold text-gray-900">Top Products</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {topProducts.map((item) => (
              <li key={item.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="font-medium text-gray-700">{item.name}</span>
                <span className="font-semibold text-primary-700">{formatKes(item.revenue)}</span>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-card">
          <h3 className="text-lg font-bold text-gray-900">Top Categories</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {topCategories.map((item) => (
              <li key={item.name} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                <span className="font-medium text-gray-700">{item.name}</span>
                <span className="font-semibold text-primary-700">{formatKes(item.revenue)}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </main>
  );
}
