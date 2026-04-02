import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureAdmin } from "@/lib/auth-guard";

// Type Definitions
type SellerStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "REJECTED";
type SubscriptionTier = "FREE" | "BASIC" | "PRO" | "ELITE";

const VALID_STATUSES: SellerStatus[] = ["PENDING", "VERIFIED", "SUSPENDED", "REJECTED"];
const VALID_TIERS: SubscriptionTier[] = ["FREE", "BASIC", "PRO", "ELITE"];

interface UpdateSellerPayload {
  status?: SellerStatus;
  subscriptionTier?: SubscriptionTier;
  subscriptionExpiry?: string;
  description?: string;
  rating?: number;
}

/**
 * GET /api/v1/admin/sellers/[id]
 * Get detailed seller information with stats and recent activity
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const authResult = ensureAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (!params.id) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      );
    }

    const seller = await prisma.seller.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, fullName: true, email: true, phone: true } },
        orders: {
          include: { items: true },
          orderBy: { createdAt: "desc" },
          take: 50,
        },
        subscriptions: { orderBy: { startDate: "desc" } },
        adCampaigns: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    // Calculate stats with proper type conversion
    const stats = {
      totalOrders: seller.orders.length,
      totalRevenue: seller.orders.reduce((sum: number, o: any) => sum + parseFloat(o.subtotal || "0"), 0),
      totalPayout: seller.orders.reduce((sum: number, o: any) => sum + parseFloat(o.sellerPayout || "0"), 0),
      totalCommissions: seller.orders.reduce((sum: number, o: any) => sum + parseFloat(o.platformFee || "0"), 0),
    };

    return NextResponse.json({
      success: true,
      data: {
        seller: {
          id: seller.id,
          businessName: seller.businessName,
          businessType: seller.businessType,
          description: seller.description,
          phone: seller.phone,
          email: seller.email,
          address: seller.address,
          logo: seller.logo,
          status: seller.status,
          subscriptionTier: seller.subscriptionTier,
          subscriptionStatus: seller.subscriptionStatus,
          subscriptionExpiresAt: seller.subscriptionExpiresAt,
          rating: seller.rating,
          totalOrders: seller.totalOrders,
          createdAt: seller.createdAt,
          user: seller.user,
        },
        stats,
        recentOrders: seller.orders.slice(0, 10).map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          status: o.status,
          paymentStatus: o.paymentStatus,
          subtotal: parseFloat(o.subtotal || "0"),
          sellerPayout: parseFloat(o.sellerPayout || "0"),
          createdAt: o.createdAt,
        })),
        subscriptions: seller.subscriptions,
        adCampaigns: seller.adCampaigns,
      },
    });
  } catch (error) {
    console.error("Get seller error:", error);
    return NextResponse.json(
      { error: "Failed to fetch seller details", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/admin/sellers/[id]
 * Update seller status, subscription, or details
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const authResult = ensureAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (!params.id) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      );
    }

    const payload = await req.json() as UpdateSellerPayload;

    // Validate input
    if (payload.status && !VALID_STATUSES.includes(payload.status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}` },
        { status: 400 }
      );
    }

    if (payload.subscriptionTier && !VALID_TIERS.includes(payload.subscriptionTier)) {
      return NextResponse.json(
        { error: `Invalid subscription tier. Must be one of: ${VALID_TIERS.join(", ")}` },
        { status: 400 }
      );
    }

    if (payload.rating !== undefined && (payload.rating < 0 || payload.rating > 5)) {
      return NextResponse.json(
        { error: "Rating must be between 0 and 5" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, any> = {};
    if (payload.status) updateData.status = payload.status;
    if (payload.subscriptionTier) updateData.subscriptionTier = payload.subscriptionTier;
    if (payload.subscriptionExpiry) {
      try {
        updateData.subscriptionExpiresAt = new Date(payload.subscriptionExpiry);
      } catch {
        return NextResponse.json(
          { error: "Invalid subscription expiry date format" },
          { status: 400 }
        );
      }
    }
    if (payload.description !== undefined) updateData.description = payload.description;
    if (payload.rating !== undefined) updateData.rating = payload.rating;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields provided for update" },
        { status: 400 }
      );
    }

    const seller = await prisma.seller.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: {
        seller: {
          id: seller.id,
          businessName: seller.businessName,
          status: seller.status,
          subscriptionTier: seller.subscriptionTier,
          subscriptionExpiresAt: seller.subscriptionExpiresAt,
          rating: seller.rating,
          description: seller.description,
        },
      },
    });
  } catch (error) {
    console.error("Update seller error:", error);
    return NextResponse.json(
      { error: "Failed to update seller", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/admin/sellers/[id]
 * Suspend/reject seller account
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify admin access
    const authResult = ensureAdmin(req);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    if (!params.id) {
      return NextResponse.json(
        { error: "Seller ID is required" },
        { status: 400 }
      );
    }

    const { reason } = await req.json() as { reason?: string };

    if (!reason || reason.trim().length === 0) {
      return NextResponse.json(
        { error: "Suspension reason is required" },
        { status: 400 }
      );
    }

    // Verify seller exists
    const existingSeller = await prisma.seller.findUnique({
      where: { id: params.id },
      select: { id: true, status: true, email: true, businessName: true },
    });

    if (!existingSeller) {
      return NextResponse.json(
        { error: "Seller not found" },
        { status: 404 }
      );
    }

    // Update seller status to suspended
    const seller = await prisma.seller.update({
      where: { id: params.id },
      data: { 
        status: "SUSPENDED",
        // Log suspension with timestamp
        // Note: Add this to Prisma schema if you have an audit log table
      },
    });

    // TODO: Implement seller notification service
    // notifySellerOfSuspension({
    //   sellerId: params.id,
    //   email: existingSeller.email,
    //   businessName: existingSeller.businessName,
    //   reason,
    // });

    console.info(`[AUDIT] Seller ${params.id} suspended by admin. Reason: ${reason}`);

    return NextResponse.json({
      success: true,
      data: {
        message: "Seller account suspended successfully",
        seller: {
          id: seller.id,
          businessName: seller.businessName,
          status: seller.status,
        },
      },
    });
  } catch (error) {
    console.error("Suspend seller error:", error);
    return NextResponse.json(
      { error: "Failed to suspend seller", details: error instanceof Error ? error.message : undefined },
      { status: 500 }
    );
  }
}
