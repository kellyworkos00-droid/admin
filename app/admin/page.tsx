export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Total orders</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">0</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Active products</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">0</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Pending COD orders</p>
          <p className="mt-1 text-2xl font-bold text-gray-900">0</p>
        </article>
      </div>
    </main>
  );
}
