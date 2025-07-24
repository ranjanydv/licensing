import { Document } from 'mongoose';
import { BaseRepository } from './base.repository';
import { UserModel, UserDocument } from '../models/user.model';
import { IUser } from '../interfaces/auth.interface';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

const logger = new Logger('UserRepository');

/**
 * User repository implementation with optimized queries
 */
export class UserRepository extends BaseRepository<UserDocument> {
	constructor() {
		super(UserModel);
	}

	/**
	 * Find user by email with optimized query
	 * @param email User email
	 * @param lean Whether to return a plain object instead of a Mongoose document
	 * @returns User or null if not found
	 */
	async findByEmail(email: string, lean = false): Promise<UserDocument | null> {
		try {
			// Using the index on email field
			const query = this.model.findOne({ email: email.toLowerCase() });

			if (lean) {
				query.lean();
			}

			return await query.exec();
		} catch (error) {
			logger.error('Error finding user by email:', { error });
			throw new AppError(`Failed to find user: ${(error as Error).message}`, 500);
		}
	}

	/**
	 * Check if user is first in system
	 * @returns True if no users exist in the system
	 */
	async isFirstUser(): Promise<boolean> {
		try {
			const count = await this.count();
			return count === 0;
		} catch (error) {
			logger.error('Error checking if first user:', { error });
			throw new AppError(`Failed to check if first user: ${(error as Error).message}`, 500);
		}
	}

	/**
	 * Find users by role ID
	 * @param roleId Role ID
	 * @param options Find options
	 * @param lean Whether to return plain objects instead of Mongoose documents
	 * @returns Array of users with the specified role
	 */
	async findByRoleId(roleId: string, options: any = {}, lean = false): Promise<UserDocument[]> {
		try {
			return await this.findAll({ role: roleId } as any, options, lean);
		} catch (error) {
			logger.error('Error finding users by role ID:', { error });
			throw new AppError(`Failed to find users by role: ${(error as Error).message}`, 500);
		}
	}

	/**
	 * Update user's last login time
	 * @param userId User ID
	 * @returns Updated user or null if not found
	 */
	async updateLastLogin(userId: string): Promise<UserDocument | null> {
		try {
			return await this.update(userId, { lastLogin: new Date() } as any);
		} catch (error) {
			logger.error('Error updating last login:', { error });
			throw new AppError(`Failed to update last login: ${(error as Error).message}`, 500);
		}
	}

	/**
	 * Find active users
	 * @param options Find options
	 * @param lean Whether to return plain objects instead of Mongoose documents
	 * @returns Array of active users
	 */
	async findActive(options: any = {}, lean = false): Promise<UserDocument[]> {
		try {
			return await this.findAll({ isActive: true } as any, options, lean);
		} catch (error) {
			logger.error('Error finding active users:', { error });
			throw new AppError(`Failed to find active users: ${(error as Error).message}`, 500);
		}
	}
}

// Export singleton instance
export const userRepository = new UserRepository();

export default userRepository;