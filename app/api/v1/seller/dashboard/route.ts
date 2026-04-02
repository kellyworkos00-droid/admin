export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calculateSellerEarnings, SUBSCRIPTION_PRICING } from "@/lib/commissions";

/**
 * GET /api/v1/seller/dashboard
 * Get seller's dashboard data (earnings, stats, orders)
 */
export async function GET(req: NextRequest) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");
    
    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
      include: {
        orders: {
          where: {
            paymentStatus: "RELEASED", // Only count delivered orders
          },
          include: {
            items: true,
          },
        },
        subscriptions: {
          orderBy: { startDate: "desc" },
          take: 1,
        },
      },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    // Calculate earnings from orders
    const orderData = seller.orders.map((order: any) => ({
      subtotal: Number(order.subtotal),
      platformFee: Number(order.platformFee),
      sellerPayout: Number(order.sellerPayout),
    }));

    // cast needed until TS server reloads Prisma-generated types
    const tier = (seller.subscriptionTier ?? "FREE") as "FREE" | "BASIC" | "PRO" | "ELITE";
    const earnings = calculateSellerEarnings(orderData, tier);
    const currentSubscription = seller.subscriptions[0];

    return NextResponse.json({
      seller: {
        id: seller.id,
        businessName: seller.businessName,
        businessType: seller.businessType,
        phone: seller.phone,
        email: seller.email,
        logo: seller.logo,
        status: seller.status,
        rating: seller.rating,
      },
      subscription: {
        tier: seller.subscriptionTier,
        status: seller.subscriptionStatus,
        expiresAt: seller.subscriptionExpiresAt,
        cost: SUBSCRIPTION_PRICING[tier],
        current: currentSubscription
          ? {
              id: currentSubscription.id,
              startDate: currentSubscription.startDate,
              endDate: currentSubscription.endDate,
              autoRenew: currentSubscription.autoRenew,
            }
          : null,
      },
      earnings,
      recentOrders: seller.orders.slice(0, 10).map((order: any) => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customerName: order.customerName,
        subtotal: Number(order.subtotal),
        platformFee: Number(order.platformFee),
        sellerPayout: Number(order.sellerPayout),
        status: order.status,
        deliveredAt: order.deliveredAt,
      })),
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard data" },
      { status: 500 }
    );
  }
}
