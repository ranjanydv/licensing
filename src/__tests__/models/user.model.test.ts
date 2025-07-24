import mongoose from 'mongoose';
import { UserModel } from '../../models/user.model';
import bcrypt from 'bcryptjs';

describe('User Model', () => {
  const mockRoleId = new mongoose.Types.ObjectId().toString();
  
  const mockUserData = {
    email: 'test@example.com',
    password: 'Password123!',
    firstName: 'Test',
    lastName: 'User',
    role: mockRoleId,
    isActive: true
  };

  afterEach(async () => {
    await UserModel.deleteMany({});
  });

  it('should create a user successfully', async () => {
    const user = new UserModel(mockUserData);
    const savedUser = await user.save();
    
    expect(savedUser._id).toBeDefined();
    expect(savedUser.email).toBe(mockUserData.email.toLowerCase());
    expect(savedUser.firstName).toBe(mockUserData.firstName);
    expect(savedUser.lastName).toBe(mockUserData.lastName);
    expect(savedUser.role.toString()).toBe(mockRoleId);
    expect(savedUser.isActive).toBe(true);
    expect(savedUser.createdAt).toBeDefined();
    expect(savedUser.updatedAt).toBeDefined();
  });

  it('should hash the password before saving', async () => {
    const user = new UserModel(mockUserData);
    const savedUser = await user.save();
    
    // Password should be hashed and not equal to the original
    expect(savedUser.password).not.toBe(mockUserData.password);
    // Verify it's a bcrypt hash
    expect(savedUser.password).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it('should not rehash the password if it was not modified', async () => {
    const user = new UserModel(mockUserData);
    const savedUser = await user.save();
    const originalHash = savedUser.password;
    
    // Update a field other than password
    savedUser.firstName = 'Updated';
    await savedUser.save();
    
    // Password hash should remain the same
    expect(savedUser.password).toBe(originalHash);
  });

  it('should correctly compare passwords', async () => {
    const user = new UserModel(mockUserData);
    await user.save();
    
    // Correct password should return true
    const isMatch = await user.comparePassword(mockUserData.password);
    expect(isMatch).toBe(true);
    
    // Incorrect password should return false
    const isWrongMatch = await user.comparePassword('wrongpassword');
    expect(isWrongMatch).toBe(false);
  });

  it('should require email field', async () => {
    const userWithoutEmail = new UserModel({
      ...mockUserData,
      email: undefined
    });
    
    await expect(userWithoutEmail.save()).rejects.toThrow();
  });

  it('should require password field', async () => {
    const userWithoutPassword = new UserModel({
      ...mockUserData,
      password: undefined
    });
    
    await expect(userWithoutPassword.save()).rejects.toThrow();
  });

  it('should require role field', async () => {
    const userWithoutRole = new UserModel({
      ...mockUserData,
      role: undefined
    });
    
    await expect(userWithoutRole.save()).rejects.toThrow();
  });

  it('should validate email format', async () => {
    const userWithInvalidEmail = new UserModel({
      ...mockUserData,
      email: 'invalid-email'
    });
    
    await expect(userWithInvalidEmail.save()).rejects.toThrow();
  });

  it('should validate minimum password length', async () => {
    const userWithShortPassword = new UserModel({
      ...mockUserData,
      password: 'short'
    });
    
    await expect(userWithShortPassword.save()).rejects.toThrow();
  });

  it('should correctly generate fullName virtual', async () => {
    const user = new UserModel(mockUserData);
    await user.save();
    
    expect(user.fullName).toBe(`${mockUserData.firstName} ${mockUserData.lastName}`);
    
    // Test with only firstName
    user.lastName = undefined;
    expect(user.fullName).toBe(mockUserData.firstName);
    
    // Test with only lastName
    user.firstName = undefined;
    user.lastName = mockUserData.lastName;
    expect(user.fullName).toBe(mockUserData.lastName);
    
    // Test with neither
    user.firstName = undefined;
    user.lastName = undefined;
    expect(user.fullName).toBe('');
  });

  it('should remove password field when converting to JSON', async () => {
    const user = new UserModel(mockUserData);
    await user.save();
    
    const userJSON = user.toJSON();
    expect(userJSON.password).toBeUndefined();
  });
});