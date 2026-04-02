export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/v1/seller/orders
 * Get seller's orders with filters
 */
export async function GET(req: NextRequest) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");
    const { searchParams } = new URL(req.url);
    
    const limit = parseInt(searchParams.get("limit") || "20");
    const offset = parseInt(searchParams.get("offset") || "0");
    const status = searchParams.get("status");
    const paymentStatus = searchParams.get("paymentStatus");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    const where: any = { sellerId };
    if (status) where.status = status;
    if (paymentStatus) where.paymentStatus = paymentStatus;

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.order.count({ where }),
    ]);

    return NextResponse.json({
      orders: orders.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        customerPhone: o.customerPhone,
        city: o.city,
        status: o.status,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal),
        platformFee: Number(o.platformFee),
        shippingFee: Number(o.deliveryFee),
        total: Number(o.total),
        sellerPayout: Number(o.sellerPayout),
        items: o.items.length,
        createdAt: o.createdAt,
        deliveredAt: o.deliveredAt,
      })),
      pagination: {
        total,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("Orders error:", error);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}
