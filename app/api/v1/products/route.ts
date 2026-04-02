import { prisma } from "@/lib/prisma";
import { jsonNoContent, parsePageParams } from "@/lib/api";
import { NextResponse } from "next/server";

// Allow reads to be cached; POST/mutations use force-dynamic per-handler
export const dynamic = "force-dynamic";
export const revalidate = 0;

export function OPTIONS() {
  return jsonNoContent();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { page, limit, skip } = parsePageParams(searchParams);

  const search = searchParams.get("search")?.trim();
  const category = searchParams.get("category")?.trim();
  const minPrice = Number(searchParams.get("minPrice") ?? "0");
  const maxPrice = Number(searchParams.get("maxPrice") ?? String(Number.MAX_SAFE_INTEGER));
  const sort = searchParams.get("sort") ?? "newest";
  const sellerId = searchParams.get("sellerId")?.trim();

  const where: any = {
    isActive: true,
    ...(category ? { category } : {}),
    ...(sellerId ? { sellerId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
            { sku: { contains: search, mode: "insensitive" as const } },
          ],
        }
      : {}),
    bulkPrice: {
      gte: Number.isFinite(minPrice) ? minPrice : 0,
      lte: Number.isFinite(maxPrice) ? maxPrice : Number.MAX_SAFE_INTEGER,
    },
  };

  const orderBy =
    sort === "price-low"
      ? { bulkPrice: "asc" as const }
      : sort === "price-high"
      ? { bulkPrice: "desc" as const }
      : { createdAt: "desc" as const };

  const [items, total] = await Promise.all([
    prisma.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      include: {
        seller: {
          select: {
            id: true,
            businessName: true,
            logo: true,
            rating: true,
          },
        },
      },
    }),
    prisma.product.count({ where }),
  ]);

  const response = NextResponse.json({
    data: {
      data: items.map((item) => ({
        id: item.id,
        sku: item.sku,
        name: item.name,
        slug: item.slug,
        description: item.description,
        category: item.category,
        imageUrl: item.imageUrl,
        price: Number(item.price),
        bulkPrice: Number(item.bulkPrice),
        minOrder: item.minOrder,
        stockQty: item.stockQty,
        discountPct: item.discountPct,
        isActive: item.isActive,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        seller: item.seller
          ? {
              id: item.seller.id,
              businessName: item.seller.businessName,
              logo: item.seller.logo ?? null,
              rating: item.seller.rating,
            }
          : null,
      })),
      meta: { page, limit, total },
    },
  });

  // Short-lived public cache so CDN / browser can reuse results
  response.headers.set("Cache-Control", "public, s-maxage=30, stale-while-revalidate=60");
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "GET,OPTIONS");
  response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, x-admin-token");
  return response;
}
