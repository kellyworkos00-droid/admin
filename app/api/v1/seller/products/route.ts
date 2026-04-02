import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * GET /api/v1/seller/products
 * Get all products for a seller with caching headers and optimized queries
 */
export async function GET(req: NextRequest) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 200); // Max 200
    const offset = parseInt(searchParams.get("offset") || "0");
    const category = searchParams.get("category");
    const search = searchParams.get("search");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    // Build where clause efficiently
    const where: any = { sellerId };
    if (category && category.trim()) {
      where.category = category.trim();
    }
    if (search && search.trim()) {
      where.OR = [
        { name: { contains: search.trim(), mode: "insensitive" } },
        { sku: { contains: search.trim(), mode: "insensitive" } },
      ];
    }

    // Parallel queries for better performance
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        select: {
          id: true,
          sku: true,
          name: true,
          category: true,
          imageUrl: true,
          price: true,
          bulkPrice: true,
          minOrder: true,
          stockQty: true,
          discountPct: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          description: true,
        },
      }),
      prisma.product.count({ where }),
    ]);

    // Set cache headers - 5 minutes for list
    const response = NextResponse.json({
      products: products.map((p) => ({
        id: p.id,
        sku: p.sku,
        name: p.name,
        category: p.category,
        imageUrl: p.imageUrl,
        price: Number(p.price),
        bulkPrice: Number(p.bulkPrice),
        minOrder: p.minOrder,
        stockQty: p.stockQty,
        discountPct: p.discountPct,
        isActive: p.isActive,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        description: p.description,
      })),
      pagination: { total, limit, offset },
    });

    // Cache for 5 minutes (only for requests without search filters)
    if (!search && !category) {
      response.headers.set("Cache-Control", "public, max-age=300");
    } else {
      response.headers.set("Cache-Control", "public, max-age=60");
    }

    return response;
  } catch (error) {
    console.error("Products list error:", error);
    
    // Return generic error response, not sensitive info
    return NextResponse.json(
      { 
        products: [], // Empty array as fallback
        pagination: { total: 0, limit: 50, offset: 0 },
        error: "Unable to load products. Please try again.",
      },
      { status: 200 } // Return 200 with empty data instead of 500
    );
  }
}

/**
 * POST /api/v1/seller/products
 * Create a new product with validation
 */
export async function POST(req: NextRequest) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    const {
      name,
      sku,
      description,
      category,
      imageUrl,
      price,
      bulkPrice,
      minOrder,
      maxOrder,
      stockQty,
      discountPct,
    } = await req.json();

    // Validate required fields
    if (!name?.trim() || !sku?.trim() || !category?.trim()) {
      return NextResponse.json(
        { error: "Name, SKU, and category are required" },
        { status: 400 }
      );
    }

    // Validate SKU uniqueness
    const existing = await prisma.product.findUnique({
      where: { sku: sku.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "SKU already exists" },
        { status: 400 }
      );
    }

    // Generate slug
    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Math.random().toString(36).substr(2, 9)}`;

    const product = await prisma.product.create({
      data: {
        sellerId,
        name: name.trim(),
        sku: sku.trim(),
        slug,
        description: description?.trim() || "",
        category: category.trim(),
        imageUrl: imageUrl || "https://via.placeholder.com/400",
        price: new Decimal(price || 0),
        bulkPrice: new Decimal(bulkPrice || price || 0),
        minOrder: Math.max(1, parseInt(minOrder) || 1),
        stockQty: Math.max(0, parseInt(stockQty) || 0),
        discountPct: Math.max(0, Math.min(100, parseInt(discountPct) || 0)),
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, product }, { status: 201 });
  } catch (error) {
    console.error("Product create error:", error);
    return NextResponse.json(
      { error: "Failed to create product" },
      { status: 500 }
    );
  }
}
