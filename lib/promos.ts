import { prisma } from "@/lib/prisma";

export type PromoRecord = {
  id: string;
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  appliesToType: "ALL" | "CATEGORY" | "PRODUCT";
  appliesToValue: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  isActive: boolean;
};

export async function ensurePromoCodesTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS promo_codes (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      discount_type TEXT NOT NULL,
      discount_value NUMERIC(10, 2) NOT NULL,
      applies_to_type TEXT NOT NULL DEFAULT 'ALL',
      applies_to_value TEXT NULL,
      starts_at TIMESTAMPTZ NULL,
      ends_at TIMESTAMPTZ NULL,
      usage_limit INTEGER NULL,
      usage_count INTEGER NOT NULL DEFAULT 0,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);
}

export async function listPromos(): Promise<PromoRecord[]> {
  await ensurePromoCodesTable();

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: string | number;
    appliesToType: "ALL" | "CATEGORY" | "PRODUCT";
    appliesToValue: string | null;
    startsAt: string | null;
    endsAt: string | null;
    usageLimit: number | null;
    usageCount: number;
    isActive: boolean;
  }>>(`
    SELECT
      id,
      code,
      discount_type as "discountType",
      discount_value as "discountValue",
      applies_to_type as "appliesToType",
      applies_to_value as "appliesToValue",
      CASE WHEN starts_at IS NULL THEN NULL ELSE to_char(starts_at, 'YYYY-MM-DD"T"HH24:MI') END as "startsAt",
      CASE WHEN ends_at IS NULL THEN NULL ELSE to_char(ends_at, 'YYYY-MM-DD"T"HH24:MI') END as "endsAt",
      usage_limit as "usageLimit",
      usage_count as "usageCount",
      is_active as "isActive"
    FROM promo_codes
    ORDER BY is_active DESC, created_at DESC;
  `);

  return rows.map((row) => ({
    ...row,
    discountValue: Number(row.discountValue),
  }));
}

export async function createPromo(input: {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  appliesToType: "ALL" | "CATEGORY" | "PRODUCT";
  appliesToValue: string | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  isActive: boolean;
}) {
  await ensurePromoCodesTable();

  const id = `promo_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO promo_codes (
        id, code, discount_type, discount_value,
        applies_to_type, applies_to_value,
        starts_at, ends_at,
        usage_limit, is_active, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW());
    `,
    id,
    input.code.toUpperCase(),
    input.discountType,
    input.discountValue,
    input.appliesToType,
    input.appliesToValue,
    input.startsAt,
    input.endsAt,
    input.usageLimit,
    input.isActive
  );
}

export async function setPromoActive(id: string, isActive: boolean) {
  await ensurePromoCodesTable();

  await prisma.$executeRawUnsafe(
    `
      UPDATE promo_codes
      SET is_active = $2, updated_at = NOW()
      WHERE id = $1;
    `,
    id,
    isActive
  );
}

export async function getValidPromoByCode(code: string) {
  await ensurePromoCodesTable();

  const normalized = code.trim().toUpperCase();
  if (!normalized) {
    return null;
  }

  const rows = await prisma.$queryRawUnsafe<Array<{
    id: string;
    code: string;
    discountType: "PERCENT" | "FIXED";
    discountValue: string | number;
    appliesToType: "ALL" | "CATEGORY" | "PRODUCT";
    appliesToValue: string | null;
    startsAt: string | null;
    endsAt: string | null;
    usageLimit: number | null;
    usageCount: number;
    isActive: boolean;
  }>>(
    `
      SELECT
        id,
        code,
        discount_type as "discountType",
        discount_value as "discountValue",
        applies_to_type as "appliesToType",
        applies_to_value as "appliesToValue",
        CASE WHEN starts_at IS NULL THEN NULL ELSE to_char(starts_at, 'YYYY-MM-DD"T"HH24:MI:SS') END as "startsAt",
        CASE WHEN ends_at IS NULL THEN NULL ELSE to_char(ends_at, 'YYYY-MM-DD"T"HH24:MI:SS') END as "endsAt",
        usage_limit as "usageLimit",
        usage_count as "usageCount",
        is_active as "isActive"
      FROM promo_codes
      WHERE code = $1
      LIMIT 1;
    `,
    normalized
  );

  const row = rows[0];
  if (!row || !row.isActive) {
    return null;
  }

  const now = new Date();
  const startsAt = row.startsAt ? new Date(row.startsAt) : null;
  const endsAt = row.endsAt ? new Date(row.endsAt) : null;

  if (startsAt && now < startsAt) {
    return null;
  }

  if (endsAt && now > endsAt) {
    return null;
  }

  if (row.usageLimit !== null && row.usageCount >= row.usageLimit) {
    return null;
  }

  return {
    ...row,
    discountValue: Number(row.discountValue),
  };
}

export function calculatePromoDiscount(params: {
  promo: {
    discountType: "PERCENT" | "FIXED";
    discountValue: number;
    appliesToType: "ALL" | "CATEGORY" | "PRODUCT";
    appliesToValue: string | null;
  };
  items: Array<{ productId: string; category: string; lineTotal: number }>;
  subtotal: number;
}) {
  const { promo, items, subtotal } = params;

  let eligibleSubtotal = subtotal;

  if (promo.appliesToType === "CATEGORY" && promo.appliesToValue) {
    eligibleSubtotal = items
      .filter((item) => item.category === promo.appliesToValue)
      .reduce((sum, item) => sum + item.lineTotal, 0);
  }

  if (promo.appliesToType === "PRODUCT" && promo.appliesToValue) {
    eligibleSubtotal = items
      .filter((item) => item.productId === promo.appliesToValue)
      .reduce((sum, item) => sum + item.lineTotal, 0);
  }

  if (eligibleSubtotal <= 0) {
    return 0;
  }

  const rawDiscount =
    promo.discountType === "PERCENT"
      ? (eligibleSubtotal * promo.discountValue) / 100
      : promo.discountValue;

  return Math.max(0, Math.min(rawDiscount, eligibleSubtotal));
}

export async function consumePromo(id: string) {
  await ensurePromoCodesTable();

  await prisma.$executeRawUnsafe(
    `
      UPDATE promo_codes
      SET usage_count = usage_count + 1,
          updated_at = NOW()
      WHERE id = $1;
    `,
    id
  );
}
