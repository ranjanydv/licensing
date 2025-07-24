import { Request, Response } from 'express';
import { AuthRequest } from '../interfaces/auth.interface';
import { userService } from '../services/user.service';
import { catchAsync, AppError, AuthError, NotFoundError } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';

const logger = new Logger('UserController');

/**
 * Get all users with pagination
 * @route GET /api/users
 */
export const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get users with pagination
    const result = await userService.getAllUsers(page, limit);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        users: result.users,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      }
    });
  } catch (error) {
    logger.error('Get all users error:', { error });
    throw error;
  }
});

/**
 * Get user by ID
 * @route GET /api/users/:id
 */
export const getUserById = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Get user by ID
    const user = await userService.getUserById(id);
    
    // Check if user exists
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    logger.error('Get user by ID error:', { error });
    throw error;
  }
});

/**
 * Create a new user
 * @route POST /api/users
 */
export const createUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    // Create user
    const user = await userService.createUser(req.body, authReq.user.id);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    logger.error('Create user error:', { error });
    throw error;
  }
});

/**
 * Update a user
 * @route PUT /api/users/:id
 */
export const updateUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    // Update user
    const user = await userService.updateUser(id, req.body, authReq.user.id);
    
    // Check if user exists
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    logger.error('Update user error:', { error });
    throw error;
  }
});

/**
 * Delete a user
 * @route DELETE /api/users/:id
 */
export const deleteUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    // Delete user
    const result = await userService.deleteUser(id);
    
    // Check if user exists
    if (!result) {
      throw new NotFoundError('User not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', { error });
    throw error;
  }
});

/**
 * Assign role to user
 * @route POST /api/users/:id/role
 */
export const assignRole = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    const { roleId } = req.body;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    // Validate request body
    if (!roleId) {
      throw new AppError('Role ID is required', 400);
    }
    
    // Assign role to user
    const user = await userService.assignRole(id, roleId, authReq.user.id);
    
    // Check if user exists
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    logger.error('Assign role error:', { error });
    throw error;
  }
});

/**
 * Get users by role
 * @route GET /api/users/role/:roleId
 */
export const getUsersByRole = catchAsync(async (req: Request, res: Response) => {
  try {
    const { roleId } = req.params;
    
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    
    // Get users by role
    const result = await userService.getUsersByRole(roleId, page, limit);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        users: result.users,
        pagination: {
          total: result.total,
          page: result.page,
          limit: result.limit,
          totalPages: result.totalPages
        }
      }
    });
  } catch (error) {
    logger.error('Get users by role error:', { error });
    throw error;
  }
});

/**
 * Activate a user
 * @route PATCH /api/users/:id/activate
 */
export const activateUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    // Activate user
    const user = await userService.activateUser(id, authReq.user.id);
    
    // Check if user exists
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    logger.error('Activate user error:', { error });
    throw error;
  }
});

/**
 * Deactivate a user
 * @route PATCH /api/users/:id/deactivate
 */
export const deactivateUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const { id } = req.params;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    // Deactivate user
    const user = await userService.deactivateUser(id, authReq.user.id);
    
    // Check if user exists
    if (!user) {
      throw new NotFoundError('User not found');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        user
      }
    });
  } catch (error) {
    logger.error('Deactivate user error:', { error });
    throw error;
  }
});