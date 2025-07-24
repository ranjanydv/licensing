import { Request, Response } from 'express';
import { 
  getAllUsers, 
  getUserById, 
  createUser, 
  updateUser, 
  deleteUser, 
  assignRole, 
  getUsersByRole, 
  activateUser, 
  deactivateUser 
} from '../../controllers/user.controller';
import { userService } from '../../services/user.service';
import { AuthError, NotFoundError } from '../../middlewares/errorHandler';

// Mock user service
jest.mock('../../services/user.service');

describe('UserController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {},
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

  describe('getAllUsers', () => {
    it('should get all users with pagination and return success response', async () => {
      // Setup
      mockRequest.query = {
        page: '2',
        limit: '5'
      };
      
      const mockResult = {
        users: [
          { id: 'user-1', email: 'user1@example.com' },
          { id: 'user-2', email: 'user2@example.com' }
        ],
        total: 10,
        page: 2,
        limit: 5,
        totalPages: 2
      };
      
      (userService.getAllUsers as jest.Mock).mockResolvedValue(mockResult);

      // Execute
      await getAllUsers(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.getAllUsers).toHaveBeenCalledWith(2, 5);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: mockResult.users,
          pagination: {
            total: mockResult.total,
            page: mockResult.page,
            limit: mockResult.limit,
            totalPages: mockResult.totalPages
          }
        }
      });
    });

    it('should use default pagination values if not provided', async () => {
      // Setup
      const mockResult = {
        users: [{ id: 'user-1', email: 'user1@example.com' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      };
      
      (userService.getAllUsers as jest.Mock).mockResolvedValue(mockResult);

      // Execute
      await getAllUsers(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.getAllUsers).toHaveBeenCalledWith(1, 10);
    });

    it('should pass error to next function if getting users fails', async () => {
      // Setup
      const error = new Error('Database error');
      (userService.getAllUsers as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(getAllUsers(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Database error');
    });
  });

  describe('getUserById', () => {
    it('should get user by ID and return success response', async () => {
      // Setup
      mockRequest.params = {
        id: 'user-id'
      };
      
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'support'
      };
      
      (userService.getUserById as jest.Mock).mockResolvedValue(mockUser);

      // Execute
      await getUserById(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.getUserById).toHaveBeenCalledWith('user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser
        }
      });
    });

    it('should throw NotFoundError if user does not exist', async () => {
      // Setup
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      
      (userService.getUserById as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(getUserById(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createUser', () => {
    it('should create a user and return success response', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.body = {
        email: 'new@example.com',
        password: 'Password123!',
        firstName: 'New',
        lastName: 'User',
        role: 'support'
      };
      
      const mockUser = {
        id: 'new-user-id',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'User',
        role: 'support'
      };
      
      (userService.createUser as jest.Mock).mockResolvedValue(mockUser);

      // Execute
      await createUser(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.createUser).toHaveBeenCalledWith(mockRequest.body, 'admin-id');
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser
        }
      });
    });

    it('should throw AuthError if user is not authenticated', async () => {
      // Execute & Assert
      await expect(createUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(AuthError);
    });
  });

  describe('updateUser', () => {
    it('should update a user and return success response', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'user-id'
      };
      mockRequest.body = {
        firstName: 'Updated',
        lastName: 'User'
      };
      
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'Updated',
        lastName: 'User',
        role: 'support'
      };
      
      (userService.updateUser as jest.Mock).mockResolvedValue(mockUser);

      // Execute
      await updateUser(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.updateUser).toHaveBeenCalledWith('user-id', mockRequest.body, 'admin-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser
        }
      });
    });

    it('should throw AuthError if user is not authenticated', async () => {
      // Setup
      mockRequest.params = {
        id: 'user-id'
      };

      // Execute & Assert
      await expect(updateUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(AuthError);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      
      (userService.updateUser as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(updateUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user and return success response', async () => {
      // Setup
      mockRequest.params = {
        id: 'user-id'
      };
      
      (userService.deleteUser as jest.Mock).mockResolvedValue(true);

      // Execute
      await deleteUser(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.deleteUser).toHaveBeenCalledWith('user-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'User deleted successfully'
      });
    });

    it('should throw NotFoundError if user does not exist', async () => {
      // Setup
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      
      (userService.deleteUser as jest.Mock).mockResolvedValue(false);

      // Execute & Assert
      await expect(deleteUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('assignRole', () => {
    it('should assign role to user and return success response', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'user-id'
      };
      mockRequest.body = {
        roleId: 'role-id'
      };
      
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'role-id'
      };
      
      (userService.assignRole as jest.Mock).mockResolvedValue(mockUser);

      // Execute
      await assignRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.assignRole).toHaveBeenCalledWith('user-id', 'role-id', 'admin-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser
        }
      });
    });

    it('should throw AuthError if user is not authenticated', async () => {
      // Setup
      mockRequest.params = {
        id: 'user-id'
      };
      mockRequest.body = {
        roleId: 'role-id'
      };

      // Execute & Assert
      await expect(assignRole(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(AuthError);
    });

    it('should throw AppError if roleId is not provided', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'user-id'
      };
      mockRequest.body = {};

      // Execute & Assert
      await expect(assignRole(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Role ID is required');
    });

    it('should throw NotFoundError if user does not exist', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      mockRequest.body = {
        roleId: 'role-id'
      };
      
      (userService.assignRole as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(assignRole(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role and return success response', async () => {
      // Setup
      mockRequest.params = {
        roleId: 'role-id'
      };
      mockRequest.query = {
        page: '2',
        limit: '5'
      };
      
      const mockResult = {
        users: [
          { id: 'user-1', email: 'user1@example.com', role: 'role-id' },
          { id: 'user-2', email: 'user2@example.com', role: 'role-id' }
        ],
        total: 10,
        page: 2,
        limit: 5,
        totalPages: 2
      };
      
      (userService.getUsersByRole as jest.Mock).mockResolvedValue(mockResult);

      // Execute
      await getUsersByRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.getUsersByRole).toHaveBeenCalledWith('role-id', 2, 5);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          users: mockResult.users,
          pagination: {
            total: mockResult.total,
            page: mockResult.page,
            limit: mockResult.limit,
            totalPages: mockResult.totalPages
          }
        }
      });
    });
  });

  describe('activateUser', () => {
    it('should activate a user and return success response', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'user-id'
      };
      
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'support',
        isActive: true
      };
      
      (userService.activateUser as jest.Mock).mockResolvedValue(mockUser);

      // Execute
      await activateUser(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.activateUser).toHaveBeenCalledWith('user-id', 'admin-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser
        }
      });
    });

    it('should throw AuthError if user is not authenticated', async () => {
      // Setup
      mockRequest.params = {
        id: 'user-id'
      };

      // Execute & Assert
      await expect(activateUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(AuthError);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      
      (userService.activateUser as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(activateUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate a user and return success response', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'user-id'
      };
      
      const mockUser = {
        id: 'user-id',
        email: 'user@example.com',
        firstName: 'Test',
        lastName: 'User',
        role: 'support',
        isActive: false
      };
      
      (userService.deactivateUser as jest.Mock).mockResolvedValue(mockUser);

      // Execute
      await deactivateUser(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(userService.deactivateUser).toHaveBeenCalledWith('user-id', 'admin-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          user: mockUser
        }
      });
    });

    it('should throw AuthError if user is not authenticated', async () => {
      // Setup
      mockRequest.params = {
        id: 'user-id'
      };

      // Execute & Assert
      await expect(deactivateUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(AuthError);
    });

    it('should throw NotFoundError if user does not exist', async () => {
      // Setup
      mockRequest.user = {
        id: 'admin-id',
        email: 'admin@example.com',
        role: 'admin'
      };
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      
      (userService.deactivateUser as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(deactivateUser(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });
});