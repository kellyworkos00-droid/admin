"use client";

import { useEffect, useMemo, useState } from "react";

type SellerOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  city: string;
  status: string;
  paymentStatus: string;
  total: number;
  sellerPayout: number;
  items: number;
  createdAt: string;
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

export default function SellerOrdersPage() {
  const [sellerId, setSellerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<SellerOrder[]>([]);
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

    const loadOrders = async () => {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/v1/seller/orders?limit=100&offset=0", {
          headers: { "X-Seller-ID": sellerId },
        });

        if (!res.ok) {
          throw new Error(`Failed to load orders (${res.status})`);
        }

        const data = (await res.json()) as { orders?: SellerOrder[] };
        if (mounted) {
          setOrders(data.orders ?? []);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err.message : "Failed to load orders");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadOrders();

    return () => {
      mounted = false;
    };
  }, [sellerId]);

  const totalPayout = useMemo(() => orders.reduce((sum, o) => sum + Number(o.sellerPayout || 0), 0), [orders]);

  return (
    <main className="space-y-6">
      <section>
        <h1 className="text-3xl font-bold">My Orders</h1>
        <p className="mt-1 text-gray-600">Track your incoming seller orders and payout totals.</p>
      </section>

      {!sellerId ? (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          Seller account not linked. Please log in with a seller account.
        </section>
      ) : null}

      {error ? (
        <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2">
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Orders</p>
          <p className="mt-2 text-3xl font-bold text-gray-900">{orders.length}</p>
        </article>
        <article className="rounded-xl border border-gray-200 bg-white p-4">
          <p className="text-sm text-gray-500">Estimated Payout</p>
          <p className="mt-2 text-3xl font-bold text-emerald-700">KES {Math.round(totalPayout).toLocaleString()}</p>
        </article>
      </section>

      <section className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Order</th>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold">Payout</th>
                <th className="px-4 py-3 font-semibold">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>Loading orders...</td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-gray-500" colSpan={6}>No orders yet.</td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="border-t border-gray-100">
                    <td className="px-4 py-3 font-semibold text-gray-900">{order.orderNumber}</td>
                    <td className="px-4 py-3 text-gray-700">
                      <div>{order.customerName}</div>
                      <div className="text-xs text-gray-500">{order.customerPhone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">{order.items}</td>
                    <td className="px-4 py-3 font-semibold text-emerald-700">KES {Math.round(Number(order.sellerPayout || 0)).toLocaleString()}</td>
                    <td className="px-4 py-3 text-gray-600">{new Date(order.createdAt).toLocaleString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
