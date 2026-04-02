"use client";

import { useEffect, useState } from "react";
import { fetchAllSellers, updateSeller } from "@/lib/seller-api";

export function SellersList() {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadSellers();
  }, [filter, searchTerm]);

  async function loadSellers() {
    setLoading(true);
    try {
      const data = await fetchAllSellers({
        status: filter || undefined,
        search: searchTerm || undefined,
        limit: 50,
      });
      setSellers(data.sellers);
    } catch (error) {
      console.error("Failed to load sellers:", error);
    } finally {
      setLoading(false);
    }
  }

  async function verifySeller(sellerId: string) {
    try {
      await updateSeller(sellerId, { status: "VERIFIED" });
      loadSellers();
    } catch (error) {
      console.error("Failed to verify seller:", error);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border rounded-lg"
        >
          <option value="">All Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="VERIFIED">Verified</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading sellers...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Business Name</th>
                <th className="px-4 py-2 text-left">Contact</th>
                <th className="px-4 py-2 text-left">Status</th>
                <th className="px-4 py-2 text-left">Subscription</th>
                <th className="px-4 py-2 text-left">Orders</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.map((seller: any) => (
                <tr key={seller.id} className="border-b hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium">{seller.businessName}</td>
                  <td className="px-4 py-2 text-sm">
                    <div>{seller.email}</div>
                    <div className="text-gray-500">{seller.phone}</div>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-semibold ${
                        seller.status === "VERIFIED"
                          ? "bg-green-100 text-green-800"
                          : seller.status === "PENDING"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {seller.status}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <div className="text-sm font-medium">{seller.subscriptionTier}</div>
                    {seller.subscriptionExpiry && (
                      <div className="text-xs text-gray-500">
                        Expires: {new Date(seller.subscriptionExpiry).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2">{seller.totalOrders}</td>
                  <td className="px-4 py-2">
                    {seller.status === "PENDING" && (
                      <button
                        onClick={() => verifySeller(seller.id)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        Verify
                      </button>
                    )}
                    <a
                      href={`/admin/sellers/${seller.id}`}
                      className="text-blue-600 hover:underline text-sm ml-2"
                    >
                      View Details
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
