/**
 * Audit log helper. Use for every create/update/delete on sensitive entities.
 */
import { db } from '../config/database';
import { auditLogs, type AuditAction } from '../../drizzle/schema/auditLogs';
import { hashIp } from './ipAnonymize';
import { logger } from '../config/logger';

export interface AuditLogParams {
  userId: string | null;
  entityType: string;
  entityId: string | null;
  action: AuditAction;
  diff?: Record<string, unknown> | null;
  ip?: string | null;
  userAgent?: string | null;
}

export async function recordAudit(params: AuditLogParams): Promise<void> {
  try {
    await db.insert(auditLogs).values({
      userId: params.userId,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      diff: params.diff ?? null,
      ipHash: params.ip ? hashIp(params.ip) : null,
      userAgent: params.userAgent ?? null,
    });
  } catch (err) {
    // Audit log failure should never break the main flow
    logger.error({ err, params }, 'Failed to write audit log');
  }
}
