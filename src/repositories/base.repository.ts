import mongoose, { Document, Model } from 'mongoose';
import { IRepository, FindOptions, PaginatedResult } from '../interfaces/repository.interface';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

const logger = new Logger('BaseRepository');

/**
 * Base repository implementation for MongoDB with optimized queries
 */
export class BaseRepository<T extends Document> implements IRepository<T> {
  protected model: Model<T>;

  constructor(model: Model<T>) {
    this.model = model;
  }

  /**
   * Create a new document
   * @param data Document data
   * @returns Created document
   */
  async create(data: Partial<T>): Promise<T> {
    try {
      const document = new this.model(data);
      return await document.save() as T;
    } catch (error) {
      logger.error('Error creating document:', {error});
      throw new AppError(`Failed to create document: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find document by ID
   * @param id Document ID
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns Document or null if not found
   */
  async findById(id: string, lean = false): Promise<T | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid ID format', 400);
      }
      
      const query = this.model.findById(id);
      
      if (lean) {
        query.lean();
      }
      
      return await query.exec() as T | null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('Error finding document by ID:', {error});
      throw new AppError(`Failed to find document: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find one document by filter
   * @param filter Filter criteria
   * @param lean Whether to return a plain object instead of a Mongoose document
   * @returns Document or null if not found
   */
  async findOne(filter: Partial<T>, lean = false): Promise<T | null> {
    try {
      const query = this.model.findOne(filter as any);
      
      if (lean) {
        query.lean();
      }
      
      return await query.exec() as T | null;
    } catch (error) {
      logger.error('Error finding document:', {error});
      throw new AppError(`Failed to find document: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find all documents matching filter with optimized query
   * @param filter Filter criteria
   * @param options Find options (limit, skip, sort)
   * @param lean Whether to return plain objects instead of Mongoose documents
   * @returns Array of documents
   */
  async findAll(filter: Partial<T> = {}, options: FindOptions = {}, lean = false): Promise<T[]> {
    try {
      let query = this.model.find(filter as any);
      
      // Apply options
      if (options.limit) {
        query = query.limit(options.limit);
      }
      
      if (options.skip) {
        query = query.skip(options.skip);
      }
      
      if (options.sort) {
        query = query.sort(options.sort);
      }
      
      if (options.select && options.select.length > 0) {
        query = query.select(options.select.join(' '));
      }
      
      if (options.populate && options.populate.length > 0) {
        for (const field of options.populate) {
          query = (query as any).populate(field);
        }
      }
      // Use lean query for better performance when appropriate
      if (lean) {
        query = query.lean();
      }
      
      return await (query as any).exec() as T[];
    } catch (error) {
      logger.error('Error finding documents:', {error});
      throw new AppError(`Failed to find documents: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Find documents with pagination
   * @param filter Filter criteria
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @param sort Sort criteria
   * @param lean Whether to return plain objects instead of Mongoose documents
   * @returns Paginated result with documents and metadata
   */
  async findWithPagination(
    filter: Partial<T> = {}, 
    page = 1, 
    limit = 10, 
    sort: Record<string, 1 | -1> = { createdAt: -1 },
    lean = false
  ): Promise<PaginatedResult<T>> {
    try {
      const skip = (page - 1) * limit;
      const options: FindOptions = { limit, skip, sort };
      
      // Execute count and find in parallel for better performance
      const [items, total] = await Promise.all([
        this.findAll(filter, options, lean),
        this.count(filter)
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
      logger.error('Error finding documents with pagination:', {error});
      throw new AppError(`Failed to find documents: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Update document by ID
   * @param id Document ID
   * @param data Update data
   * @returns Updated document or null if not found
   */
  async update(id: string, data: Partial<T>): Promise<T | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid ID format', 400);
      }
      
      return await this.model.findByIdAndUpdate(
        id,
        { $set: data as any },
        { new: true, runValidators: true }
      ) as T | null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('Error updating document:', {error});
      throw new AppError(`Failed to update document: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Delete document by ID
   * @param id Document ID
   * @returns True if deleted, false if not found
   */
  async delete(id: string): Promise<boolean> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new AppError('Invalid ID format', 400);
      }
      
      const result = await this.model.findByIdAndDelete(id);
      return result !== null;
    } catch (error) {
      if (error instanceof AppError) throw error;
      
      logger.error('Error deleting document:', {error});
      throw new AppError(`Failed to delete document: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Count documents matching filter
   * @param filter Filter criteria
   * @returns Count of matching documents
   */
  async count(filter: Partial<T> = {}): Promise<number> {
    try {
      return await this.model.countDocuments(filter as any);
    } catch (error) {
      logger.error('Error counting documents:', {error});
      throw new AppError(`Failed to count documents: ${(error as Error).message}`, 500);
    }
  }
}