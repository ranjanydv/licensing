import mongoose from 'mongoose';
import { RoleModel } from '../../models/role.model';

describe('Role Model', () => {
  const mockAdminRoleData = {
    name: 'admin',
    permissions: ['create_user', 'update_user', 'delete_user', 'manage_roles']
  };

  const mockSupportRoleData = {
    name: 'support',
    permissions: ['view_users', 'update_profile']
  };

  afterEach(async () => {
    await RoleModel.deleteMany({});
  });

  it('should create an admin role successfully', async () => {
    const role = new RoleModel(mockAdminRoleData);
    const savedRole = await role.save();
    
    expect(savedRole._id).toBeDefined();
    expect(savedRole.name).toBe(mockAdminRoleData.name);
    expect(savedRole.permissions).toEqual(expect.arrayContaining(mockAdminRoleData.permissions));
    expect(savedRole.createdAt).toBeDefined();
    expect(savedRole.updatedAt).toBeDefined();
  });

  it('should create a support role successfully', async () => {
    const role = new RoleModel(mockSupportRoleData);
    const savedRole = await role.save();
    
    expect(savedRole._id).toBeDefined();
    expect(savedRole.name).toBe(mockSupportRoleData.name);
    expect(savedRole.permissions).toEqual(expect.arrayContaining(mockSupportRoleData.permissions));
    expect(savedRole.createdAt).toBeDefined();
    expect(savedRole.updatedAt).toBeDefined();
  });

  it('should require name field', async () => {
    const roleWithoutName = new RoleModel({
      ...mockAdminRoleData,
      name: undefined
    });
    
    await expect(roleWithoutName.save()).rejects.toThrow();
  });

  it('should require permissions field', async () => {
    const roleWithoutPermissions = new RoleModel({
      ...mockAdminRoleData,
      permissions: undefined
    });
    
    await expect(roleWithoutPermissions.save()).rejects.toThrow();
  });

  it('should not allow empty permissions array', async () => {
    const roleWithEmptyPermissions = new RoleModel({
      ...mockAdminRoleData,
      permissions: []
    });
    
    await expect(roleWithEmptyPermissions.save()).rejects.toThrow();
  });

  it('should validate role name to be either admin or support', async () => {
    const roleWithInvalidName = new RoleModel({
      ...mockAdminRoleData,
      name: 'invalid_role'
    });
    
    await expect(roleWithInvalidName.save()).rejects.toThrow();
  });

  it('should not allow duplicate role names', async () => {
    // Create first role
    const firstRole = new RoleModel(mockAdminRoleData);
    await firstRole.save();
    
    // Try to create another role with the same name
    const duplicateRole = new RoleModel({
      name: mockAdminRoleData.name,
      permissions: ['some_permission']
    });
    
    await expect(duplicateRole.save()).rejects.toThrow();
  });
});