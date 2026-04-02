import { SUBSCRIPTION_PRICING, calculateOrderCommissions } from "./commissions";

/**
 * Seller API client library
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

interface ApiOptions {
  sellerId?: string;
}

export async function fetchSellerDashboard(sellerId: string) {
  const res = await fetch(`${API_BASE}/api/v1/seller/dashboard`, {
    headers: { "X-Seller-ID": sellerId },
  });
  if (!res.ok) throw new Error("Failed to fetch dashboard");
  return res.json();
}

export async function fetchSellerOrders(
  sellerId: string,
  { limit = 20, offset = 0, status = "", paymentStatus = "" } = {}
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ...(status && { status }),
    ...(paymentStatus && { paymentStatus }),
  });

  const res = await fetch(`${API_BASE}/api/v1/seller/orders?${params}`, {
    headers: { "X-Seller-ID": sellerId },
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function fetchSubscriptionDetails(sellerId: string) {
  const res = await fetch(`${API_BASE}/api/v1/seller/subscription`, {
    headers: { "X-Seller-ID": sellerId },
  });
  if (!res.ok) throw new Error("Failed to fetch subscription details");
  return res.json();
}

export async function upgradeSubscription(sellerId: string, tier: string) {
  const res = await fetch(`${API_BASE}/api/v1/seller/subscription/upgrade`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Seller-ID": sellerId,
    },
    body: JSON.stringify({ tier }),
  });
  if (!res.ok) throw new Error("Failed to upgrade subscription");
  return res.json();
}

// Admin APIs

export async function fetchAllSellers({
  limit = 20,
  offset = 0,
  status = "",
  search = "",
} = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ...(status && { status }),
    ...(search && { search }),
  });

  const res = await fetch(`${API_BASE}/api/v1/admin/sellers?${params}`);
  if (!res.ok) throw new Error("Failed to fetch sellers");
  return res.json();
}

export async function fetchSellerDetails(sellerId: string) {
  const res = await fetch(`${API_BASE}/api/v1/admin/sellers/${sellerId}`);
  if (!res.ok) throw new Error("Failed to fetch seller details");
  return res.json();
}

export async function updateSeller(
  sellerId: string,
  updates: {
    status?: string;
    subscriptionTier?: string;
    subscriptionExpiry?: string;
    description?: string;
    rating?: number;
  }
) {
  const res = await fetch(`${API_BASE}/api/v1/admin/sellers/${sellerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error("Failed to update seller");
  return res.json();
}

export async function suspendSeller(sellerId: string, reason: string) {
  const res = await fetch(`${API_BASE}/api/v1/admin/sellers/${sellerId}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to suspend seller");
  return res.json();
}

export async function createSeller(sellerData: {
  businessName: string;
  businessType: string;
  phone: string;
  email: string;
  address?: string;
  description?: string;
}) {
  const res = await fetch(`${API_BASE}/api/v1/admin/sellers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(sellerData),
  });
  if (!res.ok) throw new Error("Failed to create seller");
  return res.json();
}

// Product Management APIs

export async function fetchSellerProducts(
  sellerId: string,
  { limit = 20, offset = 0, category = "", search = "" } = {}
) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
    ...(category && { category }),
    ...(search && { search }),
  });

  const res = await fetch(`${API_BASE}/api/v1/seller/products?${params}`, {
    headers: { "X-Seller-ID": sellerId },
  });
  if (!res.ok) throw new Error("Failed to fetch products");
  return res.json();
}

export async function fetchProductDetails(sellerId: string, productId: string) {
  const res = await fetch(`${API_BASE}/api/v1/seller/products/${productId}`, {
    headers: { "X-Seller-ID": sellerId },
  });
  if (!res.ok) throw new Error("Failed to fetch product");
  return res.json();
}

export async function createProduct(
  sellerId: string,
  productData: {
    name: string;
    sku: string;
    description?: string;
    category: string;
    imageUrl?: string;
    price: number;
    bulkPrice?: number;
    minOrder: number;
    maxOrder?: number;
    stockQty?: number;
    discountPct?: number;
  }
) {
  const res = await fetch(`${API_BASE}/api/v1/seller/products`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Seller-ID": sellerId,
    },
    body: JSON.stringify(productData),
  });
  if (!res.ok) throw new Error("Failed to create product");
  return res.json();
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  productData: Partial<{
    name: string;
    description: string;
    category: string;
    imageUrl: string;
    price: number;
    bulkPrice: number;
    minOrder: number;
    maxOrder: number;
    stockQty: number;
    discountPct: number;
    isActive: boolean;
  }>
) {
  const res = await fetch(`${API_BASE}/api/v1/seller/products/${productId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Seller-ID": sellerId,
    },
    body: JSON.stringify(productData),
  });
  if (!res.ok) throw new Error("Failed to update product");
  return res.json();
}

export async function deleteProduct(sellerId: string, productId: string) {
  const res = await fetch(`${API_BASE}/api/v1/seller/products/${productId}`, {
    method: "DELETE",
    headers: { "X-Seller-ID": sellerId },
  });
  if (!res.ok) throw new Error("Failed to delete product");
  return res.json();
}
