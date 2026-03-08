export default function AdminOrdersPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900">Orders</h2>
      <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-sm text-gray-600">Order queue with status updates (PENDING, CONFIRMED, SHIPPED, DELIVERED, CANCELLED) will be listed here.</p>
      </div>
    </main>
  );
}
