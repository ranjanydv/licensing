import { Request, Response } from 'express';
import { 
  register, 
  login, 
  logout, 
  refreshToken, 
  getCurrentUser, 
  changePassword 
} from '../../controllers/auth.controller';
import { authService } from '../../services/auth.service';
import { AuthError } from '../../middlewares/errorHandler';

// Mock auth service
jest.mock('../../services/auth.service');

describe('AuthController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      headers: {},
      user: undefined
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a user and return success response', async () => {
      // Setup
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123!',
        firstName: 'Test',
        lastName: 'User'
      };
      
      const mockResult = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'support'
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      };
      
      (authService.register as jest.Mock).mockResolvedValue(mockResult);

      // Execute
      await register(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.register).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockResult.user,
          tokens: mockResult.tokens
        }
      });
    });

    it('should pass error to next function if registration fails', async () => {
      // Setup
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123!'
      };
      
      const error = new Error('Registration failed');
      (authService.register as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(register(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Registration failed');
    });
  });

  describe('login', () => {
    it('should login a user and return success response', async () => {
      // Setup
      mockRequest.body = {
        email: 'test@example.com',
        password: 'Password123!'
      };
      
      const mockResult = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'support'
        },
        tokens: {
          accessToken: 'access-token',
          refreshToken: 'refresh-token'
        }
      };
      
      (authService.login as jest.Mock).mockResolvedValue(mockResult);

      // Execute
      await login(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockResult.user,
          tokens: mockResult.tokens
        }
      });
    });

    it('should pass error to next function if login fails', async () => {
      // Setup
      mockRequest.body = {
        email: 'test@example.com',
        password: 'WrongPassword'
      };
      
      const error = new AuthError('Invalid email or password');
      (authService.login as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(login(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Invalid email or password');
    });
  });

  describe('logout', () => {
    it('should logout a user and return success response', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'support'
      };
      mockRequest.headers = {
        authorization: 'Bearer access-token'
      };
      
      (authService.logout as jest.Mock).mockResolvedValue(true);

      // Execute
      await logout(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.logout).toHaveBeenCalledWith('user-id', 'access-token');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Logged out successfully'
      });
    });

    it('should throw error if user is not authenticated', async () => {
      // Execute & Assert
      await expect(logout(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error if no token is provided', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'support'
      };

      // Execute & Assert
      await expect(logout(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('No authentication token provided');
    });
  });

  describe('refreshToken', () => {
    it('should refresh token and return success response', async () => {
      // Setup
      mockRequest.body = {
        refreshToken: 'refresh-token'
      };
      
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token'
      };
      
      (authService.refreshToken as jest.Mock).mockResolvedValue(mockTokens);

      // Execute
      await refreshToken(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(authService.refreshToken).toHaveBeenCalledWith('refresh-token');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          tokens: mockTokens
        }
      });
    });

    it('should pass error to next function if token refresh fails', async () => {
      // Setup
      mockRequest.body = {
        refreshToken: 'invalid-refresh-token'
      };
      
      const error = new AuthError('Invalid refresh token');
      (authService.refreshToken as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(refreshToken(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Invalid refresh token');
    });
  });

  describe('getCurrentUser', () => {
    it('should return current user profile', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'support'
      };

      // Execute
      await getCurrentUser(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockRequest.user
        }
      });
    });

    it('should throw error if user is not authenticated', async () => {
      // Execute & Assert
      await expect(getCurrentUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Authentication required');
    });
  });

  describe('changePassword', () => {
    it('should change password and return success response', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'support'
      };
      mockRequest.body = {
        currentPassword: 'CurrentPassword123!',
        newPassword: 'NewPassword123!'
      };

      // Execute
      await changePassword(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Password changed successfully'
      });
    });

    it('should throw error if user is not authenticated', async () => {
      // Execute & Assert
      await expect(changePassword(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Authentication required');
    });

    it('should throw error if required fields are missing', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'support'
      };
      mockRequest.body = {
        currentPassword: 'CurrentPassword123!'
        // Missing newPassword
      };

      // Execute & Assert
      await expect(changePassword(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Current password and new password are required');
    });
  });
});