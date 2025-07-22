import { AuditLog, IAuditLog, AuditActionType } from '../models/audit-log.model';
import { IRepository, FindOptions } from '../interfaces/repository.interface';
import { Logger } from '../utils/logger';
const logger = new Logger('AuditLogRepository');

/**
 * Audit log repository implementation
 */
class AuditLogRepository implements IRepository<IAuditLog> {
  /**
   * Create a new audit log entry
   * @param data Audit log data
   * @returns Created audit log
   */
  async create(data: Partial<IAuditLog>): Promise<IAuditLog> {
    try {
      const auditLog = new AuditLog(data);
      await auditLog.save();
      return auditLog;
    } catch (error) {
      logger.error('Error creating audit log:', {error});
      throw error;
    }
  }

  /**
   * Find audit log by ID
   * @param id Audit log ID
   * @returns Audit log or null if not found
   */
  async findById(id: string): Promise<IAuditLog | null> {
    try {
      return AuditLog.findById(id);
    } catch (error) {
      logger.error('Error finding audit log by ID:', {error});
      throw error;
    }
  }

  /**
   * Find a single audit log by filter
   * @param filter Filter criteria
   * @returns Audit log or null if not found
   */
  async findOne(filter: Partial<IAuditLog>): Promise<IAuditLog | null> {
    try {
      return AuditLog.findOne(filter as any);
    } catch (error) {
      logger.error('Error finding audit log:', {error});
      throw error;
    }
  }

  /**
   * Find all audit logs matching filter
   * @param filter Filter criteria
   * @param options Find options
   * @returns Array of audit logs
   */
  async findAll(filter?: Partial<IAuditLog>, options?: FindOptions): Promise<IAuditLog[]> {
    try {
      let query = AuditLog.find(filter as any);

      if (options) {
        if (options.sort) {
          query = query.sort(options.sort);
        }
        if (options.skip) {
          query = query.skip(options.skip);
        }
        if (options.limit) {
          query = query.limit(options.limit);
        }
        if (options.select) {
          query = query.select(options.select.join(' '));
        }
      }

      return query.exec();
    } catch (error) {
      logger.error('Error finding audit logs:', {error});
      throw error;
    }
  }

  /**
   * Update an audit log
   * @param id Audit log ID
   * @param data Update data
   * @returns Updated audit log or null if not found
   */
  async update(id: string, data: Partial<IAuditLog>): Promise<IAuditLog | null> {
    try {
      return AuditLog.findByIdAndUpdate(id, data, { new: true });
    } catch (error) {
      logger.error('Error updating audit log:', {error});
      throw error;
    }
  }

  /**
   * Delete an audit log
   * @param id Audit log ID
   * @returns True if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    try {
      const result = await AuditLog.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      logger.error('Error deleting audit log:', {error});
      throw error;
    }
  }

  /**
   * Count audit logs matching filter
   * @param filter Filter criteria
   * @returns Count of matching audit logs
   */
  async count(filter?: Partial<IAuditLog>): Promise<number> {
    try {
      return AuditLog.countDocuments(filter as any);
    } catch (error) {
      logger.error('Error counting audit logs:', {error});
      throw error;
    }
  }

  /**
   * Find audit logs by entity ID
   * @param entityId Entity ID
   * @param options Find options
   * @returns Array of audit logs
   */
  async findByEntityId(entityId: string, options?: FindOptions): Promise<IAuditLog[]> {
    try {
      return this.findAll({ entityId }, options);
    } catch (error) {
      logger.error('Error finding audit logs by entity ID:', {error});
      throw error;
    }
  }

  /**
   * Find audit logs by entity ID and action type
   * @param entityId Entity ID
   * @param actionType Action type
   * @param options Find options
   * @returns Array of audit logs
   */
  async findByEntityIdAndAction(
    entityId: string,
    actionType: AuditActionType,
    options?: FindOptions
  ): Promise<IAuditLog[]> {
    try {
      return this.findAll({ entityId, actionType }, options);
    } catch (error) {
      logger.error('Error finding audit logs by entity ID and action:', {error});
      throw error;
    }
  }
}

// Export singleton instance
export const auditLogRepository = new AuditLogRepository();

export default auditLogRepository;