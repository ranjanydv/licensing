import { Request, Response } from 'express';
import { 
  authorize, 
  requirePermission, 
  requirePermissions, 
  requireOwnership,
  authorizeRoleOrPermissions
} from '../../middlewares/authorizationMiddleware';
import { roleService } from '../../services/role.service';
import { AppError } from '../../middlewares/errorHandler';
import { AuthRequest } from '../../interfaces/auth.interface';

// Mock role service
jest.mock('../../services/role.service');

describe('Authorization Middleware', () => {
  let mockRequest: Partial<AuthRequest>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      user: {
        id: 'user-id',
        email: 'test@example.com',
        role: 'admin'
      }
    };
    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('authorize', () => {
    it('should call next if user has allowed role', async () => {
      // Setup
      const middleware = authorize(['admin', 'support']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if user is not authenticated', async () => {
      // Setup
      mockRequest.user = undefined;
      const middleware = authorize(['admin', 'support']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should call next with error if user does not have allowed role', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user'
      };
      const middleware = authorize(['admin', 'support']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('You do not have permission to perform this action');
    });

    it('should call next with generic error if unexpected error occurs', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: null as any // Force an error
      };
      const middleware = authorize(['admin', 'support']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('Authorization failed');
    });
  });

  describe('requirePermission', () => {
    it('should call next if user role has required permission', async () => {
      // Setup
      (roleService.getRoleByName as jest.Mock).mockResolvedValue({
        name: 'admin',
        permissions: ['create_user', 'update_user', 'delete_user']
      });
      const middleware = requirePermission('create_user');

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('admin');
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if user is not authenticated', async () => {
      // Setup
      mockRequest.user = undefined;
      const middleware = requirePermission('create_user');

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should call next with error if user role not found', async () => {
      // Setup
      (roleService.getRoleByName as jest.Mock).mockResolvedValue(null);
      const middleware = requirePermission('create_user');

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('admin');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(500);
      expect(nextFunction.mock.calls[0][0].message).toBe('User role not found');
    });

    it('should call next with error if user role does not have required permission', async () => {
      // Setup
      (roleService.getRoleByName as jest.Mock).mockResolvedValue({
        name: 'admin',
        permissions: ['update_user', 'delete_user']
      });
      const middleware = requirePermission('create_user');

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('admin');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe("Permission 'create_user' required");
    });

    it('should call next with generic error if unexpected error occurs', async () => {
      // Setup
      (roleService.getRoleByName as jest.Mock).mockRejectedValue(
        new Error('Unexpected error')
      );
      const middleware = requirePermission('create_user');

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('admin');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('Authorization failed');
    });
  });

  describe('requirePermissions', () => {
    it('should call next if user role has all required permissions', async () => {
      // Setup
      (roleService.getRoleByName as jest.Mock).mockResolvedValue({
        name: 'admin',
        permissions: ['create_user', 'update_user', 'delete_user']
      });
      const middleware = requirePermissions(['create_user', 'update_user']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('admin');
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if user role does not have all required permissions', async () => {
      // Setup
      (roleService.getRoleByName as jest.Mock).mockResolvedValue({
        name: 'admin',
        permissions: ['create_user', 'update_user']
      });
      const middleware = requirePermissions(['create_user', 'update_user', 'delete_user']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('admin');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('Missing required permissions: delete_user');
    });
  });

  describe('requireOwnership', () => {
    it('should call next if user is the resource owner', async () => {
      // Setup
      const getResourceOwnerId = jest.fn().mockReturnValue('user-id');
      const middleware = requireOwnership(getResourceOwnerId);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next if user is the resource owner (async)', async () => {
      // Setup
      const getResourceOwnerId = jest.fn().mockResolvedValue('user-id');
      const middleware = requireOwnership(getResourceOwnerId);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if user is not authenticated', async () => {
      // Setup
      mockRequest.user = undefined;
      const getResourceOwnerId = jest.fn();
      const middleware = requireOwnership(getResourceOwnerId);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(getResourceOwnerId).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(401);
      expect(nextFunction.mock.calls[0][0].message).toBe('Authentication required');
    });

    it('should call next with error if user is not the resource owner', async () => {
      // Setup
      const getResourceOwnerId = jest.fn().mockReturnValue('other-user-id');
      const middleware = requireOwnership(getResourceOwnerId);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('You do not have permission to access this resource');
    });

    it('should call next with generic error if unexpected error occurs', async () => {
      // Setup
      const getResourceOwnerId = jest.fn().mockImplementation(() => {
        throw new Error('Unexpected error');
      });
      const middleware = requireOwnership(getResourceOwnerId);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(getResourceOwnerId).toHaveBeenCalledWith(mockRequest);
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('Authorization failed');
    });
  });

  describe('authorizeRoleOrPermissions', () => {
    it('should call next if user has allowed role', async () => {
      // Setup
      const middleware = authorizeRoleOrPermissions(['admin', 'support'], ['create_user']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).not.toHaveBeenCalled();
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next if user role has all required permissions', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user'
      };
      (roleService.getRoleByName as jest.Mock).mockResolvedValue({
        name: 'user',
        permissions: ['create_user', 'update_user']
      });
      const middleware = authorizeRoleOrPermissions(['admin'], ['create_user', 'update_user']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('user');
      expect(nextFunction).toHaveBeenCalledWith();
    });

    it('should call next with error if user does not have allowed role or required permissions', async () => {
      // Setup
      mockRequest.user = {
        id: 'user-id',
        email: 'test@example.com',
        role: 'user'
      };
      (roleService.getRoleByName as jest.Mock).mockResolvedValue({
        name: 'user',
        permissions: ['view_users']
      });
      const middleware = authorizeRoleOrPermissions(['admin'], ['create_user', 'update_user']);

      // Execute
      await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleByName).toHaveBeenCalledWith('user');
      expect(nextFunction).toHaveBeenCalledWith(expect.any(AppError));
      expect(nextFunction.mock.calls[0][0].statusCode).toBe(403);
      expect(nextFunction.mock.calls[0][0].message).toBe('You do not have permission to perform this action');
    });
  });
});