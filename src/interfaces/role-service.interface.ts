import { IRole } from './auth.interface';
import { CreateRoleDTO, UpdateRoleDTO } from './auth.interface';

/**
 * Role service interface
 */
export interface IRoleService {
  /**
   * Get all roles
   * @returns Array of roles
   */
  getAllRoles(): Promise<IRole[]>;
  
  /**
   * Get role by ID
   * @param id Role ID
   * @returns Role or null if not found
   */
  getRoleById(id: string): Promise<IRole | null>;
  
  /**
   * Get role by name
   * @param name Role name
   * @returns Role or null if not found
   */
  getRoleByName(name: string): Promise<IRole | null>;
  
  /**
   * Create a new role
   * @param roleData Role data
   * @returns Created role
   */
  createRole(roleData: CreateRoleDTO): Promise<IRole>;
  
  /**
   * Update a role
   * @param id Role ID
   * @param roleData Role data to update
   * @returns Updated role or null if not found
   */
  updateRole(id: string, roleData: UpdateRoleDTO): Promise<IRole | null>;
  
  /**
   * Delete a role
   * @param id Role ID
   * @returns True if deleted, false if not found
   */
  deleteRole(id: string): Promise<boolean>;
  
  /**
   * Add permission to role
   * @param roleId Role ID
   * @param permission Permission to add
   * @returns Updated role or null if not found
   */
  addPermission(roleId: string, permission: string): Promise<IRole | null>;
  
  /**
   * Remove permission from role
   * @param roleId Role ID
   * @param permission Permission to remove
   * @returns Updated role or null if not found
   */
  removePermission(roleId: string, permission: string): Promise<IRole | null>;
  
  /**
   * Check if role has permission
   * @param roleId Role ID
   * @param permission Permission to check
   * @returns True if role has permission
   */
  hasPermission(roleId: string, permission: string): Promise<boolean>;
  
  /**
   * Get roles by permission
   * @param permission Permission to search for
   * @returns Array of roles with the specified permission
   */
  getRolesByPermission(permission: string): Promise<IRole[]>;
}