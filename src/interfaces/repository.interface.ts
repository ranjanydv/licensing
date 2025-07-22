/**
 * Generic repository interface for CRUD operations
 */
export interface IRepository<T> {
  create(data: Partial<T>): Promise<T>;
  findById(id: string): Promise<T | null>;
  findOne(filter: Partial<T>): Promise<T | null>;
  findAll(filter?: Partial<T>, options?: FindOptions, lean?: boolean): Promise<T[]>;
  update(id: string, data: Partial<T>): Promise<T | null>;
  delete(id: string): Promise<boolean>;
  count(filter?: Partial<T>): Promise<number>;
}

/**
 * Options for find operations
 */
export interface FindOptions {
  limit?: number;
  skip?: number;
  sort?: Record<string, 1 | -1>;
  select?: string[];
  populate?: string[];
}

/**
 * Paginated result interface
 */
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

/**
 * License repository specific interface
 */
export interface ILicenseRepository<T> extends IRepository<T> {
  findBySchoolId(schoolId: string, lean?: boolean): Promise<T | null>;
  findActiveBySchoolId(schoolId: string, lean?: boolean): Promise<T | null>;
  findExpired(options?: FindOptions, lean?: boolean): Promise<T[]>;
  findExpiring(daysThreshold: number, options?: FindOptions, lean?: boolean): Promise<T[]>;
  updateStatus(id: string, status: string): Promise<T | null>;
  findByLicenseKey(licenseKey: string, lean?: boolean): Promise<T | null>;
  findWithPagination(filter?: Partial<T>, page?: number, limit?: number, sort?: Record<string, 1 | -1>, lean?: boolean): Promise<PaginatedResult<T>>;
}