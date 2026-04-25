import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  /**
   * Log an action in the immutable Bitácora Forense.
   * @param userId The ID of the authenticated user who performed the action.
   * @param companyId The ID of the company context.
   * @param action The type of action: 'CREATE', 'UPDATE', 'DELETE', 'APPLY', 'CANCEL'.
   * @param entity The entity name: 'Journal', 'Bill', 'Employee', etc.
   * @param details A JSON object or string detailing the changes (e.g., '{ "old": ..., "new": ... }').
   */
  async logAction(
    userId: string,
    companyId: string,
    action: string,
    entity: string,
    details: string,
    entityId?: string
  ) {
    try {
      await (this.prisma as any).auditLog.create({
        data: {
          userId,
          companyId,
          action,
          entity,
          entityId,
          details,
        }
      });
      console.log(`[AUDIT] ${action} on ${entity} by ${userId} in ${companyId}`);
    } catch (error) {
      console.error('[AUDIT ERROR]', error);
    }
  }

  /**
   * Shortcut for logging Journal actions as they are the most critical for audit.
   */
  async logJournalAction(userId: string, companyId: string, action: string, journalId: string, details: string) {
      return this.logAction(userId, companyId, action, 'Journal', details, journalId);
  }
}
