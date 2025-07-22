import { Request, Response, NextFunction } from 'express';
import { Logger } from '../utils/logger';
const logger = new Logger('ErrorHandler');

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  
  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    
    Error.captureStackTrace(this, this.constructor);
  }
}

export class LicenseError extends AppError {
  code: string;
  
  constructor(message: string, code: string, statusCode: number) {
    super(message, statusCode);
    this.code = code;
    this.name = 'LicenseError';
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    logger.warn(`${err.name}: ${err.message}`, { 
      path: req.path, 
      method: req.method,
      statusCode: err.statusCode
    });
    
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
      ...(err instanceof LicenseError && { code: err.code }),
    });
  }
  
  // Unexpected errors
  logger.error(`Unhandled error: ${err.message}`, { 
    error: err,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  
  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};

export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};