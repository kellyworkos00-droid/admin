import "./globals.css";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AdminShell from "./AdminShell";

export const metadata: Metadata = {
  title: "Eterna Admin",
  description: "Admin dashboard for products and orders",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [lowStockCount, newOrdersCount] = await Promise.all([
    prisma.product.count({ where: { isActive: true, stockQty: { lte: 10 } } }),
    prisma.order.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <html lang="en">
      <body className="admin-shell">
        <AdminShell lowStockCount={lowStockCount} newOrdersCount={newOrdersCount}>
          {children}
        </AdminShell>
      </body>
    </html>
  );
}
