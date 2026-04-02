"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type SellerDashboardPayload = {
  seller: {
    businessName: string;
    status: string;
    rating: number;
  };
  earnings: {
    totalOrders: number;
    totalRevenue: number;
    totalCommissions: number;
    totalPayout: number;
    netEarnings: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    sellerPayout: number;
    status: string;
  }>;
};

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

function formatKes(value: number) {
  return `KES ${Math.round(value).toLocaleString()}`;
}

export default function SellerDashboardPage() {
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [data, setData] = useState<SellerDashboardPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSellerId(getSellerIdFromToken());
  }, []);

  useEffect(() => {
    if (!sellerId) {
      setLoading(false);
      return;
    }

    let mounted = true;
    const loadDashboard = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/v1/seller/dashboard", {
          headers: { "X-Seller-ID": sellerId },
        });

        if (!res.ok) {
          throw new Error(`Failed to load dashboard (${res.status})`);
        }

        const payload = (await res.json()) as SellerDashboardPayload;
        if (mounted) {
          setData(payload);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load dashboard");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, [sellerId]);

  const cards = useMemo(() => {
    if (!data) {
      return [];
    }

    return [
      { label: "Total Orders", value: data.earnings.totalOrders.toLocaleString() },
      { label: "Revenue", value: formatKes(data.earnings.totalRevenue) },
      { label: "Payout", value: formatKes(data.earnings.totalPayout) },
      { label: "Net", value: formatKes(data.earnings.netEarnings) },
    ];
  }, [data]);

  return (
    <main className="space-y-6">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="mt-1 text-gray-600">Track performance and manage your business quickly.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/seller/products" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
            Manage Products
          </Link>
          <Link href="/seller/orders" className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-700">
            View Orders
          </Link>
        </div>
      </section>

      {!sellerId ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Seller account not linked. Please log in with a seller account.
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
      ) : null}

      {loading ? (
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-24 rounded-xl border border-gray-200 bg-gray-100 animate-pulse" />
          ))}
        </section>
      ) : null}

      {data ? (
        <>
          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <p className="text-sm text-gray-500">Business</p>
            <p className="text-xl font-bold text-gray-900">{data.seller.businessName}</p>
            <p className="mt-1 text-sm text-gray-600">Status: {data.seller.status} • Rating: {data.seller.rating}/5</p>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((card) => (
              <article key={card.label} className="rounded-xl border border-gray-200 bg-white p-4">
                <p className="text-sm text-gray-500">{card.label}</p>
                <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
              </article>
            ))}
          </section>

          <section className="rounded-xl border border-gray-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Recent Orders</h2>
              <Link href="/seller/orders" className="text-sm font-semibold text-rose-700 hover:underline">See all</Link>
            </div>

            {data.recentOrders.length === 0 ? (
              <p className="text-sm text-gray-600">No recent orders yet.</p>
            ) : (
              <div className="space-y-2">
                {data.recentOrders.map((order) => (
                  <div key={order.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2">
                    <div>
                      <p className="font-semibold text-gray-900">{order.orderNumber}</p>
                      <p className="text-xs text-gray-600">{order.customerName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-emerald-700">{formatKes(order.sellerPayout)}</p>
                      <p className="text-xs text-gray-600">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </main>
  );
}