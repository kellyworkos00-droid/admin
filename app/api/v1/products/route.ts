import { prisma } from "@/lib/prisma";
import { jsonNoContent, jsonOk, parsePageParams } from "@/lib/api";
import { serializeProduct } from "@/lib/serializers";

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

  const where = {
    isActive: true,
    ...(category ? { category } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" as const } },
            { description: { contains: search, mode: "insensitive" as const } },
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
    prisma.product.findMany({ where, orderBy, skip, take: limit }),
    prisma.product.count({ where }),
  ]);

  return jsonOk({
    data: items.map(serializeProduct),
    meta: { page, limit, total },
  });
}
