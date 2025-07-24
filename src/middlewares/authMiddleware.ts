import { Request, Response, NextFunction } from 'express';
import { AuthRequest, DecodedToken } from '../interfaces/auth.interface';
import { authService } from '../services/auth.service';
import { AppError } from './errorHandler';
import { Logger } from '../utils/logger';

const logger = new Logger('AuthMiddleware');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header and attaches user to request
 */
export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token using auth service
    const decodedToken = await authService.verifyToken(token);

    // Attach user to request
    (req as AuthRequest).user = {
      id: decodedToken.userId,
      email: decodedToken.email,
      role: decodedToken.role
    };

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    logger.error('Authentication error:', { error });
    next(new AppError('Authentication failed', 401));
  }
};

/**
 * Optional authentication middleware
 * Tries to verify JWT token but doesn't fail if token is not provided or invalid
 */
export const optionalAuthenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    // Verify token using auth service
    try {
      const decodedToken = await authService.verifyToken(token);

      // Attach user to request
      (req as AuthRequest).user = {
        id: decodedToken.userId,
        email: decodedToken.email,
        role: decodedToken.role
      };
    } catch (error) {
      // Ignore token verification errors in optional authentication
      logger.debug('Optional authentication failed:', { error });
    }

    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};

/**
 * Refresh token middleware
 * Verifies refresh token from request body
 */
export const verifyRefreshToken = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw new AppError('Refresh token is required', 400);
    }

    // Verify refresh token using auth service
    // This will throw an error if the token is invalid or blacklisted
    // The actual token refresh will be handled in the controller
    await authService.verifyToken(refreshToken);

    next();
  } catch (error) {
    if (error instanceof AppError) {
      return next(error);
    }

    logger.error('Refresh token verification error:', { error });
    next(new AppError('Invalid refresh token', 401));
  }
};

/**
 * Helper function to create a catch-async wrapper for route handlers
 * @param fn Route handler function
 * @returns Wrapped function that catches async errors
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};