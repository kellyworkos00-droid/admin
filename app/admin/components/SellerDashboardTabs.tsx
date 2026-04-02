"use client";

import { useEffect, useState } from "react";
import { ProductsList } from "@/app/admin/components/ProductsList";

interface SellerDashboardTabsProps {
  sellerId: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function SellerDashboardTabs({
  sellerId,
  activeTab,
  onTabChange,
}: SellerDashboardTabsProps) {
  return (
    <>
      {/* Tabs Navigation */}
      <div className="border-b">
        <div className="flex gap-4">
          {["overview", "products", "orders", "subscription"].map((tab) => (
            <button
              key={tab}
              onClick={() => onTabChange(tab)}
              className={`px-4 py-3 font-medium border-b-2 transition ${
                activeTab === tab
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "overview" && "📊 Overview"}
              {tab === "products" && "📦 Products"}
              {tab === "orders" && "🛒 Orders"}
              {tab === "subscription" && "💳 Subscription"}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "products" && (
        <div className="mt-6">
          <ProductsList sellerId={sellerId} />
        </div>
      )}
    </>
  );
}
