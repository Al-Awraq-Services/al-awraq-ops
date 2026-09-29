import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * The single write path for audit log entries, per docs/SECURITY_BASELINE.md
 * ("audit logging for sensitive admin and data-changing actions"). No other
 * file may call `db.auditLog.create` directly — every sensitive action goes
 * through this function so the shape of what gets logged stays consistent
 * and reviewable in one place.
 *
 * `tx` lets a caller pass a Prisma transaction client so the audit entry
 * commits atomically with the mutation it records — per Phase 4: "the audit
 * write is not optional or best-effort." Callers that can't reasonably
 * transact (e.g. a login event, which mutates no business row) omit it.
 */

export type AuditAction =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILURE"
  | "LOGIN_LOCKOUT"
  | "LOGOUT"
  | "USER_CREATED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "USER_ROLE_CHANGED"
  | "RESET_TOKEN_ISSUED"
  | "RESET_TOKEN_CONSUMED"
  | "CUSTOMER_CREATED"
  | "CUSTOMER_UPDATED"
  | "CUSTOMER_ARCHIVED"
  | "LEAD_CREATED"
  | "LEAD_UPDATED"
  | "LEAD_STATUS_CHANGED"
  | "SERVICE_CREATED"
  | "SERVICE_UPDATED"
  | "SERVICE_DEACTIVATED"
  | "QUOTE_CREATED"
  | "QUOTE_UPDATED"
  | "QUOTE_STATUS_CHANGED"
  | "QUOTE_ITEM_ADDED"
  | "QUOTE_ITEM_UPDATED"
  | "QUOTE_ITEM_REMOVED"
  | "INVOICE_CREATED"
  | "INVOICE_PAID";

type WriteAuditLogInput = {
  actorUserId: string | null;
  action: AuditAction;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
};

export async function writeAuditLog(
  input: WriteAuditLogInput,
  tx: Prisma.TransactionClient | typeof db = db,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId ?? null,
      metadata: input.metadata as Prisma.InputJsonValue | undefined,
    },
  });
}
