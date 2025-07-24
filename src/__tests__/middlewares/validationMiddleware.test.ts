import { Request, Response } from 'express';
import { z } from 'zod';
import { validate, validateMultiple, sanitize, ValidationSource } from '../../middlewares/validationMiddleware';
import { AppError } from '../../middlewares/errorHandler';

describe('Validation Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      query: {},
      params: {}
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('validate', () => {
    it('should call next if validation passes', () => {
      // Setup
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      });
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      const middleware = validate(schema);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if validation fails', () => {
      // Setup
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      });
      mockRequest.body = {
        email: 'invalid-email',
        password: 'short'
      };
      const middleware = validate(schema);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toContain('Validation error');
      expect(nextFunction.mock.calls[0][0].message).toContain('email: Invalid');
      expect(nextFunction.mock.calls[0][0].message).toContain('password: String must contain at least 6 character(s)');
    });

    it('should validate query parameters', () => {
      // Setup
      const schema = z.object({
        page: z.string().transform(val => parseInt(val, 10)),
        limit: z.string().transform(val => parseInt(val, 10))
      });
      mockRequest.query = {
        page: '1',
        limit: '10'
      };
      const middleware = validate(schema, ValidationSource.QUERY);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({
        page: 1,
        limit: 10
      });
    });

    it('should validate URL parameters', () => {
      // Setup
      const schema = z.object({
        id: z.string().uuid()
      });
      mockRequest.params = {
        id: '123e4567-e89b-12d3-a456-426614174000'
      };
      const middleware = validate(schema, ValidationSource.PARAMS);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with generic error if unexpected error occurs', () => {
      // Setup
      const schema = z.object({
        data: z.string()
      });
      mockRequest.body = null; // Force an error
      const middleware = validate(schema);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('Validation failed');
    });
  });

  describe('validateMultiple', () => {
    it('should call next if all validations pass', () => {
      // Setup
      const bodySchema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      });
      const querySchema = z.object({
        page: z.string().transform(val => parseInt(val, 10))
      });
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123'
      };
      mockRequest.query = {
        page: '1'
      };
      const middleware = validateMultiple([
        { schema: bodySchema, source: ValidationSource.BODY },
        { schema: querySchema, source: ValidationSource.QUERY }
      ]);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({
        page: 1
      });
    });

    it('should call next with error if any validation fails', () => {
      // Setup
      const bodySchema = z.object({
        email: z.string().email(),
        password: z.string().min(6)
      });
      const querySchema = z.object({
        page: z.string().transform(val => parseInt(val, 10))
      });
      mockRequest.body = {
        email: 'invalid-email',
        password: 'password123'
      };
      mockRequest.query = {
        page: '1'
      };
      const middleware = validateMultiple([
        { schema: bodySchema, source: ValidationSource.BODY },
        { schema: querySchema, source: ValidationSource.QUERY }
      ]);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toContain('Validation error');
      expect(nextFunction.mock.calls[0][0].message).toContain('email: Invalid');
    });
  });

  describe('sanitize', () => {
    it('should remove fields not in the allowed list', () => {
      // Setup
      mockRequest.body = {
        email: 'test@example.com',
        password: 'password123',
        role: 'admin',
        extraField: 'should be removed'
      };
      const middleware = sanitize(['email', 'password', 'role']);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.body).toEqual({
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      });
      expect(mockRequest.body.extraField).toBeUndefined();
    });

    it('should sanitize query parameters', () => {
      // Setup
      mockRequest.query = {
        page: '1',
        limit: '10',
        extraParam: 'should be removed'
      };
      const middleware = sanitize(['page', 'limit'], ValidationSource.QUERY);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.query).toEqual({
        page: '1',
        limit: '10'
      });
      expect(mockRequest.query.extraParam).toBeUndefined();
    });

    it('should handle null or undefined data', () => {
      // Setup
      mockRequest.body = null;
      const middleware = sanitize(['email', 'password']);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.body).toBeNull();
    });

    it('should call next with error if unexpected error occurs', () => {
      // Setup
      mockRequest.body = Object.create(null);
      Object.defineProperty(mockRequest.body, 'problematic', {
        get: () => { throw new Error('Unexpected error'); }
      });
      const middleware = sanitize(['email', 'password']);

      // Execute
      middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('Sanitization failed');
    });
  });
});