import { prisma } from "@/lib/prisma";

export type AuditAction =
  | "ORDER_STATUS_UPDATED"
  | "PRODUCT_CREATED"
  | "PRODUCT_UPDATED"
  | "PRODUCT_DEACTIVATED"
  | "PRODUCTS_IMPORTED"
  | "SLIDER_CONFIG_SAVED"
  | "CONTENT_SAVED"
  | "PROMO_CREATED"
  | "PROMO_TOGGLED"
  | "CUSTOMER_VIP_TOGGLED"
  | "USER_ROLE_UPDATED";

export type AuditActorRole = "ADMIN" | "STAFF" | "SYSTEM";

export type AuditEvent = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  actor: string;
  actorRole: string;
  channel: string;
  metadata: string;
  createdAt: string;
};

export async function ensureAuditLogsTable() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS admin_audit_logs (
      id TEXT PRIMARY KEY,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT NULL,
      actor TEXT NOT NULL,
      actor_role TEXT NOT NULL,
      channel TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at
    ON admin_audit_logs (created_at DESC);
  `);
}

export async function logAuditEvent(input: {
  action: AuditAction;
  entityType: string;
  entityId?: string | null;
  actor: string;
  actorRole: AuditActorRole;
  channel: "admin_ui" | "admin_api";
  metadata?: Record<string, unknown>;
}) {
  await ensureAuditLogsTable();

  const id = `audit_${Date.now()}_${Math.floor(Math.random() * 100000)}`;

  await prisma.$executeRawUnsafe(
    `
      INSERT INTO admin_audit_logs (
        id, action, entity_type, entity_id, actor, actor_role, channel, metadata, created_at
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,NOW());
    `,
    id,
    input.action,
    input.entityType,
    input.entityId ?? null,
    input.actor,
    input.actorRole,
    input.channel,
    JSON.stringify(input.metadata ?? {})
  );
}

export async function listAuditEvents(params?: {
  limit?: number;
  action?: string;
  entityType?: string;
}): Promise<AuditEvent[]> {
  await ensureAuditLogsTable();

  const limit = Math.min(200, Math.max(1, params?.limit ?? 60));
  const action = params?.action?.trim();
  const entityType = params?.entityType?.trim();

  const rows = await prisma.$queryRawUnsafe<AuditEvent[]>(
    `
      SELECT
        id,
        action,
        entity_type as "entityType",
        entity_id as "entityId",
        actor,
        actor_role as "actorRole",
        channel,
        metadata::text as metadata,
        to_char(created_at, 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') as "createdAt"
      FROM admin_audit_logs
      WHERE ($1::text IS NULL OR action = $1)
      AND ($2::text IS NULL OR entity_type = $2)
      ORDER BY created_at DESC
      LIMIT $3;
    `,
    action || null,
    entityType || null,
    limit
  );

  return rows;
}
