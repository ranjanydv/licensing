import mongoose from 'mongoose';
import { RoleService } from '../../services/role.service';
import { roleRepository } from '../../repositories/role.repository';
import { userRepository } from '../../repositories/user.repository';
import { AppError } from '../../middlewares/errorHandler';

// Mock repositories
jest.mock('../../repositories/role.repository');
jest.mock('../../repositories/user.repository');

describe('RoleService', () => {
  let roleService: RoleService;
  
  const mockRoleId = new mongoose.Types.ObjectId().toString();
  const mockAdminRoleId = new mongoose.Types.ObjectId().toString();
  
  const mockRole = {
    _id: mockRoleId,
    id: mockRoleId,
    name: 'support',
    permissions: ['view_users'],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockAdminRole = {
    _id: mockAdminRoleId,
    id: mockAdminRoleId,
    name: 'admin',
    permissions: ['manage_users', 'manage_roles'],
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    jest.clearAllMocks();
    roleService = new RoleService();
    
    // Mock repository methods
    (roleRepository.findAll as jest.Mock).mockResolvedValue([mockRole, mockAdminRole]);
    (roleRepository.findById as jest.Mock).mockImplementation((id) => {
      if (id === mockRoleId) return Promise.resolve(mockRole);
      if (id === mockAdminRoleId) return Promise.resolve(mockAdminRole);
      return Promise.resolve(null);
    });
    (roleRepository.findByName as jest.Mock).mockImplementation((name) => {
      if (name === 'support') return Promise.resolve(mockRole);
      if (name === 'admin') return Promise.resolve(mockAdminRole);
      return Promise.resolve(null);
    });
    (roleRepository.create as jest.Mock).mockResolvedValue(mockRole);
    (roleRepository.update as jest.Mock).mockResolvedValue(mockRole);
    (roleRepository.delete as jest.Mock).mockResolvedValue(true);
    (roleRepository.findByPermission as jest.Mock).mockResolvedValue([mockAdminRole]);
    
    (userRepository.findByRoleId as jest.Mock).mockResolvedValue([]);
  });

  describe('getAllRoles', () => {
    it('should get all roles', async () => {
      const result = await roleService.getAllRoles();
      
      expect(roleRepository.findAll).toHaveBeenCalledWith({}, {}, true);
      expect(result).toEqual([mockRole, mockAdminRole]);
    });

    it('should handle errors', async () => {
      (roleRepository.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.getAllRoles()).rejects.toThrow(AppError);
    });
  });

  describe('getRoleById', () => {
    it('should get role by ID', async () => {
      const result = await roleService.getRoleById(mockRoleId);
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId, true);
      expect(result).toEqual(mockRole);
    });

    it('should return null if role not found', async () => {
      const result = await roleService.getRoleById('nonexistent-id');
      
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      (roleRepository.findById as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.getRoleById(mockRoleId)).rejects.toThrow(AppError);
    });
  });

  describe('getRoleByName', () => {
    it('should get role by name', async () => {
      const result = await roleService.getRoleByName('support');
      
      expect(roleRepository.findByName).toHaveBeenCalledWith('support', true);
      expect(result).toEqual(mockRole);
    });

    it('should return null if role not found', async () => {
      const result = await roleService.getRoleByName('nonexistent');
      
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      (roleRepository.findByName as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.getRoleByName('support')).rejects.toThrow(AppError);
    });
  });

  describe('createRole', () => {
    const createRoleData = {
      name: 'support',
      permissions: ['view_users']
    };

    it('should create a new role', async () => {
      (roleRepository.findByName as jest.Mock).mockResolvedValue(null);
      
      const result = await roleService.createRole(createRoleData);
      
      expect(roleRepository.findByName).toHaveBeenCalledWith(createRoleData.name);
      expect(roleRepository.create).toHaveBeenCalledWith(createRoleData);
      expect(result).toEqual(mockRole);
    });

    it('should throw error if role already exists', async () => {
      await expect(roleService.createRole(createRoleData)).rejects.toThrow(AppError);
      expect(roleRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if role name is invalid', async () => {
      (roleRepository.findByName as jest.Mock).mockResolvedValue(null);
      
      await expect(roleService.createRole({
        name: 'invalid',
        permissions: ['view_users']
      })).rejects.toThrow(AppError);
      expect(roleRepository.create).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (roleRepository.findByName as jest.Mock).mockResolvedValue(null);
      (roleRepository.create as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.createRole(createRoleData)).rejects.toThrow(AppError);
    });
  });

  describe('updateRole', () => {
    const updateRoleData = {
      permissions: ['view_users', 'update_profile']
    };

    it('should update a role', async () => {
      const result = await roleService.updateRole(mockRoleId, updateRoleData);
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(roleRepository.update).toHaveBeenCalledWith(mockRoleId, updateRoleData);
      expect(result).toEqual(mockRole);
    });

    it('should throw error if role not found', async () => {
      await expect(roleService.updateRole('nonexistent-id', updateRoleData)).rejects.toThrow(AppError);
      expect(roleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if role name is invalid', async () => {
      await expect(roleService.updateRole(mockRoleId, {
        name: 'invalid'
      })).rejects.toThrow(AppError);
      expect(roleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if role name is already in use', async () => {
      await expect(roleService.updateRole(mockRoleId, {
        name: 'admin'
      })).rejects.toThrow(AppError);
      expect(roleRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (roleRepository.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.updateRole(mockRoleId, updateRoleData)).rejects.toThrow(AppError);
    });
  });

  describe('deleteRole', () => {
    it('should delete a role', async () => {
      const result = await roleService.deleteRole(mockRoleId);
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(userRepository.findByRoleId).toHaveBeenCalledWith(mockRoleId);
      expect(roleRepository.delete).toHaveBeenCalledWith(mockRoleId);
      expect(result).toBe(true);
    });

    it('should return false if role not found', async () => {
      (roleRepository.findById as jest.Mock).mockResolvedValue(null);
      
      const result = await roleService.deleteRole('nonexistent-id');
      
      expect(roleRepository.delete).not.toHaveBeenCalled();
      expect(result).toBe(false);
    });

    it('should throw error if role is assigned to users', async () => {
      (userRepository.findByRoleId as jest.Mock).mockResolvedValue([{ _id: 'user-id' }]);
      
      await expect(roleService.deleteRole(mockRoleId)).rejects.toThrow(AppError);
      expect(roleRepository.delete).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (roleRepository.delete as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.deleteRole(mockRoleId)).rejects.toThrow(AppError);
    });
  });

  describe('addPermission', () => {
    it('should add permission to role', async () => {
      const result = await roleService.addPermission(mockRoleId, 'new_permission');
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(roleRepository.update).toHaveBeenCalledWith(
        mockRoleId,
        { permissions: [...mockRole.permissions, 'new_permission'] }
      );
      expect(result).toEqual(mockRole);
    });

    it('should not update if role already has permission', async () => {
      const result = await roleService.addPermission(mockRoleId, 'view_users');
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(roleRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it('should throw error if role not found', async () => {
      await expect(roleService.addPermission('nonexistent-id', 'new_permission')).rejects.toThrow(AppError);
      expect(roleRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (roleRepository.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.addPermission(mockRoleId, 'new_permission')).rejects.toThrow(AppError);
    });
  });

  describe('removePermission', () => {
    it('should remove permission from role', async () => {
      const roleWithMultiplePermissions = {
        ...mockRole,
        permissions: ['view_users', 'update_profile']
      };
      (roleRepository.findById as jest.Mock).mockResolvedValue(roleWithMultiplePermissions);
      
      const result = await roleService.removePermission(mockRoleId, 'update_profile');
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(roleRepository.update).toHaveBeenCalledWith(
        mockRoleId,
        { permissions: ['view_users'] }
      );
      expect(result).toEqual(mockRole);
    });

    it('should not update if role does not have permission', async () => {
      const result = await roleService.removePermission(mockRoleId, 'nonexistent_permission');
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(roleRepository.update).not.toHaveBeenCalled();
      expect(result).toEqual(mockRole);
    });

    it('should throw error if role not found', async () => {
      await expect(roleService.removePermission('nonexistent-id', 'view_users')).rejects.toThrow(AppError);
      expect(roleRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if removing the last permission', async () => {
      await expect(roleService.removePermission(mockRoleId, 'view_users')).rejects.toThrow(AppError);
      expect(roleRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      const roleWithMultiplePermissions = {
        ...mockRole,
        permissions: ['view_users', 'update_profile']
      };
      (roleRepository.findById as jest.Mock).mockResolvedValue(roleWithMultiplePermissions);
      (roleRepository.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.removePermission(mockRoleId, 'update_profile')).rejects.toThrow(AppError);
    });
  });

  describe('hasPermission', () => {
    it('should return true if role has permission', async () => {
      const result = await roleService.hasPermission(mockRoleId, 'view_users');
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(result).toBe(true);
    });

    it('should return false if role does not have permission', async () => {
      const result = await roleService.hasPermission(mockRoleId, 'nonexistent_permission');
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(result).toBe(false);
    });

    it('should throw error if role not found', async () => {
      await expect(roleService.hasPermission('nonexistent-id', 'view_users')).rejects.toThrow(AppError);
    });

    it('should handle errors', async () => {
      (roleRepository.findById as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.hasPermission(mockRoleId, 'view_users')).rejects.toThrow(AppError);
    });
  });

  describe('getRolesByPermission', () => {
    it('should get roles by permission', async () => {
      const result = await roleService.getRolesByPermission('manage_users');
      
      expect(roleRepository.findByPermission).toHaveBeenCalledWith('manage_users', true);
      expect(result).toEqual([mockAdminRole]);
    });

    it('should handle errors', async () => {
      (roleRepository.findByPermission as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(roleService.getRolesByPermission('manage_users')).rejects.toThrow(AppError);
    });
  });
});