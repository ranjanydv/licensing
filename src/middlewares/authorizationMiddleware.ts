import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from '../interfaces/auth.interface';
import { roleService } from '../services/role.service';
import { AppError } from './errorHandler';
import { Logger } from '../utils/logger';

const logger = new Logger('AuthorizationMiddleware');

/**
 * Role-based authorization middleware
 * Checks if the authenticated user has one of the allowed roles
 * @param roles Array of allowed roles
 */
export const authorize = (roles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      // Check if user is authenticated
      if (!authReq.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // Check if user has one of the allowed roles
      if (!roles.includes(authReq.user.role)) {
        throw new AppError('You do not have permission to perform this action', 403);
      }
      
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      
      logger.error('Authorization error:', { error });
      next(new AppError('Authorization failed', 403));
    }
  };
};

/**
 * Permission-based authorization middleware
 * Checks if the authenticated user's role has the required permission
 * @param permission Required permission
 */
export const requirePermission = (permission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      // Check if user is authenticated
      if (!authReq.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // Get user's role
      const role = await roleService.getRoleByName(authReq.user.role);
      if (!role) {
        throw new AppError('User role not found', 500);
      }
      
      // Check if role has the required permission
      if (!role.permissions.includes(permission)) {
        throw new AppError(`Permission '${permission}' required`, 403);
      }
      
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      
      logger.error('Permission check error:', { error });
      next(new AppError('Authorization failed', 403));
    }
  };
};

/**
 * Multiple permissions authorization middleware
 * Checks if the authenticated user's role has all the required permissions
 * @param permissions Array of required permissions
 */
export const requirePermissions = (permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      // Check if user is authenticated
      if (!authReq.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // Get user's role
      const role = await roleService.getRoleByName(authReq.user.role);
      if (!role) {
        throw new AppError('User role not found', 500);
      }
      
      // Check if role has all the required permissions
      const missingPermissions = permissions.filter(
        permission => !role.permissions.includes(permission)
      );
      
      if (missingPermissions.length > 0) {
        throw new AppError(
          `Missing required permissions: ${missingPermissions.join(', ')}`,
          403
        );
      }
      
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      
      logger.error('Permissions check error:', { error });
      next(new AppError('Authorization failed', 403));
    }
  };
};

/**
 * Resource owner authorization middleware
 * Checks if the authenticated user is the owner of the resource
 * @param getResourceOwnerId Function to extract the resource owner ID from the request
 */
export const requireOwnership = (
  getResourceOwnerId: (req: Request) => string | Promise<string>
) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      // Check if user is authenticated
      if (!authReq.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // Get resource owner ID
      const ownerId = await getResourceOwnerId(req);
      
      // Check if user is the owner
      if (authReq.user.id !== ownerId) {
        throw new AppError('You do not have permission to access this resource', 403);
      }
      
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      
      logger.error('Ownership check error:', { error });
      next(new AppError('Authorization failed', 403));
    }
  };
};

/**
 * Combined authorization middleware
 * Allows access if user has one of the allowed roles OR has all required permissions
 * @param roles Array of allowed roles
 * @param permissions Array of required permissions
 */
export const authorizeRoleOrPermissions = (roles: string[], permissions: string[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const authReq = req as AuthRequest;
      
      // Check if user is authenticated
      if (!authReq.user) {
        throw new AppError('Authentication required', 401);
      }
      
      // Check if user has one of the allowed roles
      if (roles.includes(authReq.user.role)) {
        return next();
      }
      
      // Get user's role
      const role = await roleService.getRoleByName(authReq.user.role);
      if (!role) {
        throw new AppError('User role not found', 500);
      }
      
      // Check if role has all the required permissions
      const hasAllPermissions = permissions.every(
        permission => role.permissions.includes(permission)
      );
      
      if (!hasAllPermissions) {
        throw new AppError('You do not have permission to perform this action', 403);
      }
      
      next();
    } catch (error) {
      if (error instanceof AppError) {
        return next(error);
      }
      
      logger.error('Authorization error:', { error });
      next(new AppError('Authorization failed', 403));
    }
  };
};