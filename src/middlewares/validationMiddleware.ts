import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';
import { AppError } from './errorHandler';
import { Logger } from '../utils/logger';

const logger = new Logger('ValidationMiddleware');

/**
 * Validation source types
 */
export enum ValidationSource {
  BODY = 'body',
  QUERY = 'query',
  PARAMS = 'params',
  HEADERS = 'headers'
}

/**
 * Validation middleware factory
 * Creates a middleware that validates request data against a Zod schema
 * @param schema Zod schema to validate against
 * @param source Source of data to validate (body, query, params, headers)
 */
export const validate = <T>(schema: ZodSchema<T>, source: ValidationSource = ValidationSource.BODY) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      const validatedData = schema.parse(data);
      
      // Replace request data with validated data
      req[source] = validatedData;
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        logger.warn('Validation error:', { errors: formattedErrors });
        
        return next(new AppError(
          `Validation error: ${formattedErrors.map(e => `${e.path}: ${e.message}`).join(', ')}`,
          400
        ));
      }
      
      logger.error('Unexpected validation error:', { error });
      next(new AppError('Validation failed', 400));
    }
  };
};

/**
 * Combined validation middleware
 * Validates multiple sources against different schemas
 * @param validations Array of validation configurations
 */
export const validateMultiple = (validations: Array<{ schema: ZodSchema<any>; source: ValidationSource }>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      for (const validation of validations) {
        const { schema, source } = validation;
        const data = req[source];
        const validatedData = schema.parse(data);
        
        // Replace request data with validated data
        req[source] = validatedData;
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors
        const formattedErrors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message
        }));
        
        logger.warn('Validation error:', { errors: formattedErrors });
        
        return next(new AppError(
          `Validation error: ${formattedErrors.map(e => `${e.path}: ${e.message}`).join(', ')}`,
          400
        ));
      }
      
      logger.error('Unexpected validation error:', { error });
      next(new AppError('Validation failed', 400));
    }
  };
};

/**
 * Sanitize middleware
 * Removes fields that are not in the allowed list
 * @param allowedFields Array of allowed field names
 * @param source Source of data to sanitize (body, query, params)
 */
export const sanitize = (allowedFields: string[], source: ValidationSource = ValidationSource.BODY) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = req[source];
      
      if (typeof data === 'object' && data !== null) {
        // Create a new object with only allowed fields
        const sanitizedData = Object.keys(data)
          .filter(key => allowedFields.includes(key))
          .reduce((obj, key) => {
            obj[key] = data[key];
            return obj;
          }, {} as Record<string, any>);
        
        // Replace request data with sanitized data
        req[source] = sanitizedData;
      }
      
      next();
    } catch (error) {
      logger.error('Sanitization error:', { error });
      next(new AppError('Sanitization failed', 400));
    }
  };
};