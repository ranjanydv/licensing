import { Request, Response } from 'express';
import { 
  errorHandler, 
  AppError, 
  LicenseError, 
  AuthError, 
  ForbiddenError, 
  NotFoundError, 
  ValidationError, 
  ConflictError,
  notFoundHandler
} from '../../middlewares/errorHandler';
import mongoose from 'mongoose';
import { ZodError, z } from 'zod';
import jwt from 'jsonwebtoken';

describe('Error Handler Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      path: '/test',
      method: 'GET',
      originalUrl: '/test'
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('errorHandler', () => {
    it('should handle AppError', () => {
      // Setup
      const error = new AppError('Test error', 400);

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Test error'
      });
    });

    it('should handle LicenseError', () => {
      // Setup
      const error = new LicenseError('License error', 'LICENSE_EXPIRED', 403);

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'License error',
        code: 'LICENSE_EXPIRED'
      });
    });

    it('should handle AuthError', () => {
      // Setup
      const error = new AuthError('Authentication failed');

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Authentication failed',
        code: 'AUTHENTICATION_ERROR'
      });
    });

    it('should handle ForbiddenError', () => {
      // Setup
      const error = new ForbiddenError('Access denied');

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Access denied',
        code: 'FORBIDDEN'
      });
    });

    it('should handle NotFoundError', () => {
      // Setup
      const error = new NotFoundError('User not found');

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'User not found'
      });
    });

    it('should handle ValidationError', () => {
      // Setup
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Password too short' }
      ];
      const error = new ValidationError('Validation failed', errors);

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation failed',
        errors
      });
    });

    it('should handle ConflictError', () => {
      // Setup
      const error = new ConflictError('Email already exists');

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Email already exists'
      });
    });

    it('should handle Mongoose validation errors', () => {
      // Setup
      const error = new mongoose.Error.ValidationError();
      error.errors = {
        email: new mongoose.Error.ValidatorError({
          path: 'email',
          message: 'Email is required',
          type: 'required'
        }),
        password: new mongoose.Error.ValidatorError({
          path: 'password',
          message: 'Password is too short',
          type: 'minlength'
        })
      };

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation error',
        errors: [
          { field: 'email', message: 'Email is required' },
          { field: 'password', message: 'Password is too short' }
        ]
      });
    });

    it('should handle Zod validation errors', () => {
      // Setup
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      });
      let error: ZodError;
      try {
        schema.parse({ email: 'invalid', password: '123' });
      } catch (e) {
        error = e as ZodError;
      }

      // Execute
      errorHandler(error!, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Validation error',
        errors: expect.arrayContaining([
          expect.objectContaining({ field: 'email' }),
          expect.objectContaining({ field: 'password' })
        ])
      });
    });

    it('should handle JWT JsonWebTokenError', () => {
      // Setup
      const error = new jwt.JsonWebTokenError('invalid signature');

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Invalid token',
        code: 'INVALID_TOKEN'
      });
    });

    it('should handle JWT TokenExpiredError', () => {
      // Setup
      const error = new jwt.TokenExpiredError('jwt expired', new Date());

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Token expired',
        code: 'TOKEN_EXPIRED'
      });
    });

    it('should handle Mongoose duplicate key errors', () => {
      // Setup
      const error = new mongoose.Error.MongooseError('Duplicate key error');
      (error as any).code = 11000;
      (error as any).keyValue = { email: 'test@example.com' };

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(409);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'email already exists',
        code: 'DUPLICATE_KEY'
      });
    });

    it('should handle unexpected errors in production', () => {
      // Setup
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const error = new Error('Unexpected error');

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Internal server error'
      });

      // Restore
      process.env.NODE_ENV = originalEnv;
    });

    it('should include error details for unexpected errors in development', () => {
      // Setup
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const error = new Error('Unexpected error');
      error.stack = 'Error stack trace';

      // Execute
      errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'error',
        message: 'Unexpected error',
        stack: 'Error stack trace'
      });

      // Restore
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('notFoundHandler', () => {
    it('should call next with NotFoundError', () => {
      // Execute
      notFoundHandler(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(NotFoundError));
      expect(nextFunction.mock.calls[0][0].message).toBe('Cannot GET /test');
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(404);
    });
  });
});