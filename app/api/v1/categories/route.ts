import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 120; // cache for 2 minutes

/**
 * GET /api/v1/categories
 * Get all product categories with counts — single groupBy query
 */
export async function GET(req: NextRequest) {
  try {
    const grouped = await prisma.product.groupBy({
      by: ["category"],
      where: { isActive: true },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    });

    const categories = grouped
      .filter((g) => Boolean(g.category))
      .map((g) => ({ name: g.category, count: g._count.id }));

    return NextResponse.json(
      { categories },
      {
        headers: {
          "Cache-Control": "public, s-maxage=120, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    console.error("Categories error:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}
