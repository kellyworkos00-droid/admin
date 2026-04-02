import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Type definitions
type SellerStatus = "PENDING" | "VERIFIED" | "SUSPENDED" | "REJECTED";

/**
 * GET /api/v1/admin/sellers
 * List all sellers with filters
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { businessName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
      ];
    }

    const [sellers, total] = await Promise.all([
      prisma.seller.findMany({
        where,
        include: {
          orders: { select: { id: true } },
          subscriptions: { select: { tier: true, endDate: true }, orderBy: { startDate: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.seller.count({ where }),
    ]);

    return NextResponse.json({
      sellers: sellers.map((s) => ({
        id: s.id,
        businessName: s.businessName,
        businessType: s.businessType,
        email: s.email,
        phone: s.phone,
        status: s.status,
        subscriptionTier: s.subscriptionTier,
        rating: s.rating,
        totalOrders: s.orders.length,
        subscriptionExpiry: s.subscriptions[0]?.endDate || null,
        createdAt: s.createdAt,
      })),
      pagination: { total, limit, offset },
    });
  } catch (error) {
    console.error("Sellers list error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sellers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/admin/sellers
 * Create new seller (for admin/onboarding)
 */
export async function POST(req: NextRequest) {
  try {
    const { businessName, businessType, phone, email, address, description } = await req.json();

    if (!businessName || !businessType || !phone || !email) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if seller already exists
    const existing = await prisma.seller.findFirst({
      where: { OR: [{ email }, { phone }] },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Seller with this email or phone already exists" },
        { status: 409 }
      );
    }

    // Create user first
    const user = await prisma.user.create({
      data: {
        email,
        fullName: businessName,
        phone,
        role: "CUSTOMER", // Will be upgraded by admin if needed
      },
    });

    // Create seller
    const seller = await prisma.seller.create({
      data: {
        userId: user.id,
        businessName,
        businessType,
        phone,
        email,
        address,
        description,
        status: "PENDING", // Admin must verify
      },
    });

    return NextResponse.json({
      success: true,
      seller: {
        id: seller.id,
        businessName: seller.businessName,
        email: seller.email,
        status: seller.status,
      },
    });
  } catch (error) {
    console.error("Create seller error:", error);
    return NextResponse.json(
      { error: "Failed to create seller" },
      { status: 500 }
    );
  }
}
