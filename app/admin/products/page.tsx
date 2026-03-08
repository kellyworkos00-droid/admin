export default function AdminProductsPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Products</h2>
        <button className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white">Add Product</button>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Product table and create/edit/delete forms will be connected to /api/v1/admin/products.</p>
      </div>
    </main>
  );
}
