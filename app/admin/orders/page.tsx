export default function AdminOrdersPage() {
  const orders = [
    { id: "#1054", customer: "Ada N.", total: "$156.00", payment: "COD", status: "Pending" },
    { id: "#1053", customer: "Mark T.", total: "$89.00", payment: "Card", status: "Shipped" },
    { id: "#1052", customer: "Elena R.", total: "$230.00", payment: "Card", status: "Delivered" },
  ];

  return (
    <main className="space-y-5">
      <section className="admin-card">
        <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
        <p className="mt-1 text-sm text-gray-600">Review order pipeline and update statuses for faster fulfillment.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <div className="admin-card">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">7</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-gray-500">In Transit</p>
          <p className="mt-2 text-3xl font-bold text-sky-600">11</p>
        </div>
        <div className="admin-card">
          <p className="text-sm text-gray-500">Delivered Today</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">14</p>
        </div>
      </section>

      <section className="admin-card overflow-x-auto">
        <table className="admin-table min-w-[720px]">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Total</th>
              <th>Payment</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td className="font-semibold text-gray-900">{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.total}</td>
                <td>{order.payment}</td>
                <td>
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-bold ${
                      order.status === "Pending"
                        ? "bg-amber-100 text-amber-700"
                        : order.status === "Shipped"
                          ? "bg-sky-100 text-sky-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </main>
  );
}
