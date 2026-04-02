export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Type definitions
type SubscriptionTier = "FREE" | "BASIC" | "PRO" | "ELITE";
type SubscriptionStatus = "ACTIVE" | "EXPIRED" | "CANCELLED" | "PAST_DUE";

/**
 * POST /api/v1/seller/subscription/upgrade
 * Upgrade seller subscription tier
 */
export async function POST(req: NextRequest) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");
    const { tier } = await req.json();

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    if (!["FREE", "BASIC", "PRO", "ELITE"].includes(tier)) {
      return NextResponse.json(
        { error: "Invalid subscription tier" },
        { status: 400 }
      );
    }

    const seller = await prisma.seller.findUnique({
      where: { id: sellerId },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    // Create new subscription record
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const SUBSCRIPTION_PRICING = {
      FREE: 0,
      BASIC: 1000,
      PRO: 3000,
      ELITE: 7500,
    };

    const subscription = await prisma.sellerSubscription.create({
      data: {
        sellerId,
        tier: tier as SubscriptionTier,
        status: "ACTIVE" as SubscriptionStatus,
        amount: SUBSCRIPTION_PRICING[tier as keyof typeof SUBSCRIPTION_PRICING] || 0,
        startDate: new Date(),
        endDate,
        autoRenew: true,
      },
    });

    // Update seller subscription info
    await prisma.seller.update({
      where: { id: sellerId },
      data: {
        subscriptionTier: tier as SubscriptionTier,
        subscriptionStatus: "ACTIVE",
        subscriptionExpiresAt: endDate,
      },
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        tier: subscription.tier,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew,
      },
    });
  } catch (error) {
    console.error("Subscription error:", error);
    return NextResponse.json(
      { error: "Failed to update subscription" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/seller/subscription
 * Get subscription details and upgrade options
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
        subscriptions: {
          orderBy: { startDate: "desc" },
        },
      },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    const SUBSCRIPTION_FEATURES = {
      FREE: {
        maxProducts: 10,
        maxListings: 50,
        maxAds: 0,
        analyticsAccess: false,
        prioritySupport: false,
      },
      BASIC: {
        maxProducts: 50,
        maxListings: 500,
        maxAds: 3,
        analyticsAccess: true,
        prioritySupport: false,
      },
      PRO: {
        maxProducts: 200,
        maxListings: 5000,
        maxAds: 10,
        analyticsAccess: true,
        prioritySupport: true,
      },
      ELITE: {
        maxProducts: "unlimited",
        maxListings: "unlimited",
        maxAds: "unlimited",
        analyticsAccess: true,
        prioritySupport: true,
      },
    };

    return NextResponse.json({
      current: {
        tier: seller.subscriptionTier,
        status: seller.subscriptionStatus,
        expiresAt: seller.subscriptionExpiresAt,
        features: SUBSCRIPTION_FEATURES[(seller.subscriptionTier ?? "FREE") as keyof typeof SUBSCRIPTION_FEATURES],
        history: seller.subscriptions.map((s: any) => ({
          id: s.id,
          tier: s.tier,
          status: s.status,
          amount: s.amount,
          startDate: s.startDate,
          endDate: s.endDate,
          autoRenew: s.autoRenew,
        })),
      },
      upgrades: {
        FREE: { tier: "FREE", price: 0, features: SUBSCRIPTION_FEATURES.FREE },
        BASIC: { tier: "BASIC", price: 1000, features: SUBSCRIPTION_FEATURES.BASIC },
        PRO: { tier: "PRO", price: 3000, features: SUBSCRIPTION_FEATURES.PRO },
        ELITE: { tier: "ELITE", price: 7500, features: SUBSCRIPTION_FEATURES.ELITE },
      },
    });
  } catch (error) {
    console.error("Get subscription error:", error);
    return NextResponse.json(
      { error: "Failed to fetch subscription details" },
      { status: 500 }
    );
  }
}
