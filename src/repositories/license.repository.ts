import { Document } from 'mongoose';
import { BaseRepository } from './base.repository';
import { LicenseModel } from '../models/license.model';
import { License, LicenseStatus } from '../interfaces/license.interface';
import { ILicenseRepository, FindOptions, PaginatedResult } from '../interfaces/repository.interface';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

const logger = new Logger('LicenseRepository');

/**
 * License repository implementation with optimized queries
 */
export class LicenseRepository extends BaseRepository<License & Document> implements ILicenseRepository<License & Document> {
  constructor() {
    super(LicenseModel);
  }

  /**
   * Find license by school ID with optimized query
   * @param schoolId School ID
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns License or null if not found
   */
  async findBySchoolId(schoolId: string, lean = false): Promise<License & Document | null> {
    try {
      // Using the compound index on schoolId and status
      const query = this.model.findOne({ schoolId });
      
      if (lean) {
        query.lean();
      }
      
      return await query.exec();
    } catch (error) {
      logger.error('Error finding license by school ID:', {error});
      throw new AppError(`Failed to find license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find active license by school ID with optimized query
   * @param schoolId School ID
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns Active license or null if not found
   */
  async findActiveBySchoolId(schoolId: string, lean = false): Promise<License & Document | null> {
    try {
      // Using the compound index on schoolId and status
      const query = this.model.findOne({
        schoolId,
        status: LicenseStatus.ACTIVE,
        expiresAt: { $gt: new Date() }
      });
      
      if (lean) {
        query.lean();
      }
      
      return await query.exec();
    } catch (error) {
      logger.error('Error finding active license by school ID:', {error});
      throw new AppError(`Failed to find active license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find expired licenses with optimized query
   * @param options Find options
   * @param lean Whether to return plain objects instead of Mongoose documents
   * @returns Array of expired licenses
   */
  async findExpired(options: FindOptions = {}, lean = false): Promise<Array<License & Document>> {
    try {
      // Using the compound index on expiresAt and status
      const query = {
        $or: [
          { status: LicenseStatus.EXPIRED },
          {
            status: LicenseStatus.ACTIVE,
            expiresAt: { $lt: new Date() }
          }
        ]
      };
      
      return await this.findAll(query as any, options, lean);
    } catch (error) {
      logger.error('Error finding expired licenses:', {error});
      throw new AppError(`Failed to find expired licenses: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find licenses expiring soon with optimized query
   * @param daysThreshold Number of days threshold
   * @param options Find options
   * @param lean Whether to return plain objects instead of Mongoose documents
   * @returns Array of licenses expiring soon
   */
  async findExpiring(daysThreshold: number, options: FindOptions = {}, lean = false): Promise<Array<License & Document>> {
    try {
      const now = new Date();
      const thresholdDate = new Date();
      thresholdDate.setDate(now.getDate() + daysThreshold);
      
      // Using the compound index on expiresAt and status
      const query = {
        status: LicenseStatus.ACTIVE,
        expiresAt: {
          $gt: now,
          $lte: thresholdDate
        }
      };
      
      return await this.findAll(query as any, options, lean);
    } catch (error) {
      logger.error('Error finding expiring licenses:', {error});
      throw new AppError(`Failed to find expiring licenses: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Update license status with optimized query
   * @param id License ID
   * @param status New status
   * @returns Updated license or null if not found
   */
  async updateStatus(id: string, status: string): Promise<License & Document | null> {
    try {
      return await this.update(id, { status: status as any });
    } catch (error) {
      logger.error('Error updating license status:', {error});
      throw new AppError(`Failed to update license status: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find license by license key with optimized query
   * @param licenseKey License key
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns License or null if not found
   */
  async findByLicenseKey(licenseKey: string, lean = false): Promise<License & Document | null> {
    try {
      const query = this.model.findOne({ licenseKey });
      
      if (lean) {
        query.lean();
      }
      
      return await query.exec();
    } catch (error) {
      logger.error('Error finding license by key:', {error});
      throw new AppError(`Failed to find license by key: ${(error as Error).message}`, 500);
    }
  }
  
  /**
   * Find licenses with pagination
   * @param filter Filter criteria
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @param sort Sort criteria
   * @param lean Whether to return plain objects instead of Mongoose documents
   * @returns Paginated result with licenses and metadata
   */
  async findWithPagination(
    filter: Partial<License> = {}, 
    page = 1, 
    limit = 10, 
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    lean = false
  ): Promise<PaginatedResult<License & Document>> {
    try {
      const skip = (page - 1) * limit;
      const options: FindOptions = { limit, skip, sort };
      
      const [items, total] = await Promise.all([
        this.findAll(filter as any, options, lean),
        this.count(filter as any)
      ]);
      
      return {
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1
      };
    } catch (error) {
      logger.error('Error finding licenses with pagination:', {error} );
      throw new AppError(`Failed to find licenses: ${(error as Error).message}`, 500);
    }
  }
}

// Export singleton instance
export const licenseRepository = new LicenseRepository();

export default licenseRepository;