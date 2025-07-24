import { IUser } from '../interfaces/auth.interface';
import { CreateUserDTO, UpdateUserDTO } from '../interfaces/auth.interface';
import { IUserService } from '../interfaces/user-service.interface';
import { userRepository } from '../repositories/user.repository';
import { roleRepository } from '../repositories/role.repository';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';
import { authService } from './auth.service';
import { hashPassword, verifyPassword } from '../utils/hash';

const logger = new Logger('UserService');

/**
 * User service implementation
 */
export class UserService implements IUserService {
  /**
   * Get all users with pagination
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated result with users and metadata
   */
  async getAllUsers(page = 1, limit = 10): Promise<{
    users: IUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      logger.info('Getting all users', { page, limit });
      
      const skip = (page - 1) * limit;
      const options = { skip, limit, sort: { createdAt: -1 as -1 } };
      
      // Execute count and find in parallel for better performance
      const [users, total] = await Promise.all([
        userRepository.findAll({} as any, options, true),
        userRepository.count()
      ]);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        users: users as unknown as IUser[],
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      logger.error('Error getting all users:', { error });
      throw new AppError(`Failed to get users: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get user by ID
   * @param id User ID
   * @returns User or null if not found
   */
  async getUserById(id: string): Promise<IUser | null> {
    try {
      logger.info('Getting user by ID', { userId: id });
      
      const user = await userRepository.findById(id, true);
      return user as unknown as IUser | null;
    } catch (error) {
      logger.error('Error getting user by ID:', { error });
      throw new AppError(`Failed to get user: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get user by email
   * @param email User email
   * @returns User or null if not found
   */
  async getUserByEmail(email: string): Promise<IUser | null> {
    try {
      logger.info('Getting user by email', { email });
      
      const user = await userRepository.findByEmail(email, true);
      return user as unknown as IUser | null;
    } catch (error) {
      logger.error('Error getting user by email:', { error });
      throw new AppError(`Failed to get user: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Create a new user
   * @param userData User data
   * @param createdBy ID of user who created this user
   * @returns Created user
   */
  async createUser(userData: CreateUserDTO, createdBy: string): Promise<IUser> {
    try {
      logger.info('Creating new user', { email: userData.email });
      
      // Check if user already exists
      const existingUser = await userRepository.findByEmail(userData.email);
      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }
      
      // Check if role exists
      const role = await roleRepository.findById(userData.role);
      if (!role) {
        throw new AppError('Role not found', 404);
      }
      
      // Create user
      const user = await userRepository.create({
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        isActive: true
      });
      
      logger.info('User created successfully', { userId: user._id });
      
      return user as unknown as IUser;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error creating user:', { error });
      throw new AppError(`Failed to create user: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Update a user
   * @param id User ID
   * @param userData User data to update
   * @param updatedBy ID of user who updated this user
   * @returns Updated user or null if not found
   */
  async updateUser(id: string, userData: UpdateUserDTO, updatedBy: string): Promise<IUser | null> {
    try {
      logger.info('Updating user', { userId: id });
      
      // Check if user exists
      const existingUser = await userRepository.findById(id);
      if (!existingUser) {
        throw new AppError('User not found', 404);
      }
      
      // Check if email is being updated and if it's already in use
      if (userData.email && userData.email !== existingUser.email) {
        const userWithEmail = await userRepository.findByEmail(userData.email);
        if (userWithEmail && userWithEmail._id.toString() !== id) {
          throw new AppError('Email is already in use', 409);
        }
      }
      
      // Check if role is being updated and if it exists
      if (userData.role && userData.role !== existingUser.role.toString()) {
        const role = await roleRepository.findById(userData.role);
        if (!role) {
          throw new AppError('Role not found', 404);
        }
      }
      
      // Update user
      const updatedUser = await userRepository.update(id, userData as any);
      
      logger.info('User updated successfully', { userId: id });
      
      return updatedUser as unknown as IUser | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating user:', { error });
      throw new AppError(`Failed to update user: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Delete a user
   * @param id User ID
   * @returns True if deleted, false if not found
   */
  async deleteUser(id: string): Promise<boolean> {
    try {
      logger.info('Deleting user', { userId: id });
      
      const result = await userRepository.delete(id);
      
      if (result) {
        logger.info('User deleted successfully', { userId: id });
      } else {
        logger.info('User not found for deletion', { userId: id });
      }
      
      return result;
    } catch (error) {
      logger.error('Error deleting user:', { error });
      throw new AppError(`Failed to delete user: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Assign role to user
   * @param userId User ID
   * @param roleId Role ID
   * @param updatedBy ID of user who assigned the role
   * @returns Updated user or null if not found
   */
  async assignRole(userId: string, roleId: string, updatedBy: string): Promise<IUser | null> {
    try {
      logger.info('Assigning role to user', { userId, roleId });
      
      // Check if user exists
      const user = await userRepository.findById(userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Check if role exists
      const role = await roleRepository.findById(roleId);
      if (!role) {
        throw new AppError('Role not found', 404);
      }
      
      // Update user's role
      const updatedUser = await userRepository.update(userId, { role: roleId } as any);
      
      logger.info('Role assigned successfully', { userId, roleId });
      
      return updatedUser as unknown as IUser | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error assigning role:', { error });
      throw new AppError(`Failed to assign role: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get users by role
   * @param roleId Role ID
   * @param page Page number (1-based)
   * @param limit Number of items per page
   * @returns Paginated result with users and metadata
   */
  async getUsersByRole(roleId: string, page = 1, limit = 10): Promise<{
    users: IUser[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      logger.info('Getting users by role', { roleId, page, limit });
      
      // Check if role exists
      const role = await roleRepository.findById(roleId);
      if (!role) {
        throw new AppError('Role not found', 404);
      }
      
      const skip = (page - 1) * limit;
      const options = { skip, limit, sort: { createdAt: -1 } };
      
      // Execute count and find in parallel for better performance
      const users = await userRepository.findByRoleId(roleId, options, true);
      const total = await userRepository.count({ role: roleId } as any);
      
      const totalPages = Math.ceil(total / limit);
      
      return {
        users: users as unknown as IUser[],
        total,
        page,
        limit,
        totalPages
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error getting users by role:', { error });
      throw new AppError(`Failed to get users by role: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Activate a user
   * @param id User ID
   * @param updatedBy ID of user who activated this user
   * @returns Updated user or null if not found
   */
  async activateUser(id: string, updatedBy: string): Promise<IUser | null> {
    try {
      logger.info('Activating user', { userId: id });
      
      // Check if user exists
      const user = await userRepository.findById(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Check if user is already active
      if (user.isActive) {
        logger.info('User is already active', { userId: id });
        return user as unknown as IUser;
      }
      
      // Activate user
      const updatedUser = await userRepository.update(id, { isActive: true } as any);
      
      logger.info('User activated successfully', { userId: id });
      
      return updatedUser as unknown as IUser | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error activating user:', { error });
      throw new AppError(`Failed to activate user: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Deactivate a user
   * @param id User ID
   * @param updatedBy ID of user who deactivated this user
   * @returns Updated user or null if not found
   */
  async deactivateUser(id: string, updatedBy: string): Promise<IUser | null> {
    try {
      logger.info('Deactivating user', { userId: id });
      
      // Check if user exists
      const user = await userRepository.findById(id);
      if (!user) {
        throw new AppError('User not found', 404);
      }
      
      // Check if user is already inactive
      if (!user.isActive) {
        logger.info('User is already inactive', { userId: id });
        return user as unknown as IUser;
      }
      
      // Deactivate user
      const updatedUser = await userRepository.update(id, { isActive: false } as any);
      
      logger.info('User deactivated successfully', { userId: id });
      
      return updatedUser as unknown as IUser | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error deactivating user:', { error });
      throw new AppError(`Failed to deactivate user: ${(error as Error).message}`, 500);
    }
  }
}

// Export singleton instance
export const userService = new UserService();

export default userService;