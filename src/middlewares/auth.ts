import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { Logger } from '../utils/logger';
/**
 * Interface for JWT payload
 */
interface JWTPayload {
  id: string;
  role: string;
  iat: number;
  exp: number;
}

const logger = new Logger('Auth');

/**
 * Authentication middleware
 * Verifies JWT token from Authorization header
 */
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No authentication token provided', 401);
    }

    const token = authHeader.split(' ')[1];

    // Verify token
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new AppError('JWT_SECRET is not defined', 500);
    }

    const decoded = jwt.verify(token, secret) as JWTPayload;

    // Add user info to request
    req.body.userId = decoded.id;
    req.body.userRole = decoded.role;

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return next(new AppError('Invalid authentication token', 401));
    }

    if (error instanceof jwt.TokenExpiredError) {
      return next(new AppError('Authentication token expired', 401));
    }

    logger.error('Authentication error:', { error });
    next(error);
  }
};

/**
 * Authorization middleware
 * Checks if user has required role
 * @param roles Allowed roles
 */
export const authorize = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.body.userRole) {
      return next(new AppError('User role not found, authentication required', 401));
    }

    if (!roles.includes(req.body.userRole)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }

    next();
  };
};