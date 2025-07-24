import mongoose, { Schema, Document } from 'mongoose';
import { ITokenBlacklist } from '../interfaces/auth.interface';

export interface TokenBlacklistDocument extends ITokenBlacklist, Document {
  // Add any methods here if needed
}

const TokenBlacklistSchema: Schema = new Schema({
  token: {
    type: String,
    required: [true, 'Token is required'],
    unique: true,
    index: true
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration date is required'],
    index: { expires: 0 } // TTL index: automatically remove documents when expiresAt is reached
  }
}, {
  timestamps: true
});

// Ensure indexes are created
TokenBlacklistSchema.index({ token: 1 }, { unique: true });

export const TokenBlacklistModel = mongoose.model<TokenBlacklistDocument>('TokenBlacklist', TokenBlacklistSchema);