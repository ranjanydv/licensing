import mongoose from 'mongoose';
import { UserModel } from '../../models/user.model';
import { userRepository } from '../../repositories/user.repository';
import { RoleModel } from '../../models/role.model';

describe('UserRepository', () => {
  const mockRoleId = new mongoose.Types.ObjectId().toString();
  const mockAdminRoleId = new mongoose.Types.ObjectId().toString();
  
  const mockUserData = {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    role: mockRoleId,
    isActive: true
  };

  const mockAdminData = {
    email: 'admin@example.com',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
    role: mockAdminRoleId,
    isActive: true
  };

  beforeEach(async () => {
    // Create mock roles
    await RoleModel.create({
      _id: mockRoleId,
      name: 'support',
      permissions: ['view_users']
    });

    await RoleModel.create({
      _id: mockAdminRoleId,
      name: 'admin',
      permissions: ['manage_users', 'manage_roles']
    });
  });

  afterEach(async () => {
    await UserModel.deleteMany({});
    await RoleModel.deleteMany({});
  });

  describe('create', () => {
    it('should create a user successfully', async () => {
      const user = await userRepository.create(mockUserData);
      
      expect(user._id).toBeDefined();
      expect(user.email).toBe(mockUserData.email.toLowerCase());
      expect(user.firstName).toBe(mockUserData.firstName);
      expect(user.lastName).toBe(mockUserData.lastName);
      expect(user.role.toString()).toBe(mockRoleId);
      expect(user.isActive).toBe(true);
    });
  });

  describe('findByEmail', () => {
    it('should find a user by email', async () => {
      await userRepository.create(mockUserData);
      
      const user = await userRepository.findByEmail(mockUserData.email);
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe(mockUserData.email.toLowerCase());
    });

    it('should return null if user not found by email', async () => {
      const user = await userRepository.findByEmail('nonexistent@example.com');
      
      expect(user).toBeNull();
    });

    it('should find a user by email case-insensitively', async () => {
      await userRepository.create(mockUserData);
      
      const user = await userRepository.findByEmail('TEST@example.com');
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe(mockUserData.email.toLowerCase());
    });

    it('should return a lean object when lean option is true', async () => {
      await userRepository.create(mockUserData);
      
      const user = await userRepository.findByEmail(mockUserData.email, true);
      
      expect(user).not.toBeNull();
      expect(user?.email).toBe(mockUserData.email.toLowerCase());
      // Lean objects don't have Mongoose document methods
      expect((user as any).save).toBeUndefined();
    });
  });

  describe('isFirstUser', () => {
    it('should return true when no users exist', async () => {
      const isFirst = await userRepository.isFirstUser();
      
      expect(isFirst).toBe(true);
    });

    it('should return false when users exist', async () => {
      await userRepository.create(mockUserData);
      
      const isFirst = await userRepository.isFirstUser();
      
      expect(isFirst).toBe(false);
    });
  });

  describe('findByRoleId', () => {
    it('should find users by role ID', async () => {
      await userRepository.create(mockUserData);
      await userRepository.create(mockAdminData);
      
      const users = await userRepository.findByRoleId(mockRoleId);
      
      expect(users).toHaveLength(1);
      expect(users[0].email).toBe(mockUserData.email.toLowerCase());
    });

    it('should return empty array if no users with role ID', async () => {
      await userRepository.create(mockUserData);
      
      const nonExistentRoleId = new mongoose.Types.ObjectId().toString();
      const users = await userRepository.findByRoleId(nonExistentRoleId);
      
      expect(users).toHaveLength(0);
    });
  });

  describe('updateLastLogin', () => {
    it('should update user last login time', async () => {
      const user = await userRepository.create(mockUserData);
      
      const beforeUpdate = new Date();
      const updatedUser = await userRepository.updateLastLogin(user._id.toString());
      
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.lastLogin).toBeDefined();
      expect(updatedUser?.lastLogin?.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
    });

    it('should return null if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const updatedUser = await userRepository.updateLastLogin(nonExistentId);
      
      expect(updatedUser).toBeNull();
    });
  });

  describe('findActive', () => {
    it('should find active users', async () => {
      await userRepository.create(mockUserData);
      await userRepository.create({
        ...mockAdminData,
        isActive: false
      });
      
      const activeUsers = await userRepository.findActive();
      
      expect(activeUsers).toHaveLength(1);
      expect(activeUsers[0].email).toBe(mockUserData.email.toLowerCase());
    });

    it('should return empty array if no active users', async () => {
      await userRepository.create({
        ...mockUserData,
        isActive: false
      });
      
      const activeUsers = await userRepository.findActive();
      
      expect(activeUsers).toHaveLength(0);
    });
  });

  describe('CRUD operations', () => {
    it('should find a user by ID', async () => {
      const createdUser = await userRepository.create(mockUserData);
      
      const user = await userRepository.findById(createdUser._id.toString());
      
      expect(user).not.toBeNull();
      expect(user?._id.toString()).toBe(createdUser._id.toString());
    });

    it('should find all users', async () => {
      await userRepository.create(mockUserData);
      await userRepository.create(mockAdminData);
      
      const users = await userRepository.findAll();
      
      expect(users).toHaveLength(2);
    });

    it('should update a user', async () => {
      const createdUser = await userRepository.create(mockUserData);
      
      const updatedUser = await userRepository.update(createdUser._id.toString(), {
        firstName: 'Updated'
      });
      
      expect(updatedUser).not.toBeNull();
      expect(updatedUser?.firstName).toBe('Updated');
    });

    it('should delete a user', async () => {
      const createdUser = await userRepository.create(mockUserData);
      
      const deleted = await userRepository.delete(createdUser._id.toString());
      
      expect(deleted).toBe(true);
      
      const user = await userRepository.findById(createdUser._id.toString());
      expect(user).toBeNull();
    });
  });
});