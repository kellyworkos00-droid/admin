export default function AdminProductsPage() {
  const rows = [
    { name: "Classic Leather Bag", sku: "ET-BAG-001", stock: 24, price: "$89.00", status: "Active" },
    { name: "Silk Wrap Dress", sku: "ET-DRS-014", stock: 8, price: "$129.00", status: "Low stock" },
    { name: "Premium Sneakers", sku: "ET-SNK-102", stock: 41, price: "$99.00", status: "Active" },
  ];

  return (
    <main className="space-y-5">
      <section className="admin-card flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Products</h2>
          <p className="mt-1 text-sm text-gray-600">Update catalog data, pricing, and stock visibility.</p>
        </div>
        <button className="rounded-xl bg-gradient-to-r from-rose-700 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-rose-800 hover:to-red-700">
          + Add Product
        </button>
      </section>

      <section className="admin-card">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Search product or SKU"
            className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none transition focus:border-rose-400 md:max-w-xs"
          />
          <div className="flex gap-2">
            <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">Filter</button>
            <button className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700">Export</button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="admin-table min-w-[720px]">
            <thead>
              <tr>
                <th>Product</th>
                <th>SKU</th>
                <th>Stock</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sku}>
                  <td className="font-semibold text-gray-900">{row.name}</td>
                  <td>{row.sku}</td>
                  <td>{row.stock}</td>
                  <td>{row.price}</td>
                  <td>
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-bold ${
                        row.status === "Low stock" ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-card bg-gradient-to-r from-rose-50 to-orange-50">
        <h3 className="text-base font-bold text-gray-900">Catalog Tip</h3>
        <p className="mt-1 text-sm text-gray-700">
          Keep at least 10 units for your top 20 products to reduce checkout drop-offs from out-of-stock items.
        </p>
      </section>
    </main>
  );
}
