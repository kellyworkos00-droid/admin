import { prisma } from "@/lib/prisma";
import { jsonError, jsonNoContent, jsonOk } from "@/lib/api";
import { serializeProduct } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type RouteContext = {
  params: {
    idOrSlug: string;
  };
};

export async function GET(_request: Request, { params }: RouteContext) {
  const token = params.idOrSlug;

  const product = await prisma.product.findFirst({
    where: {
      isActive: true,
      OR: [{ id: token }, { slug: token }],
    },
    include: {
      seller: {
        select: {
          id: true,
          businessName: true,
          businessType: true,
          logo: true,
          rating: true,
          description: true,
          address: true,
          phone: true,
          email: true,
          status: true,
        },
      },
    },
  });

  if (!product) {
    return jsonError("Product not found", 404);
  }

  if (!product.seller || product.seller.status !== "VERIFIED") {
    return jsonError("Product unavailable", 404);
  }

  return jsonOk({
    ...serializeProduct(product),
    seller: product.seller,
  });
}

export function OPTIONS() {
  return jsonNoContent();
}
