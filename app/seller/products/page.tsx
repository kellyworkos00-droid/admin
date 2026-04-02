"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ProductsList } from "@/app/admin/components/ProductsList";

function getSellerIdFromToken(): string | null {
  const token = localStorage.getItem("auth_token");
  if (!token) {
    return null;
  }

  try {
    const decoded = JSON.parse(Buffer.from(token, "base64").toString()) as { sellerId?: string };
    return decoded.sellerId ?? null;
  } catch {
    return null;
  }
}

export default function SellerProductsPage() {
  const [sellerId, setSellerId] = useState<string | null>(null);

  useEffect(() => {
    setSellerId(getSellerIdFromToken());
  }, []);

  return (
    <main className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">My Products</h1>
          <p className="mt-1 text-gray-600">Create, edit, and manage your product catalog.</p>
        </div>
        <Link href="/seller/orders" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          View My Orders
        </Link>
      </section>

      {!sellerId ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Seller account not linked. Please log in with a seller account.
        </section>
      ) : (
        <ProductsList sellerId={sellerId} />
      )}
    </main>
  );
}
