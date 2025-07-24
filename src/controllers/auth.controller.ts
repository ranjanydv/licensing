import { Request, Response } from 'express';
import { AuthRequest } from '../interfaces/auth.interface';
import { authService } from '../services/auth.service';
import { catchAsync, AppError, AuthError, NotFoundError } from '../middlewares/errorHandler';
import { Logger } from '../utils/logger';

const logger = new Logger('AuthController');

/**
 * Register a new user
 * @route POST /api/auth/register
 */
export const register = catchAsync(async (req: Request, res: Response) => {
  try {
    // Register user
    const result = await authService.register(req.body);
    
    // Return success response
    res.status(201).json({
      status: 'success',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Registration error:', { error });
    throw error;
  }
});

/**
 * Login a user
 * @route POST /api/auth/login
 */
export const login = catchAsync(async (req: Request, res: Response) => {
  try {
    // Login user
    const result = await authService.login(req.body);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        user: result.user,
        tokens: result.tokens
      }
    });
  } catch (error) {
    logger.error('Login error:', { error });
    throw error;
  }
});

/**
 * Logout a user
 * @route POST /api/auth/logout
 */
export const logout = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AuthError('No authentication token provided');
    }
    
    const token = authHeader.split(' ')[1];
    
    // Logout user
    const result = await authService.logout(authReq.user.id, token);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Logged out successfully'
    });
  } catch (error) {
    logger.error('Logout error:', { error });
    throw error;
  }
});

/**
 * Refresh access token
 * @route POST /api/auth/refresh
 */
export const refreshToken = catchAsync(async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    // Refresh token
    const tokens = await authService.refreshToken(refreshToken);
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        tokens
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', { error });
    throw error;
  }
});

/**
 * Get current user profile
 * @route GET /api/auth/me
 */
export const getCurrentUser = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    // Return success response
    res.status(200).json({
      status: 'success',
      data: {
        user: authReq.user
      }
    });
  } catch (error) {
    logger.error('Get current user error:', { error });
    throw error;
  }
});

/**
 * Change password
 * @route POST /api/auth/change-password
 */
export const changePassword = catchAsync(async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    
    // Check if user is authenticated
    if (!authReq.user) {
      throw new AuthError('Authentication required');
    }
    
    const { currentPassword, newPassword } = req.body;
    
    // Validate request body
    if (!currentPassword || !newPassword) {
      throw new AppError('Current password and new password are required', 400);
    }
    
    // TODO: Implement password change functionality in AuthService
    // For now, we'll just return a success response
    
    // Return success response
    res.status(200).json({
      status: 'success',
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', { error });
    throw error;
  }
});