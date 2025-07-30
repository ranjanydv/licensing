import { Document } from 'mongoose';
import { BaseRepository } from './base.repository';
import { LicenseModel } from '../models/license.model';
import { License, LicenseStatus, ActivationStatus } from '../interfaces/license.interface';
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
  findActiveBySchoolId(schoolId: string, lean?: boolean): Promise<(License & Document<any, any, any>) | null> {
    throw new Error('Method not implemented.');
  }

  /**
   * Find license by school ID with optimized query
   * @param schoolId School ID
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns License or null if not found
   */
  async findBySchoolId(schoolId: string, lean = false): Promise<License & Document | null> {
    try {
      // Using the compound index on schoolId and activationStatus
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
   * Find activated license by school ID with optimized query
   * @param schoolId School ID
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns Activated license or null if not found
   */
  async findActivatedBySchoolId(schoolId: string, lean = false): Promise<License & Document | null> {
    try {
      // Using the compound index on schoolId and activationStatus
      const query = this.model.findOne({
        schoolId,
        activationStatus: ActivationStatus.ACTIVATED,
        expiresAt: { $gt: new Date() }
      });
      
      if (lean) {
        query.lean();
      }
      
      return await query.exec();
    } catch (error) {
      logger.error('Error finding activated license by school ID:', {error});
      throw new AppError(`Failed to find activated license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find license by license hex with optimized query
   * @param licenseHex License hex
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns License or null if not found
   */
  async findByLicenseHex(licenseHex: string, lean = false): Promise<License & Document | null> {
    try {
      const query = this.model.findOne({ licenseHex });
      
      if (lean) {
        query.lean();
      }
      
      return await query.exec();
    } catch (error) {
      logger.error('Error finding license by hex:', {error});
      throw new AppError(`Failed to find license by hex: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find licenses by activation status
   * @param activationStatus Activation status to filter by
   * @param options Find options
   * @param lean Whether to return plain objects instead of Mongoose documents
   * @returns Array of licenses with specified activation status
   */
  async findByActivationStatus(
    activationStatus: ActivationStatus, 
    options: FindOptions = {}, 
    lean = false
  ): Promise<Array<License & Document>> {
    try {
      const query = { activationStatus };
      return await this.findAll(query as any, options, lean);
    } catch (error) {
      logger.error('Error finding licenses by activation status:', {error});
      throw new AppError(`Failed to find licenses by activation status: ${(error as Error).message}`, 500);
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
      // Using the compound index on expiresAt and activationStatus
      const query = {
        $or: [
          { activationStatus: ActivationStatus.EXPIRED },
          {
            activationStatus: ActivationStatus.ACTIVATED,
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
      
      // Using the compound index on expiresAt and activationStatus
      const query = {
        activationStatus: ActivationStatus.ACTIVATED,
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
   * Update license activation status with optimized query
   * @param id License ID
   * @param activationStatus New activation status
   * @returns Updated license or null if not found
   */
  async updateActivationStatus(id: string, activationStatus: ActivationStatus): Promise<License & Document | null> {
    try {
      return await this.update(id, { activationStatus });
    } catch (error) {
      logger.error('Error updating license activation status:', {error});
      throw new AppError(`Failed to update license activation status: ${(error as Error).message}`, 500);
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
   * Update last verification timestamp for multiple licenses
   * @param licenseIds Array of license IDs
   * @returns Number of updated licenses
   */
  async updateLastVerificationForAll(licenseIds: string[]): Promise<number> {
    try {
      const result = await this.model.updateMany(
        { _id: { $in: licenseIds } },
        { lastVerificationAt: new Date() }
      );
      
      return result.modifiedCount;
    } catch (error) {
      logger.error('Error updating last verification for licenses:', {error});
      throw new AppError(`Failed to update last verification: ${(error as Error).message}`, 500);
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