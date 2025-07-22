import mongoose, { Schema, Document } from 'mongoose';
import { UsageEvent, UsageEventType } from '../interfaces/analytics.interface';

/**
 * Client info schema for MongoDB
 */
const ClientInfoSchema = new Schema({
  ip: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  },
  deviceId: {
    type: String,
    required: false
  }
}, { _id: false });

/**
 * Usage event schema for MongoDB
 */
const UsageEventSchema = new Schema<UsageEvent & Document>({
  licenseId: {
    type: String,
    required: true,
    index: true
  },
  schoolId: {
    type: String,
    required: true,
    index: true
  },
  eventType: {
    type: String,
    enum: Object.values(UsageEventType),
    required: true,
    index: true
  },
  featureName: {
    type: String,
    required: false,
    index: true
  },
  eventData: {
    type: Schema.Types.Mixed,
    default: {}
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  clientInfo: {
    type: ClientInfoSchema,
    required: false
  }
}, {
  timestamps: true,
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  }
});

// Compound indexes for performance
UsageEventSchema.index({ licenseId: 1, timestamp: 1 });
UsageEventSchema.index({ licenseId: 1, eventType: 1 });
UsageEventSchema.index({ licenseId: 1, featureName: 1 });
UsageEventSchema.index({ timestamp: 1, eventType: 1 });

// Create and export the UsageEvent model
export const UsageEventModel = mongoose.model<UsageEvent & Document>('UsageEvent', UsageEventSchema);

export default UsageEventModel;