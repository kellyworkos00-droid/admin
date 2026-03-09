import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

export const metadata: Metadata = {
  title: "Eterna Admin",
  description: "Admin dashboard for products and orders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="admin-shell">
        <div className="mx-auto grid min-h-screen max-w-[1400px] grid-cols-1 lg:grid-cols-[260px_1fr]">
          <aside className="border-r border-gray-200/80 bg-white/90 px-4 py-5 backdrop-blur lg:sticky lg:top-0 lg:h-screen">
            <div className="rounded-2xl bg-gradient-to-r from-rose-700 to-red-600 p-4 text-white shadow-lg">
              <div className="flex items-center gap-3">
                <div className="relative h-10 w-10 overflow-hidden rounded-lg bg-white/95 p-1 shadow-sm">
                  <Image src="/logo.png" alt="Eterna logo" fill sizes="40px" className="object-contain" priority />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-rose-100">Eterna</p>
              </div>
              <h1 className="mt-1 text-xl font-bold">Admin Panel</h1>
              <p className="mt-2 text-xs text-rose-100">Manage products, orders, and business operations.</p>
            </div>

            <nav className="mt-5 space-y-1">
              <Link href="/admin" className="admin-nav-link">
                Dashboard
              </Link>
              <Link href="/admin/products" className="admin-nav-link">
                Products
              </Link>
              <Link href="/admin/orders" className="admin-nav-link">
                Orders
              </Link>
            </nav>

            <div className="mt-6 rounded-2xl border border-rose-100 bg-rose-50/70 p-4 text-xs text-rose-800">
              Keep inventory accurate and update order statuses in real time to sync with the storefront.
            </div>
          </aside>

          <div>
            <header className="sticky top-0 z-20 border-b border-gray-200/70 bg-white/85 px-4 py-3 backdrop-blur">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-gray-700">Eterna Operations Workspace</p>
                <div className="rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">Admin</div>
              </div>
            </header>

            <main className="px-4 py-6 md:px-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
