export default function AdminDashboardPage() {
  const metrics = [
    { label: "Today Revenue", value: "$2,480", delta: "+12.4%", tone: "text-emerald-600" },
    { label: "Open Orders", value: "18", delta: "+3", tone: "text-amber-600" },
    { label: "Products Live", value: "124", delta: "+6", tone: "text-sky-600" },
  ];

  return (
    <main className="space-y-6">
      <section className="admin-card">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-600">Overview</p>
        <h2 className="mt-2 text-2xl font-bold text-gray-900">Operations Dashboard</h2>
        <p className="mt-1 text-sm text-gray-600">Track sales momentum, fulfillment, and product activity from one place.</p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {metrics.map((item) => (
          <div key={item.label} className="admin-card">
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{item.value}</p>
            <p className={`mt-2 text-sm font-semibold ${item.tone}`}>{item.delta} vs yesterday</p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="admin-card">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-gray-900">Fulfillment Progress</h3>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">Healthy</span>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Packed Orders</span>
                <span className="font-semibold text-gray-900">72%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 w-[72%] rounded-full bg-gradient-to-r from-rose-500 to-red-600" />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Shipped Orders</span>
                <span className="font-semibold text-gray-900">54%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 w-[54%] rounded-full bg-gradient-to-r from-orange-400 to-rose-500" />
              </div>
            </div>

            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="font-medium text-gray-700">Delivered Orders</span>
                <span className="font-semibold text-gray-900">39%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100">
                <div className="h-2 w-[39%] rounded-full bg-gradient-to-r from-sky-400 to-cyan-500" />
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-gray-700">Order <span className="font-semibold">#1052</span> marked as shipped.</li>
            <li className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-gray-700">Added product <span className="font-semibold">Classic Leather Bag</span>.</li>
            <li className="rounded-xl border border-gray-100 bg-gray-50 p-3 text-gray-700">Inventory alert for <span className="font-semibold">Silk Wrap Dress</span>.</li>
          </ul>
        </div>
      </section>
    </main>
  );
}
