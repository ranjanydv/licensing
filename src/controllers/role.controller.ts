import { Request, Response } from 'express';
import { AuthRequest } from '../interfaces/auth.interface';
import { roleService } from '../services/role.service';
import { catchAsync, AppError, AuthError, NotFoundError } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';

const logger = new Logger('RoleController');

/**
 * Get all roles
 * @route GET /api/roles
 */
export const getAllRoles = catchAsync(async (req: Request, res: Response) => {
  try {
    // Get all roles
    const roles = await roleService.getAllRoles();
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        roles
      }
    });
  } catch (error) {
    logger.error('Get all roles error:', { error });
    throw error;
  }
});

/**
 * Get role by ID
 * @route GET /api/roles/:id
 */
export const getRoleById = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get role by ID
    const role = await roleService.getRoleById(id);
    
    // Check if role exists
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Get role by ID error:', { error });
    throw error;
  }
});

/**
 * Create a new role
 * @route POST /api/roles
 */
export const createRole = catchAsync(async (req: Request, res: Response) => {
  try {
    // Create role
    const role = await roleService.createRole(req.body);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Create role error:', { error });
    throw error;
  }
});

/**
 * Update a role
 * @route PUT /api/roles/:id
 */
export const updateRole = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Update role
    const role = await roleService.updateRole(id, req.body);
    
    // Check if role exists
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Update role error:', { error });
    throw error;
  }
});

/**
 * Delete a role
 * @route DELETE /api/roles/:id
 */
export const deleteRole = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete role
    const result = await roleService.deleteRole(id);
    
    // Check if role exists
    if (!result) {
      throw new NotFoundError('Role not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Role deleted successfully'
    });
  } catch (error) {
    logger.error('Delete role error:', { error });
    throw error;
  }
});

/**
 * Add permission to role
 * @route POST /api/roles/:id/permissions
 */
export const addPermission = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { permission } = req.body;
    
    // Validate request body
    if (!permission) {
      throw new AppError('Permission is required', 400);
    }
    
    // Add permission to role
    const role = await roleService.addPermission(id, permission);
    
    // Check if role exists
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Add permission error:', { error });
    throw error;
  }
});

/**
 * Remove permission from role
 * @route DELETE /api/roles/:id/permissions/:permission
 */
export const removePermission = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id, permission } = req.params;
    
    // Remove permission from role
    const role = await roleService.removePermission(id, permission);
    
    // Check if role exists
    if (!role) {
      throw new NotFoundError('Role not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        role
      }
    });
  } catch (error) {
    logger.error('Remove permission error:', { error });
    throw error;
  }
});

/**
 * Get roles by permission
 * @route GET /api/roles/permission/:permission
 */
export const getRolesByPermission = catchAsync(async (req: Request, res: Response) => {
  try {
    const { permission } = req.params;
    
    // Get roles by permission
    const roles = await roleService.getRolesByPermission(permission);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        roles
      }
    });
  } catch (error) {
    logger.error('Get roles by permission error:', { error });
    throw error;
  }
});