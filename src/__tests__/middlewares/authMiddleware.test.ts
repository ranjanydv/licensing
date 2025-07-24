import { Request, Response } from 'express';
import { authenticate, optionalAuthenticate, verifyRefreshToken } from '../../middlewares/authMiddleware';
import { authService } from '../../services/auth.service';
import { AppError } from '../../middlewares/errorHandler';

// Mock auth service
jest.mock('../../services/auth.service');

describe('Authentication Middleware', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      headers: {},
      body: {}
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('authenticate', () => {
    it('should call next if token is valid', async () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'user-id',
        email: 'test@example.com',
        role: 'admin'
      });

      // Execute
      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        role: 'admin'
      });
    });

    it('should call next with error if no authorization header', async () => {
      // Execute
      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('No authentication token provided');
    });

    it('should call next with error if authorization header is not Bearer', async () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Basic invalid-token'
      };

      // Execute
      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('No authentication token provided');
    });

    it('should call next with error if token verification fails', async () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      (authService.verifyToken as jest.Mock).mockRejectedValue(
        new AppError('Token expired', 401)
      );

      // Execute
      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('invalid-token');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('Token expired');
    });

    it('should call next with generic error if unexpected error occurs', async () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      (authService.verifyToken as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      // Execute
      await authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('Authentication failed');
    });
  });

  describe('optionalAuthenticate', () => {
    it('should attach user to request if token is valid', async () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer valid-token'
      };

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'user-id',
        email: 'test@example.com',
        role: 'admin'
      });

      // Execute
      await optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-token');
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toEqual({
        id: 'user-id',
        email: 'test@example.com',
        role: 'admin'
      });
    });

    it('should call next without error if no authorization header', async () => {
      // Execute
      await optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should call next without error if authorization header is not Bearer', async () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Basic invalid-token'
      };

      // Execute
      await optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });

    it('should call next without error if token verification fails', async () => {
      // Setup
      mockRequest.headers = {
        authorization: 'Bearer invalid-token'
      };

      (authService.verifyToken as jest.Mock).mockRejectedValue(
        new AppError('Token expired', 401)
      );

      // Execute
      await optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('invalid-token');
      expect(nextFunction).toHaveBeenCalledWith();
      expect(mockRequest.user).toBeUndefined();
    });
  });

  describe('verifyRefreshToken', () => {
    it('should call next if refresh token is valid', async () => {
      // Setup
      mockRequest.body = {
        refreshToken: 'valid-refresh-token'
      };

      (authService.verifyToken as jest.Mock).mockResolvedValue({
        userId: 'user-id',
        email: 'test@example.com',
        role: 'admin'
      });

      // Execute
      await verifyRefreshToken(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if no refresh token provided', async () => {
      // Execute
      await verifyRefreshToken(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(400);
      expect(nextFunction.mock.calls[0][0].message).toBe('Refresh token is required');
    });

    it('should call next with error if refresh token verification fails', async () => {
      // Setup
      mockRequest.body = {
        refreshToken: 'invalid-refresh-token'
      };

      (authService.verifyToken as jest.Mock).mockRejectedValue(
        new AppError('Token expired', 401)
      );

      // Execute
      await verifyRefreshToken(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('invalid-refresh-token');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('Token expired');
    });

    it('should call next with generic error if unexpected error occurs', async () => {
      // Setup
      mockRequest.body = {
        refreshToken: 'valid-refresh-token'
      };

      (authService.verifyToken as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );

      // Execute
      await verifyRefreshToken(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.verifyToken).toHaveBeenCalledWith('valid-refresh-token');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('Invalid refresh token');
    });
  });
});