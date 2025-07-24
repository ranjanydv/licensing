import mongoose from 'mongoose';
import { UserService } from '../../services/user.service';
import { userRepository } from '../../repositories/user.repository';
import { roleRepository } from '../../repositories/role.repository';
import { authService } from '../../services/auth.service';
import { AppError } from '../../middlewares/errorHandler';

// Mock repositories and services
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/role.repository');
jest.mock('../../services/auth.service');

describe('UserService', () => {
  let userService: UserService;
  
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockRoleId = new mongoose.Types.ObjectId().toString();
  const mockAdminRoleId = new mongoose.Types.ObjectId().toString();
  
  const mockUser = {
    _id: mockUserId,
    id: mockUserId,
    email: 'test@example.com',
    password: 'hashedPassword123',
    firstName: 'Test',
    lastName: 'User',
    role: mockRoleId,
    isActive: true,
    lastLogin: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
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
    userService = new UserService();
    
    // Mock repository methods
    (userRepository.findAll as jest.Mock).mockResolvedValue([mockUser]);
    (userRepository.count as jest.Mock).mockResolvedValue(1);
    (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
    (userRepository.update as jest.Mock).mockResolvedValue(mockUser);
    (userRepository.delete as jest.Mock).mockResolvedValue(true);
    (userRepository.findByRoleId as jest.Mock).mockResolvedValue([mockUser]);
    
    (roleRepository.findById as jest.Mock).mockImplementation((id) => {
      if (id === mockRoleId) return Promise.resolve(mockRole);
      if (id === mockAdminRoleId) return Promise.resolve(mockAdminRole);
      return Promise.resolve(null);
    });
    
    (authService.hashPassword as jest.Mock).mockResolvedValue('hashedPassword123');
  });

  describe('getAllUsers', () => {
    it('should get all users with pagination', async () => {
      const result = await userService.getAllUsers(1, 10);
      
      expect(userRepository.findAll).toHaveBeenCalledWith(
        {},
        expect.objectContaining({ skip: 0, limit: 10 }),
        true
      );
      expect(userRepository.count).toHaveBeenCalled();
      
      expect(result).toEqual({
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should handle errors', async () => {
      (userRepository.findAll as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.getAllUsers()).rejects.toThrow(AppError);
    });
  });

  describe('getUserById', () => {
    it('should get user by ID', async () => {
      const result = await userService.getUserById(mockUserId);
      
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId, true);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      
      const result = await userService.getUserById(mockUserId);
      
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      (userRepository.findById as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.getUserById(mockUserId)).rejects.toThrow(AppError);
    });
  });

  describe('getUserByEmail', () => {
    it('should get user by email', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await userService.getUserByEmail('test@example.com');
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith('test@example.com', true);
      expect(result).toEqual(mockUser);
    });

    it('should return null if user not found', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      
      const result = await userService.getUserByEmail('nonexistent@example.com');
      
      expect(result).toBeNull();
    });

    it('should handle errors', async () => {
      (userRepository.findByEmail as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.getUserByEmail('test@example.com')).rejects.toThrow(AppError);
    });
  });

  describe('createUser', () => {
    const createUserData = {
      email: 'new@example.com',
      password: 'Password123!',
      firstName: 'New',
      lastName: 'User',
      role: mockRoleId
    };

    it('should create a new user', async () => {
      const result = await userService.createUser(createUserData, 'admin-id');
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(createUserData.email);
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(authService.hashPassword).toHaveBeenCalledWith(createUserData.password);
      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        email: createUserData.email,
        password: 'hashedPassword123',
        firstName: createUserData.firstName,
        lastName: createUserData.lastName,
        role: mockRoleId,
        isActive: true
      }));
      
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user already exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      await expect(userService.createUser(createUserData, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should throw error if role not found', async () => {
      (roleRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.createUser(createUserData, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.create).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (userRepository.create as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.createUser(createUserData, 'admin-id')).rejects.toThrow(AppError);
    });
  });

  describe('updateUser', () => {
    const updateUserData = {
      firstName: 'Updated',
      lastName: 'User',
      email: 'updated@example.com'
    };

    it('should update a user', async () => {
      const result = await userService.updateUser(mockUserId, updateUserData, 'admin-id');
      
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(userRepository.findByEmail).toHaveBeenCalledWith(updateUserData.email);
      expect(userRepository.update).toHaveBeenCalledWith(mockUserId, updateUserData);
      
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.updateUser(mockUserId, updateUserData, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if email is already in use', async () => {
      const anotherUser = { ...mockUser, _id: new mongoose.Types.ObjectId() };
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(anotherUser);
      
      await expect(userService.updateUser(mockUserId, updateUserData, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if role not found', async () => {
      const updateWithRole = { ...updateUserData, role: 'nonexistent-role' };
      (roleRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.updateUser(mockUserId, updateWithRole, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (userRepository.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.updateUser(mockUserId, updateUserData, 'admin-id')).rejects.toThrow(AppError);
    });
  });

  describe('deleteUser', () => {
    it('should delete a user', async () => {
      const result = await userService.deleteUser(mockUserId);
      
      expect(userRepository.delete).toHaveBeenCalledWith(mockUserId);
      expect(result).toBe(true);
    });

    it('should return false if user not found', async () => {
      (userRepository.delete as jest.Mock).mockResolvedValue(false);
      
      const result = await userService.deleteUser(mockUserId);
      
      expect(result).toBe(false);
    });

    it('should handle errors', async () => {
      (userRepository.delete as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.deleteUser(mockUserId)).rejects.toThrow(AppError);
    });
  });

  describe('assignRole', () => {
    it('should assign a role to a user', async () => {
      const result = await userService.assignRole(mockUserId, mockAdminRoleId, 'admin-id');
      
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(roleRepository.findById).toHaveBeenCalledWith(mockAdminRoleId);
      expect(userRepository.update).toHaveBeenCalledWith(mockUserId, { role: mockAdminRoleId });
      
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.assignRole(mockUserId, mockAdminRoleId, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should throw error if role not found', async () => {
      (roleRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.assignRole(mockUserId, 'nonexistent-role', 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (userRepository.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.assignRole(mockUserId, mockAdminRoleId, 'admin-id')).rejects.toThrow(AppError);
    });
  });

  describe('getUsersByRole', () => {
    it('should get users by role', async () => {
      const result = await userService.getUsersByRole(mockRoleId);
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(userRepository.findByRoleId).toHaveBeenCalledWith(
        mockRoleId,
        expect.objectContaining({ skip: 0, limit: 10 }),
        true
      );
      expect(userRepository.count).toHaveBeenCalledWith({ role: mockRoleId });
      
      expect(result).toEqual({
        users: [mockUser],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1
      });
    });

    it('should throw error if role not found', async () => {
      (roleRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.getUsersByRole('nonexistent-role')).rejects.toThrow(AppError);
      expect(userRepository.findByRoleId).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (userRepository.findByRoleId as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.getUsersByRole(mockRoleId)).rejects.toThrow(AppError);
    });
  });

  describe('activateUser', () => {
    it('should activate a user', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
      
      const result = await userService.activateUser(mockUserId, 'admin-id');
      
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(userRepository.update).toHaveBeenCalledWith(mockUserId, { isActive: true });
      
      expect(result).toEqual(mockUser);
    });

    it('should not update if user is already active', async () => {
      const result = await userService.activateUser(mockUserId, 'admin-id');
      
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(userRepository.update).not.toHaveBeenCalled();
      
      expect(result).toEqual(mockUser);
    });

    it('should throw error if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.activateUser(mockUserId, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (userRepository.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      (userRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
      
      await expect(userService.activateUser(mockUserId, 'admin-id')).rejects.toThrow(AppError);
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate a user', async () => {
      const result = await userService.deactivateUser(mockUserId, 'admin-id');
      
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(userRepository.update).toHaveBeenCalledWith(mockUserId, { isActive: false });
      
      expect(result).toEqual(mockUser);
    });

    it('should not update if user is already inactive', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({ ...mockUser, isActive: false });
      
      const result = await userService.deactivateUser(mockUserId, 'admin-id');
      
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(userRepository.update).not.toHaveBeenCalled();
      
      expect(result).toEqual({ ...mockUser, isActive: false });
    });

    it('should throw error if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(userService.deactivateUser(mockUserId, 'admin-id')).rejects.toThrow(AppError);
      expect(userRepository.update).not.toHaveBeenCalled();
    });

    it('should handle errors', async () => {
      (userRepository.update as jest.Mock).mockRejectedValue(new Error('Database error'));
      
      await expect(userService.deactivateUser(mockUserId, 'admin-id')).rejects.toThrow(AppError);
    });
  });
});