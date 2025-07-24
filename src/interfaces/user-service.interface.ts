import { IUser } from './auth.interface';
import { CreateUserDTO, UpdateUserDTO } from './auth.interface';

/**
 * User service interface
 */
export interface IUserService {
  /**
   * Get all users with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated result with users and metadata
   */
  getAllUsers(page?: number, limit?: number): Promise<{
    users: IUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  
  /**
   * Get user by ID
   * @param id User ID
   * @returns User or null if not found
   */
  getUserById(id: string): Promise<IUser | null>;
  
  /**
   * Get user by email
   * @param email User email
   * @returns User or null if not found
   */
  getUserByEmail(email: string): Promise<IUser | null>;
  
  /**
   * Create a new user
   * @param userData User data
   * @param createdBy ID of user who created this user
   * @returns Created user
   */
  createUser(userData: CreateUserDTO, createdBy: string): Promise<IUser>;
  
  /**
   * Update a user
   * @param id User ID
   * @param userData User data to update
   * @param updatedBy ID of user who updated this user
   * @returns Updated user or null if not found
   */
  updateUser(id: string, userData: UpdateUserDTO, updatedBy: string): Promise<IUser | null>;
  
  /**
   * Delete a user
   * @param id User ID
   * @returns True if deleted, false if not found
   */
  deleteUser(id: string): Promise<boolean>;
  
  /**
   * Assign role to user
   * @param userId User ID
   * @param roleId Role ID
   * @param updatedBy ID of user who assigned the role
   * @returns Updated user or null if not found
   */
  assignRole(userId: string, roleId: string, updatedBy: string): Promise<IUser | null>;
  
  /**
   * Get users by role
   * @param roleId Role ID
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated result with users and metadata
   */
  getUsersByRole(roleId: string, page?: number, limit?: number): Promise<{
    users: IUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }>;
  
  /**
   * Activate a user
   * @param id User ID
   * @param updatedBy ID of user who activated this user
   * @returns Updated user or null if not found
   */
  activateUser(id: string, updatedBy: string): Promise<IUser | null>;
  
  /**
   * Deactivate a user
   * @param id User ID
   * @param updatedBy ID of user who deactivated this user
   * @returns Updated user or null if not found
   */
  deactivateUser(id: string, updatedBy: string): Promise<IUser | null>;
}