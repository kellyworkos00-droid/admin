import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <h2 className="text-3xl font-bold text-gray-900">Eterna Admin Panel</h2>
      <p className="mt-2 text-gray-600">Manage products, orders, and customer records from this separate admin app.</p>
      <Link href="/admin" className="mt-6 inline-flex rounded-lg bg-red-600 px-5 py-3 font-semibold text-white">
        Open Dashboard
      </Link>
    </main>
  );
}
