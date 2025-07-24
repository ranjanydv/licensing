import { IRole } from '../interfaces/auth.interface';
import { CreateRoleDTO, UpdateRoleDTO } from '../interfaces/auth.interface';
import { IRoleService } from '../interfaces/role-service.interface';
import { roleRepository } from '../repositories/role.repository';
import { userRepository } from '../repositories/user.repository';
import { Logger } from '../utils/logger';
import { AppError } from '../middlewares/errorHandler';

const logger = new Logger('RoleService');

/**
 * Role service implementation
 */
export class RoleService implements IRoleService {
  /**
   * Get all roles
   * @returns Array of roles
   */
  async getAllRoles(): Promise<IRole[]> {
    try {
      logger.info('Getting all roles');
      
      const roles = await roleRepository.findAll({} as any, {}, true);
      return roles as unknown as IRole[];
    } catch (error) {
      logger.error('Error getting all roles:', { error });
      throw new AppError(`Failed to get roles: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get role by ID
   * @param id Role ID
   * @returns Role or null if not found
   */
  async getRoleById(id: string): Promise<IRole | null> {
    try {
      logger.info('Getting role by ID', { roleId: id });
      
      const role = await roleRepository.findById(id, true);
      return role as unknown as IRole | null;
    } catch (error) {
      logger.error('Error getting role by ID:', { error });
      throw new AppError(`Failed to get role: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get role by name
   * @param name Role name
   * @returns Role or null if not found
   */
  async getRoleByName(name: string): Promise<IRole | null> {
    try {
      logger.info('Getting role by name', { roleName: name });
      
      const role = await roleRepository.findByName(name, true);
      return role as unknown as IRole | null;
    } catch (error) {
      logger.error('Error getting role by name:', { error });
      throw new AppError(`Failed to get role: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Create a new role
   * @param roleData Role data
   * @returns Created role
   */
  async createRole(roleData: CreateRoleDTO): Promise<IRole> {
    try {
      logger.info('Creating new role', { roleName: roleData.name });
      
      // Check if role already exists
      const existingRole = await roleRepository.findByName(roleData.name);
      if (existingRole) {
        throw new AppError('Role with this name already exists', 409);
      }
      
      // Validate role name
      if (roleData.name !== 'admin' && roleData.name !== 'support') {
        throw new AppError('Role name must be either admin or support', 400);
      }
      
      // Create role
      const role = await roleRepository.create(roleData as any);
      
      logger.info('Role created successfully', { roleId: role._id });
      
      return role as unknown as IRole;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error creating role:', { error });
      throw new AppError(`Failed to create role: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Update a role
   * @param id Role ID
   * @param roleData Role data to update
   * @returns Updated role or null if not found
   */
  async updateRole(id: string, roleData: UpdateRoleDTO): Promise<IRole | null> {
    try {
      logger.info('Updating role', { roleId: id });
      
      // Check if role exists
      const existingRole = await roleRepository.findById(id);
      if (!existingRole) {
        throw new AppError('Role not found', 404);
      }
      
      // Check if name is being updated and if it's valid
      if (roleData.name && roleData.name !== existingRole.name) {
        // Check if name is valid
        if (roleData.name !== 'admin' && roleData.name !== 'support') {
          throw new AppError('Role name must be either admin or support', 400);
        }
        
        // Check if name is already in use
        const roleWithName = await roleRepository.findByName(roleData.name);
        if (roleWithName && roleWithName._id.toString() !== id) {
          throw new AppError('Role name is already in use', 409);
        }
      }
      
      // Update role
      const updatedRole = await roleRepository.update(id, roleData as any);
      
      logger.info('Role updated successfully', { roleId: id });
      
      return updatedRole as unknown as IRole | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error updating role:', { error });
      throw new AppError(`Failed to update role: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Delete a role
   * @param id Role ID
   * @returns True if deleted, false if not found
   */
  async deleteRole(id: string): Promise<boolean> {
    try {
      logger.info('Deleting role', { roleId: id });
      
      // Check if role exists
      const role = await roleRepository.findById(id);
      if (!role) {
        logger.info('Role not found for deletion', { roleId: id });
        return false;
      }
      
      // Check if role is in use
      const usersWithRole = await userRepository.findByRoleId(id);
      if (usersWithRole.length > 0) {
        throw new AppError('Cannot delete role that is assigned to users', 400);
      }
      
      // Delete role
      const result = await roleRepository.delete(id);
      
      if (result) {
        logger.info('Role deleted successfully', { roleId: id });
      }
      
      return result;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error deleting role:', { error });
      throw new AppError(`Failed to delete role: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Add permission to role
   * @param roleId Role ID
   * @param permission Permission to add
   * @returns Updated role or null if not found
   */
  async addPermission(roleId: string, permission: string): Promise<IRole | null> {
    try {
      logger.info('Adding permission to role', { roleId, permission });
      
      // Check if role exists
      const role = await roleRepository.findById(roleId);
      if (!role) {
        throw new AppError('Role not found', 404);
      }
      
      // Check if role already has permission
      if (role.permissions.includes(permission)) {
        logger.info('Role already has permission', { roleId, permission });
        return role as unknown as IRole;
      }
      
      // Add permission
      const updatedPermissions = [...role.permissions, permission];
      const updatedRole = await roleRepository.update(roleId, { permissions: updatedPermissions } as any);
      
      logger.info('Permission added successfully', { roleId, permission });
      
      return updatedRole as unknown as IRole | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error adding permission:', { error });
      throw new AppError(`Failed to add permission: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Remove permission from role
   * @param roleId Role ID
   * @param permission Permission to remove
   * @returns Updated role or null if not found
   */
  async removePermission(roleId: string, permission: string): Promise<IRole | null> {
    try {
      logger.info('Removing permission from role', { roleId, permission });
      
      // Check if role exists
      const role = await roleRepository.findById(roleId);
      if (!role) {
        throw new AppError('Role not found', 404);
      }
      
      // Check if role has permission
      if (!role.permissions.includes(permission)) {
        logger.info('Role does not have permission', { roleId, permission });
        return role as unknown as IRole;
      }
      
      // Remove permission
      const updatedPermissions = role.permissions.filter(p => p !== permission);
      
      // Ensure role has at least one permission
      if (updatedPermissions.length === 0) {
        throw new AppError('Role must have at least one permission', 400);
      }
      
      const updatedRole = await roleRepository.update(roleId, { permissions: updatedPermissions } as any);
      
      logger.info('Permission removed successfully', { roleId, permission });
      
      return updatedRole as unknown as IRole | null;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error removing permission:', { error });
      throw new AppError(`Failed to remove permission: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Check if role has permission
   * @param roleId Role ID
   * @param permission Permission to check
   * @returns True if role has permission
   */
  async hasPermission(roleId: string, permission: string): Promise<boolean> {
    try {
      logger.info('Checking if role has permission', { roleId, permission });
      
      // Check if role exists
      const role = await roleRepository.findById(roleId);
      if (!role) {
        throw new AppError('Role not found', 404);
      }
      
      return role.permissions.includes(permission);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error checking permission:', { error });
      throw new AppError(`Failed to check permission: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get roles by permission
   * @param permission Permission to search for
   * @returns Array of roles with the specified permission
   */
  async getRolesByPermission(permission: string): Promise<IRole[]> {
    try {
      logger.info('Getting roles by permission', { permission });
      
      const roles = await roleRepository.findByPermission(permission, true);
      return roles as unknown as IRole[];
    } catch (error) {
      logger.error('Error getting roles by permission:', { error });
      throw new AppError(`Failed to get roles by permission: ${(error as Error).message}`, 500);
    }
  }
}

// Export singleton instance
export const roleService = new RoleService();

export default roleService;