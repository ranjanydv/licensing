import { auditLogRepository } from '../repositories/audit-log.repository';
import { AuditActionType } from '../models/audit-log.model';
import { Logger } from '../utils/logger';
const logger = new Logger('AuditService');

/**
 * Audit service interface
 */
export interface IAuditService {
  logAction(
    entityId: string,
    entityType: string,
    actionType: AuditActionType,
    performedBy: string,
    previousState?: Record<string, any>,
    newState?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void>;
  
  getAuditTrail(entityId: string, entityType: string): Promise<any[]>;
}

/**
 * Audit service implementation
 */
class AuditService implements IAuditService {
  /**
   * Log an action
   * @param entityId Entity ID
   * @param entityType Entity type
   * @param actionType Action type
   * @param performedBy User who performed the action
   * @param previousState Previous state of the entity
   * @param newState New state of the entity
   * @param metadata Additional metadata
   */
  async logAction(
    entityId: string,
    entityType: string,
    actionType: AuditActionType,
    performedBy: string,
    previousState?: Record<string, any>,
    newState?: Record<string, any>,
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await auditLogRepository.create({
        entityId,
        entityType,
        actionType,
        performedBy,
        timestamp: new Date(),
        previousState,
        newState,
        metadata
      });
      
      logger.info('Audit log created', {
        entityId,
        entityType,
        actionType,
        performedBy
      });
    } catch (error) {
      // Log error but don't throw to prevent disrupting main operations
      logger.error('Error creating audit log:', { error });
    }
  }
  
  /**
   * Get audit trail for an entity
   * @param entityId Entity ID
   * @param entityType Entity type
   * @returns Array of audit logs
   */
  async getAuditTrail(entityId: string, entityType: string): Promise<any[]> {
    try {
      const auditLogs = await auditLogRepository.findAll(
        { entityId, entityType },
        { sort: { timestamp: -1 } }
      );
      
      return auditLogs.map(log => ({
        id: log._id,
        actionType: log.actionType,
        performedBy: log.performedBy,
        timestamp: log.timestamp,
        previousState: log.previousState,
        newState: log.newState,
        metadata: log.metadata
      }));
    } catch (error) {
      logger.error('Error getting audit trail:', { error });
      throw error;
    }
  }
}

// Export singleton instance
export const auditService = new AuditService();

export default auditService;