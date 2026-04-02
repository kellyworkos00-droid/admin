"use client";

import { useEffect, useState } from "react";
import { fetchSellerDetails, updateSeller } from "@/lib/seller-api";
import { SUBSCRIPTION_PRICING } from "@/lib/commissions";

interface SellerDetailsProps {
  sellerId: string;
}

export function SellerDetailsView({ sellerId }: SellerDetailsProps) {
  const [seller, setSeller] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [updating, setUpdating] = useState(false);
  const [newTier, setNewTier] = useState("");

  useEffect(() => {
    loadSeller();
  }, [sellerId]);

  async function loadSeller() {
    try {
      const data = await fetchSellerDetails(sellerId);
      setSeller(data.seller);
      setStats(data.stats);
      setNewTier(data.seller.subscriptionTier);
    } catch (error) {
      console.error("Failed to load seller:", error);
    }
  }

  async function updateSubscription() {
    if (newTier === seller.subscriptionTier) return;

    setUpdating(true);
    try {
      await updateSeller(sellerId, { subscriptionTier: newTier });
      loadSeller();
      alert("Subscription updated successfully");
    } catch (error) {
      console.error("Failed to update subscription:", error);
      alert("Failed to update subscription");
    } finally {
      setUpdating(false);
    }
  }

  if (!seller) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const averageOrderValue = stats?.totalOrders > 0
    ? (stats?.totalRevenue / stats?.totalOrders).toFixed(2)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg border">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold">{seller.businessName}</h1>
            <p className="text-gray-600 mt-1">{seller.businessType}</p>
            <div className="mt-3 space-y-1">
              <p className="text-sm">📧 {seller.email}</p>
              <p className="text-sm">📞 {seller.phone}</p>
              {seller.address && <p className="text-sm">📍 {seller.address}</p>}
            </div>
          </div>
          <div className="text-right">
            <span
              className={`px-4 py-2 rounded-full font-semibold ${
                seller.status === "VERIFIED"
                  ? "bg-green-100 text-green-800"
                  : seller.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {seller.status}
            </span>
            <p className="text-sm text-gray-500 mt-2">⭐ {seller.rating}/5</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Total Orders</p>
          <p className="text-2xl font-bold">{stats?.totalOrders}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Total Revenue</p>
          <p className="text-2xl font-bold">KES {stats?.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Avg Order Value</p>
          <p className="text-2xl font-bold">KES {Number(averageOrderValue).toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <p className="text-gray-600 text-sm">Total Commissions</p>
          <p className="text-2xl font-bold">KES {stats?.totalCommissions.toLocaleString()}</p>
        </div>
      </div>

      {/* Subscription Management */}
      <div className="bg-white p-6 rounded-lg border">
        <h2 className="text-lg font-bold mb-4">Subscription Management</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600 mb-2">Current Tier: <span className="font-semibold">{seller.subscriptionTier}</span></p>
            {seller.subscriptionExpiresAt && (
              <p className="text-sm text-gray-600">
                Expires: {new Date(seller.subscriptionExpiresAt).toLocaleDateString()}
              </p>
            )}
          </div>

          <div className="border-t pt-3">
            <label className="block text-sm font-medium mb-2">Change Subscription Tier</label>
            <div className="flex gap-2">
              <select
                value={newTier}
                onChange={(e) => setNewTier(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
              >
                <option value="FREE">FREE (KES 0)</option>
                <option value="BASIC">BASIC (KES 1,000)</option>
                <option value="PRO">PRO (KES 3,000)</option>
                <option value="ELITE">ELITE (KES 7,500)</option>
              </select>
              <button
                onClick={updateSubscription}
                disabled={updating || newTier === seller.subscriptionTier}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? "Updating..." : "Update"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      {seller && seller.recentOrders && seller.recentOrders.length > 0 && (
        <div className="bg-white p-6 rounded-lg border">
          <h2 className="text-lg font-bold mb-4">Recent Orders</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-2 text-left">Order #</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-right">Amount</th>
                  <th className="px-4 py-2 text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {seller.recentOrders.slice(0, 10).map((order: any) => (
                  <tr key={order.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-2 font-mono">{order.orderNumber}</td>
                    <td className="px-4 py-2">
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right">KES {Number(order.subtotal).toLocaleString()}</td>
                    <td className="px-4 py-2 text-right text-gray-600">
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
