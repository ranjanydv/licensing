import mongoose, { Schema, Document } from 'mongoose';
import { IRole } from '../interfaces/auth.interface';

export interface RoleDocument extends Omit<IRole, 'id'>, Document {
  // Add any methods here if needed
} 

const RoleSchema: Schema = new Schema({
  name: {
    type: String,
    required: [true, 'Role name is required'],
    unique: true,
    enum: {
      values: ['admin', 'support'],
      message: 'Role name must be either admin or support'
    },
    trim: true
  },
  permissions: {
    type: [String],
    required: [true, 'Permissions are required'],
    validate: {
      validator: function(permissions: string[]) {
        return permissions.length > 0;
      },
      message: 'At least one permission must be specified'
    }
  }
}, {
  timestamps: true
});

// Transform the output if needed
RoleSchema.set('toJSON', {
  transform: (_doc: any, ret: any) => {
    return ret;
  }
});

export const RoleModel = mongoose.model<RoleDocument>('Role', RoleSchema);