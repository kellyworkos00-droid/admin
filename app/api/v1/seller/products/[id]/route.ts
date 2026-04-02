import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Decimal } from "@prisma/client/runtime/library";

/**
 * GET /api/v1/seller/products/[id]
 * Get product details
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        sku: true,
        slug: true,
        description: true,
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
        sellerId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Verify seller owns this product
    if (product.sellerId !== sellerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      id: product.id,
      name: product.name,
      sku: product.sku,
      slug: product.slug,
      description: product.description,
      category: product.category,
      imageUrl: product.imageUrl,
      price: Number(product.price),
      bulkPrice: Number(product.bulkPrice),
      minOrder: product.minOrder,
      stockQty: product.stockQty,
      discountPct: product.discountPct,
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  } catch (error) {
    console.error("Get product error:", error);
    return NextResponse.json(
      { error: "Failed to fetch product" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/seller/products/[id]
 * Update product
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sellerId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.sellerId !== sellerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    const {
      name,
      description,
      category,
      imageUrl,
      price,
      bulkPrice,
      minOrder,
      maxOrder,
      stockQty,
      discountPct,
      isActive,
    } = await req.json();

    const updateData: any = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (category) updateData.category = category;
    if (imageUrl) updateData.imageUrl = imageUrl;
    if (price) updateData.price = new Decimal(price.toString());
    if (bulkPrice) updateData.bulkPrice = new Decimal(bulkPrice.toString());
    if (minOrder !== undefined) updateData.minOrder = parseInt(minOrder);
    if (stockQty !== undefined) updateData.stockQty = parseInt(stockQty);
    if (discountPct !== undefined) updateData.discountPct = parseInt(discountPct);
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await prisma.product.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      product: {
        id: updated.id,
        name: updated.name,
        category: updated.category,
        price: Number(updated.price),
        bulkPrice: Number(updated.bulkPrice),
        stockQty: updated.stockQty,
        isActive: updated.isActive,
      },
    });
  } catch (error) {
    console.error("Update product error:", error);
    return NextResponse.json(
      { error: "Failed to update product" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/seller/products/[id]
 * Delete product
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const sellerId = req.headers.get("X-Seller-ID");

    if (!sellerId) {
      return NextResponse.json(
        { error: "Seller ID required" },
        { status: 401 }
      );
    }

    const product = await prisma.product.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        sellerId: true,
      },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    if (product.sellerId !== sellerId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      );
    }

    await prisma.product.delete({
      where: { id: params.id },
    });

    return NextResponse.json({
      success: true,
      message: "Product deleted",
    });
  } catch (error) {
    console.error("Delete product error:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
