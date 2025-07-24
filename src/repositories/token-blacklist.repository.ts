import { Document } from 'mongoose';
import { BaseRepository } from './base.repository';
import { TokenBlacklistModel } from '../models/token-blacklist.model';
import { TokenBlacklistDocument } from '../models/token-blacklist.model';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

const logger = new Logger('TokenBlacklistRepository');

/**
 * TokenBlacklist repository implementation with optimized queries
 */
export class TokenBlacklistRepository extends BaseRepository<TokenBlacklistDocument> {
  constructor() {
    super(TokenBlacklistModel);
  }

  /**
   * Check if a token is blacklisted
   * @param token JWT token
   * @returns True if token is blacklisted, false otherwise
   */
  async isBlacklisted(token: string): Promise<boolean> {
    try {
      const blacklistedToken = await this.findOne({ token } as any);
      return blacklistedToken !== null;
    } catch (error) {
      logger.error('Error checking if token is blacklisted:', {error});
      throw new AppError(`Failed to check if token is blacklisted: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Add token to blacklist
   * @param token JWT token
   * @param expiresAt Token expiration date
   * @returns Created blacklist entry
   */
  async addToBlacklist(token: string, expiresAt: Date): Promise<TokenBlacklistDocument> {
    try {
      return await this.create({ token, expiresAt } as any);
    } catch (error) {
      logger.error('Error adding token to blacklist:', {error});
      throw new AppError(`Failed to add token to blacklist: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Clean expired tokens from blacklist (for manual cleanup if needed)
   * Note: MongoDB TTL index should handle this automatically
   * @returns Number of deleted tokens
   */
  async cleanExpiredTokens(): Promise<number> {
    try {
      const now = new Date();
      const result = await TokenBlacklistModel.deleteMany({
        expiresAt: { $lt: now }
      });
      return result.deletedCount;
    } catch (error) {
      logger.error('Error cleaning expired tokens:', {error});
      throw new AppError(`Failed to clean expired tokens: ${(error as Error).message}`, 500);
    }
  }
}

// Export singleton instance
export const tokenBlacklistRepository = new TokenBlacklistRepository();

export default tokenBlacklistRepository;