import { prisma } from "@/lib/prisma";

export type SliderProduct = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  bulkPrice: number;
  minOrder: number;
  discountPct: number;
  sliderOrder: number;
  startAt: string | null;
  endAt: string | null;
};

export type SliderManagerRow = {
  id: string;
  name: string;
  category: string;
  imageUrl: string;
  isFeatured: boolean;
  sliderOrder: number;
  startAt: string | null;
  endAt: string | null;
};

export async function ensureSliderItemsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS slider_items (
      product_id TEXT PRIMARY KEY,
      is_featured BOOLEAN NOT NULL DEFAULT FALSE,
      sort_order INTEGER NOT NULL DEFAULT 999,
      start_at TIMESTAMPTZ NULL,
      end_at TIMESTAMPTZ NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`ALTER TABLE slider_items ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ NULL;`);
  await prisma.$executeRawUnsafe(`ALTER TABLE slider_items ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ NULL;`);
}

export async function upsertSliderItem(
  productId: string,
  isFeatured: boolean,
  sortOrder: number,
  startAt: string | null = null,
  endAt: string | null = null
) {
  await ensureSliderItemsTable();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO slider_items (product_id, is_featured, sort_order, start_at, end_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (product_id)
      DO UPDATE SET
        is_featured = EXCLUDED.is_featured,
        sort_order = EXCLUDED.sort_order,
        start_at = EXCLUDED.start_at,
        end_at = EXCLUDED.end_at,
        updated_at = NOW();
    `,
    productId,
    isFeatured,
    sortOrder,
    startAt,
    endAt
  );
}

export async function saveSliderConfig(
  items: Array<{
    productId: string;
    isFeatured: boolean;
    sliderOrder: number;
    startAt: string | null;
    endAt: string | null;
  }>
) {
  await ensureSliderItemsTable();

  for (const item of items) {
    await upsertSliderItem(
      item.productId,
      item.isFeatured,
      item.sliderOrder,
      item.startAt,
      item.endAt
    );
  }
}

export async function getSliderProducts(limit = 8): Promise<SliderProduct[]> {
  await ensureSliderItemsTable();

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    name: string;
    category: string;
    imageUrl: string;
    bulkPrice: string | number;
    minOrder: number;
    discountPct: number;
    sliderOrder: number;
    startAt: string | null;
    endAt: string | null;
  }>>(
    `
      SELECT
        p.id,
        p.name,
        p.category,
        p."imageUrl" as "imageUrl",
        p."bulkPrice" as "bulkPrice",
        p."minOrder" as "minOrder",
        p."discountPct" as "discountPct",
        s.sort_order as "sliderOrder",
        s.start_at as "startAt",
        s.end_at as "endAt"
      FROM slider_items s
      INNER JOIN "Product" p ON p.id = s.product_id
      WHERE s.is_featured = TRUE
      AND p."isActive" = TRUE
      AND (s.start_at IS NULL OR s.start_at <= NOW())
      AND (s.end_at IS NULL OR s.end_at >= NOW())
      ORDER BY s.sort_order ASC, p."updatedAt" DESC
      LIMIT $1;
    `,
    limit
  );

  return rows.map((row) => ({
    ...row,
    bulkPrice: Number(row.bulkPrice),
  }));
}

export async function getSliderManagerRows(): Promise<SliderManagerRow[]> {
  await ensureSliderItemsTable();

  return prisma.$queryRawUnsafe<Array<SliderManagerRow>>(`
    SELECT
      p.id,
      p.name,
      p.category,
      p."imageUrl" as "imageUrl",
      COALESCE(s.is_featured, FALSE) as "isFeatured",
      COALESCE(s.sort_order, 999) as "sliderOrder",
      CASE WHEN s.start_at IS NULL THEN NULL ELSE to_char(s.start_at, 'YYYY-MM-DD"T"HH24:MI') END as "startAt",
      CASE WHEN s.end_at IS NULL THEN NULL ELSE to_char(s.end_at, 'YYYY-MM-DD"T"HH24:MI') END as "endAt"
    FROM "Product" p
    LEFT JOIN slider_items s ON s.product_id = p.id
    WHERE p."isActive" = TRUE
    ORDER BY COALESCE(s.sort_order, 999) ASC, p."updatedAt" DESC;
  `);
}
