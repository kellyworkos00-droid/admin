import { prisma } from "@/lib/prisma";

let ensureCustomerProfilesInitPromise: Promise<void> | null = null;

export type CustomerProfile = {
  customerKey: string;
  displayName: string | null;
  phone: string | null;
  email: string | null;
  isVip: boolean;
};

export async function ensureCustomerProfilesTable() {
  if (!ensureCustomerProfilesInitPromise) {
    ensureCustomerProfilesInitPromise = prisma.$executeRawUnsafe(`
      DO $$
      BEGIN
        CREATE TABLE customer_profiles (
          customer_key TEXT PRIMARY KEY,
          display_name TEXT NULL,
          phone TEXT NULL,
          email TEXT NULL,
          is_vip BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      EXCEPTION
        WHEN duplicate_table OR duplicate_object THEN
          NULL;
      END
      $$;
    `).then(() => undefined);
  }

  await ensureCustomerProfilesInitPromise;
}

export async function getCustomerProfiles(keys: string[]): Promise<CustomerProfile[]> {
  await ensureCustomerProfilesTable();
  if (keys.length === 0) {
    return [];
  }

  const params = keys.map((_, index) => `$${index + 1}`).join(",");
  return prisma.$queryRawUnsafe<CustomerProfile[]>(
    `
      SELECT
        customer_key as "customerKey",
        display_name as "displayName",
        phone,
        email,
        is_vip as "isVip"
      FROM customer_profiles
      WHERE customer_key IN (${params});
    `,
    ...keys
  );
}

export async function setCustomerVip(
  customerKey: string,
  value: boolean,
  details: { displayName?: string; phone?: string; email?: string } = {}
) {
  await ensureCustomerProfilesTable();

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO customer_profiles (customer_key, display_name, phone, email, is_vip, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      ON CONFLICT (customer_key)
      DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, customer_profiles.display_name),
        phone = COALESCE(EXCLUDED.phone, customer_profiles.phone),
        email = COALESCE(EXCLUDED.email, customer_profiles.email),
        is_vip = EXCLUDED.is_vip,
        updated_at = NOW();
    `,
    customerKey,
    details.displayName ?? null,
    details.phone ?? null,
    details.email ?? null,
    value
  );
}
