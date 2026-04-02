import "./globals.css";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import AdminLayoutWrapper from "./AdminLayoutWrapper";
import { AuthProvider } from "./auth-context";

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
        <AuthProvider>
          <AdminLayoutWrapper lowStockCount={lowStockCount} newOrdersCount={newOrdersCount}>
            {children}
          </AdminLayoutWrapper>
        </AuthProvider>
      </body>
    </html>
  );
}
