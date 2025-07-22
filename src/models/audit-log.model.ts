import mongoose, { Schema, Document } from 'mongoose';

/**
 * Audit log action types
 */
export enum AuditActionType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  REVOKE = 'revoke',
  RENEW = 'renew',
  TRANSFER = 'transfer',
  BLACKLIST = 'blacklist',
  UNBLACKLIST = 'unblacklist',
  SECURITY_UPDATE = 'security_update'
}

/**
 * Audit log document interface
 */
export interface IAuditLog extends Document {
  entityId: string;
  entityType: string;
  actionType: AuditActionType;
  performedBy: string;
  timestamp: Date;
  previousState?: Record<string, any>;
  newState?: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Audit log schema
 */
const AuditLogSchema: Schema = new Schema({
  entityId: {
    type: String,
    required: true,
    index: true
  },
  entityType: {
    type: String,
    required: true,
    index: true
  },
  actionType: {
    type: String,
    required: true,
    enum: Object.values(AuditActionType),
    index: true
  },
  performedBy: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  previousState: {
    type: Schema.Types.Mixed
  },
  newState: {
    type: Schema.Types.Mixed
  },
  metadata: {
    type: Schema.Types.Mixed
  }
});

// Create indexes for common queries
AuditLogSchema.index({ entityId: 1, actionType: 1 });
AuditLogSchema.index({ entityId: 1, timestamp: -1 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;