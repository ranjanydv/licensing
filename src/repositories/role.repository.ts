import { Document } from 'mongoose';
import { BaseRepository } from './base.repository';
import { RoleModel, RoleDocument } from '../models/role.model';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

const logger = new Logger('RoleRepository');

/**
 * Role repository implementation with optimized queries
 */
export class RoleRepository extends BaseRepository<RoleDocument> {
	constructor() {
		super(RoleModel);
	}

	/**
	 * Find role by name with optimized query
	 * @param name Role name ('admin' or 'support')
	 * @param lean Whether to return a plain object instead of a Mongoose document
	 * @returns Role or null if not found
	 */
	async findByName(name: string, lean = false): Promise<RoleDocument | null> {
		try {
			// Using the index on name field
			const query = this.model.findOne({ name: name.toLowerCase() });

			if (lean) {
				query.lean();
			}

			return await query.exec();
		} catch (error) {
			logger.error('Error finding role by name:', { error });
			throw new AppError(`Failed to find role: ${(error as Error).message}`, 500);
		}
	}

	/**
	 * Find admin role
	 * @param lean Whether to return a plain object instead of a Mongoose document
	 * @returns Admin role or null if not found
	 */
	async findAdminRole(lean = false): Promise<RoleDocument | null> {
		return this.findByName('admin', lean);
	}

	/**
	 * Find support role
	 * @param lean Whether to return a plain object instead of a Mongoose document
	 * @returns Support role or null if not found
	 */
	async findSupportRole(lean = false): Promise<RoleDocument | null> {
		return this.findByName('support', lean);
	}

	/**
	 * Find role by permission
	 * @param permission Permission to search for
	 * @param lean Whether to return a plain object instead of a Mongoose document
	 * @returns Array of roles with the specified permission
	 */
	async findByPermission(permission: string, lean = false): Promise<RoleDocument[]> {
		try {
			const query = this.model.find({ permissions: permission });

			if (lean) {
				query.lean();
			}

			return await query.exec();
		} catch (error) {
			logger.error('Error finding roles by permission:', { error });
			throw new AppError(`Failed to find roles by permission: ${(error as Error).message}`, 500);
		}
	}

	/**
	 * Check if a role with the given name exists
	 * @param name Role name
	 * @returns True if role exists, false otherwise
	 */
	async exists(name: string): Promise<boolean> {
		try {
			const role = await this.findByName(name);
			return role !== null;
		} catch (error) {
			logger.error('Error checking if role exists:', { error });
			throw new AppError(`Failed to check if role exists: ${(error as Error).message}`, 500);
		}
	}
}

// Export singleton instance
export const roleRepository = new RoleRepository();

export default roleRepository;