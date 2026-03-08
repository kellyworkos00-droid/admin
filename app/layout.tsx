import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Eterna Admin",
  description: "Admin dashboard for products and orders",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
            <h1 className="text-lg font-bold text-red-700">Eterna Admin</h1>
            <nav className="flex items-center gap-4 text-sm font-semibold text-gray-700">
              <Link href="/admin">Dashboard</Link>
              <Link href="/admin/products">Products</Link>
              <Link href="/admin/orders">Orders</Link>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
