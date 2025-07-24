import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
import { ZodError } from 'zod';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';

const logger = new Logger('ErrorHandler');

/**
 * Base application error class
 */
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.name = 'AppError';
    
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * License-specific error class
 */
export class LicenseError extends AppError {
  code: string;
  
  constructor(message: string, code: string, statusCode: number) {
    super(message, statusCode);
    this.code = code;
    this.name = 'LicenseError';
  }
}

/**
 * Authentication error class
 */
export class AuthError extends AppError {
  code: string;
  
  constructor(message: string, code: string = 'AUTHENTICATION_ERROR', statusCode: number = 401) {
    super(message, statusCode);
    this.code = code;
    this.name = 'AuthError';
  }
}

/**
 * Authorization error class
 */
export class ForbiddenError extends AppError {
  code: string;
  
  constructor(message: string, code: string = 'FORBIDDEN', statusCode: number = 403) {
    super(message, statusCode);
    this.code = code;
    this.name = 'ForbiddenError';
  }
}

/**
 * Not found error class
 */
export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Validation error class
 */
export class ValidationError extends AppError {
  errors: Record<string, string>[];
  
  constructor(message: string, errors: Record<string, string>[] = []) {
    super(message, 400);
    this.errors = errors;
    this.name = 'ValidationError';
  }
}

/**
 * Conflict error class (e.g., duplicate email)
 */
export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Default error response
  let statusCode = 500;
  let errorMessage = 'Internal server error';
  let errorResponse: any = {
    status: 'error',
    message: errorMessage
  };

  // Handle operational errors (our custom error classes)
  if (err instanceof AppError) {
    statusCode = err.statusCode;
    errorMessage = err.message;
    errorResponse = {
      status: 'error',
      message: errorMessage
    };

    // Add specific error details for different error types
    if (err instanceof LicenseError || err instanceof AuthError || err instanceof ForbiddenError) {
      errorResponse.code = (err as any).code;
    }

    if (err instanceof ValidationError && err.errors.length > 0) {
      errorResponse.errors = err.errors;
    }

    logger.warn(`${err.name}: ${err.message}`, { 
      path: req.path, 
      method: req.method,
      statusCode: err.statusCode
    });
  } 
  // Handle Mongoose validation errors
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    errorMessage = 'Validation error';
    
    const errors = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
    
    errorResponse = {
      status: 'error',
      message: errorMessage,
      errors
    };
    
    logger.warn('Mongoose validation error', { 
      path: req.path, 
      method: req.method,
      errors
    });
  }
  // Handle Zod validation errors
  else if (err instanceof ZodError) {
    statusCode = 400;
    errorMessage = 'Validation error';
    
    const errors = err.errors.map(e => ({
      field: e.path.join('.'),
      message: e.message
    }));
    
    errorResponse = {
      status: 'error',
      message: errorMessage,
      errors
    };
    
    logger.warn('Zod validation error', { 
      path: req.path, 
      method: req.method,
      errors
    });
  }
  // Handle JWT errors
  else if (err instanceof jwt.JsonWebTokenError) {
    statusCode = 401;
    errorMessage = 'Invalid token';
    
    errorResponse = {
      status: 'error',
      message: errorMessage,
      code: 'INVALID_TOKEN'
    };
    
    logger.warn('JWT error', { 
      path: req.path, 
      method: req.method,
      error: err.message
    });
  }
  else if (err instanceof jwt.TokenExpiredError) {
    statusCode = 401;
    errorMessage = 'Token expired';
    
    errorResponse = {
      status: 'error',
      message: errorMessage,
      code: 'TOKEN_EXPIRED'
    };
    
    logger.warn('JWT expired', { 
      path: req.path, 
      method: req.method,
      expiredAt: err.expiredAt
    });
  }
  // Handle Mongoose duplicate key errors
  else if (err instanceof mongoose.Error && (err as any).code === 11000) {
    statusCode = 409;
    errorMessage = 'Duplicate key error';
    
    const keyValue = (err as any).keyValue;
    const field = Object.keys(keyValue)[0];
    
    errorResponse = {
      status: 'error',
      message: `${field} already exists`,
      code: 'DUPLICATE_KEY'
    };
    
    logger.warn('Duplicate key error', { 
      path: req.path, 
      method: req.method,
      field,
      value: keyValue[field]
    });
  }
  // Handle unexpected errors
  else {
    logger.error(`Unhandled error: ${err.message}`, { 
      error: err,
      stack: err.stack,
      path: req.path,
      method: req.method
    });
    
    // In production, don't expose error details
    if (process.env.NODE_ENV === 'production') {
      errorResponse = {
        status: 'error',
        message: 'Internal server error'
      };
    } else {
      // In development, include error details
      errorResponse = {
        status: 'error',
        message: err.message || 'Internal server error',
        stack: err.stack
      };
    }
  }
  
  return res.status(statusCode).json(errorResponse);
};

/**
 * Async handler wrapper to avoid try-catch blocks in route handlers
 * @param fn Route handler function
 * @returns Wrapped function that catches async errors
 */
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Not found middleware for handling undefined routes
 */
export const notFoundHandler = (req: Request, res: Response, next: NextFunction) => {
  next(new NotFoundError(`Cannot ${req.method} ${req.originalUrl}`));
};