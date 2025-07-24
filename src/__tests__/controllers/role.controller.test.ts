import { Request, Response } from 'express';
import { 
  getAllRoles, 
  getRoleById, 
  createRole, 
  updateRole, 
  deleteRole, 
  addPermission, 
  removePermission, 
  getRolesByPermission 
} from '../../controllers/role.controller';
import { roleService } from '../../services/role.service';
import { AppError, NotFoundError } from '../../middlewares/errorHandler';

// Mock role service
jest.mock('../../services/role.service');

describe('RoleController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: jest.Mock;

  beforeEach(() => {
    mockRequest = {
      body: {},
      params: {},
      query: {}
    };
    mockResponse = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
    nextFunction = jest.fn();

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('getAllRoles', () => {
    it('should get all roles and return success response', async () => {
      // Setup
      const mockRoles = [
        { id: 'role-1', name: 'admin', permissions: ['manage_users'] },
        { id: 'role-2', name: 'support', permissions: ['view_users'] }
      ];
      
      (roleService.getAllRoles as jest.Mock).mockResolvedValue(mockRoles);

      // Execute
      await getAllRoles(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getAllRoles).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          roles: mockRoles
        }
      });
    });

    it('should pass error to next function if getting roles fails', async () => {
      // Setup
      const error = new Error('Database error');
      (roleService.getAllRoles as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(getAllRoles(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Database error');
    });
  });

  describe('getRoleById', () => {
    it('should get role by ID and return success response', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id'
      };
      
      const mockRole = {
        id: 'role-id',
        name: 'admin',
        permissions: ['manage_users', 'manage_roles']
      };
      
      (roleService.getRoleById as jest.Mock).mockResolvedValue(mockRole);

      // Execute
      await getRoleById(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRoleById).toHaveBeenCalledWith('role-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          role: mockRole
        }
      });
    });

    it('should throw NotFoundError if role does not exist', async () => {
      // Setup
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      
      (roleService.getRoleById as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(getRoleById(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('createRole', () => {
    it('should create a role and return success response', async () => {
      // Setup
      mockRequest.body = {
        name: 'admin',
        permissions: ['manage_users', 'manage_roles']
      };
      
      const mockRole = {
        id: 'role-id',
        name: 'admin',
        permissions: ['manage_users', 'manage_roles']
      };
      
      (roleService.createRole as jest.Mock).mockResolvedValue(mockRole);

      // Execute
      await createRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.createRole).toHaveBeenCalledWith(mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          role: mockRole
        }
      });
    });

    it('should pass error to next function if creating role fails', async () => {
      // Setup
      mockRequest.body = {
        name: 'invalid',
        permissions: ['manage_users']
      };
      
      const error = new AppError('Role name must be either admin or support', 400);
      (roleService.createRole as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(createRole(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Role name must be either admin or support');
    });
  });

  describe('updateRole', () => {
    it('should update a role and return success response', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id'
      };
      mockRequest.body = {
        permissions: ['manage_users', 'manage_roles', 'new_permission']
      };
      
      const mockRole = {
        id: 'role-id',
        name: 'admin',
        permissions: ['manage_users', 'manage_roles', 'new_permission']
      };
      
      (roleService.updateRole as jest.Mock).mockResolvedValue(mockRole);

      // Execute
      await updateRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.updateRole).toHaveBeenCalledWith('role-id', mockRequest.body);
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          role: mockRole
        }
      });
    });

    it('should throw NotFoundError if role does not exist', async () => {
      // Setup
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      mockRequest.body = {
        permissions: ['manage_users']
      };
      
      (roleService.updateRole as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(updateRole(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role and return success response', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id'
      };
      
      (roleService.deleteRole as jest.Mock).mockResolvedValue(true);

      // Execute
      await deleteRole(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.deleteRole).toHaveBeenCalledWith('role-id');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        message: 'Role deleted successfully'
      });
    });

    it('should throw NotFoundError if role does not exist', async () => {
      // Setup
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      
      (roleService.deleteRole as jest.Mock).mockResolvedValue(false);

      // Execute & Assert
      await expect(deleteRole(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });

    it('should pass error to next function if deleting role fails', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id'
      };
      
      const error = new AppError('Cannot delete role that is assigned to users', 400);
      (roleService.deleteRole as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(deleteRole(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Cannot delete role that is assigned to users');
    });
  });

  describe('addPermission', () => {
    it('should add permission to role and return success response', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id'
      };
      mockRequest.body = {
        permission: 'new_permission'
      };
      
      const mockRole = {
        id: 'role-id',
        name: 'admin',
        permissions: ['manage_users', 'manage_roles', 'new_permission']
      };
      
      (roleService.addPermission as jest.Mock).mockResolvedValue(mockRole);

      // Execute
      await addPermission(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.addPermission).toHaveBeenCalledWith('role-id', 'new_permission');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          role: mockRole
        }
      });
    });

    it('should throw AppError if permission is not provided', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id'
      };
      mockRequest.body = {};

      // Execute & Assert
      await expect(addPermission(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Permission is required');
    });

    it('should throw NotFoundError if role does not exist', async () => {
      // Setup
      mockRequest.params = {
        id: 'nonexistent-id'
      };
      mockRequest.body = {
        permission: 'new_permission'
      };
      
      (roleService.addPermission as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(addPermission(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });
  });

  describe('removePermission', () => {
    it('should remove permission from role and return success response', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id',
        permission: 'manage_roles'
      };
      
      const mockRole = {
        id: 'role-id',
        name: 'admin',
        permissions: ['manage_users']
      };
      
      (roleService.removePermission as jest.Mock).mockResolvedValue(mockRole);

      // Execute
      await removePermission(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.removePermission).toHaveBeenCalledWith('role-id', 'manage_roles');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          role: mockRole
        }
      });
    });

    it('should throw NotFoundError if role does not exist', async () => {
      // Setup
      mockRequest.params = {
        id: 'nonexistent-id',
        permission: 'manage_roles'
      };
      
      (roleService.removePermission as jest.Mock).mockResolvedValue(null);

      // Execute & Assert
      await expect(removePermission(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow(NotFoundError);
    });

    it('should pass error to next function if removing permission fails', async () => {
      // Setup
      mockRequest.params = {
        id: 'role-id',
        permission: 'manage_users'
      };
      
      const error = new AppError('Role must have at least one permission', 400);
      (roleService.removePermission as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(removePermission(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Role must have at least one permission');
    });
  });

  describe('getRolesByPermission', () => {
    it('should get roles by permission and return success response', async () => {
      // Setup
      mockRequest.params = {
        permission: 'manage_users'
      };
      
      const mockRoles = [
        { id: 'role-1', name: 'admin', permissions: ['manage_users', 'manage_roles'] }
      ];
      
      (roleService.getRolesByPermission as jest.Mock).mockResolvedValue(mockRoles);

      // Execute
      await getRolesByPermission(mockRequest as Request, mockResponse as Response, nextFunction);

      // Assert
      expect(roleService.getRolesByPermission).toHaveBeenCalledWith('manage_users');
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: 'success',
        data: {
          roles: mockRoles
        }
      });
    });

    it('should pass error to next function if getting roles fails', async () => {
      // Setup
      mockRequest.params = {
        permission: 'manage_users'
      };
      
      const error = new Error('Database error');
      (roleService.getRolesByPermission as jest.Mock).mockRejectedValue(error);

      // Execute & Assert
      await expect(getRolesByPermission(mockRequest as Request, mockResponse as Response, nextFunction))
        .rejects.toThrow('Database error');
    });
  });
});