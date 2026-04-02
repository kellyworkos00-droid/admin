"use client";

import { useEffect, useState } from "react";
import { SellerDashboardTabs } from "@/app/admin/components/SellerDashboardTabs";
import { ProductsList } from "@/app/admin/components/ProductsList";

interface EnhancedSellerDashboardProps {
  sellerId: string;
}

export function EnhancedSellerDashboard({ sellerId }: EnhancedSellerDashboardProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "products" | "orders" | "subscription"
  >("overview");

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="border-b">
        <div className="flex gap-4">
          {[
            { id: "overview", label: "📊 Overview" },
            { id: "products", label: "📦 Products" },
            { id: "orders", label: "🛒 Orders" },
            { id: "subscription", label: "💳 Subscription" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() =>
                setActiveTab(
                  tab.id as
                    | "overview"
                    | "products"
                    | "orders"
                    | "subscription"
                )
              }
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === tab.id
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Products Tab */}
      {activeTab === "products" && (
        <div className="mt-6">
          <ProductsList sellerId={sellerId} />
        </div>
      )}

      {/* Other Tabs (use existing SellerDashboardTabs) */}
      {activeTab !== "products" && (
        <SellerDashboardTabs sellerId={sellerId} activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as typeof activeTab)} />
      )}
    </div>
  );
}
