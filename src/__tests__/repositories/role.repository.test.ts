import mongoose from 'mongoose';
import { RoleModel } from '../../models/role.model';
import { roleRepository } from '../../repositories/role.repository';

describe('RoleRepository', () => {
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

  describe('create', () => {
    it('should create a role successfully', async () => {
      const role = await roleRepository.create(mockAdminRoleData);
      
      expect(role._id).toBeDefined();
      expect(role.name).toBe(mockAdminRoleData.name);
      expect(role.permissions).toEqual(expect.arrayContaining(mockAdminRoleData.permissions));
    });
  });

  describe('findByName', () => {
    it('should find a role by name', async () => {
      await roleRepository.create(mockAdminRoleData);
      
      const role = await roleRepository.findByName('admin');
      
      expect(role).not.toBeNull();
      expect(role?.name).toBe('admin');
    });

    it('should return null if role not found by name', async () => {
      const role = await roleRepository.findByName('nonexistent');
      
      expect(role).toBeNull();
    });

    it('should find a role by name case-insensitively', async () => {
      await roleRepository.create(mockAdminRoleData);
      
      const role = await roleRepository.findByName('ADMIN');
      
      expect(role).not.toBeNull();
      expect(role?.name).toBe('admin');
    });

    it('should return a lean object when lean option is true', async () => {
      await roleRepository.create(mockAdminRoleData);
      
      const role = await roleRepository.findByName('admin', true);
      
      expect(role).not.toBeNull();
      expect(role?.name).toBe('admin');
      // Lean objects don't have Mongoose document methods
      expect((role as any).save).toBeUndefined();
    });
  });

  describe('findAdminRole', () => {
    it('should find the admin role', async () => {
      await roleRepository.create(mockAdminRoleData);
      await roleRepository.create(mockSupportRoleData);
      
      const role = await roleRepository.findAdminRole();
      
      expect(role).not.toBeNull();
      expect(role?.name).toBe('admin');
    });

    it('should return null if admin role does not exist', async () => {
      await roleRepository.create(mockSupportRoleData);
      
      const role = await roleRepository.findAdminRole();
      
      expect(role).toBeNull();
    });
  });

  describe('findSupportRole', () => {
    it('should find the support role', async () => {
      await roleRepository.create(mockAdminRoleData);
      await roleRepository.create(mockSupportRoleData);
      
      const role = await roleRepository.findSupportRole();
      
      expect(role).not.toBeNull();
      expect(role?.name).toBe('support');
    });

    it('should return null if support role does not exist', async () => {
      await roleRepository.create(mockAdminRoleData);
      
      const role = await roleRepository.findSupportRole();
      
      expect(role).toBeNull();
    });
  });

  describe('findByPermission', () => {
    it('should find roles by permission', async () => {
      await roleRepository.create(mockAdminRoleData);
      await roleRepository.create(mockSupportRoleData);
      
      const roles = await roleRepository.findByPermission('create_user');
      
      expect(roles).toHaveLength(1);
      expect(roles[0].name).toBe('admin');
    });

    it('should return empty array if no roles with permission', async () => {
      await roleRepository.create(mockAdminRoleData);
      await roleRepository.create(mockSupportRoleData);
      
      const roles = await roleRepository.findByPermission('nonexistent_permission');
      
      expect(roles).toHaveLength(0);
    });

    it('should find multiple roles with the same permission', async () => {
      await roleRepository.create(mockAdminRoleData);
      await roleRepository.create({
        name: 'support',
        permissions: ['view_users', 'create_user'] // Added create_user permission
      });
      
      const roles = await roleRepository.findByPermission('create_user');
      
      expect(roles).toHaveLength(2);
      expect(roles.map(r => r.name)).toContain('admin');
      expect(roles.map(r => r.name)).toContain('support');
    });
  });

  describe('exists', () => {
    it('should return true if role exists', async () => {
      await roleRepository.create(mockAdminRoleData);
      
      const exists = await roleRepository.exists('admin');
      
      expect(exists).toBe(true);
    });

    it('should return false if role does not exist', async () => {
      const exists = await roleRepository.exists('nonexistent');
      
      expect(exists).toBe(false);
    });
  });

  describe('CRUD operations', () => {
    it('should find a role by ID', async () => {
      const createdRole = await roleRepository.create(mockAdminRoleData);
      
      const role = await roleRepository.findById(createdRole._id.toString());
      
      expect(role).not.toBeNull();
      expect(role?._id.toString()).toBe(createdRole._id.toString());
    });

    it('should find all roles', async () => {
      await roleRepository.create(mockAdminRoleData);
      await roleRepository.create(mockSupportRoleData);
      
      const roles = await roleRepository.findAll();
      
      expect(roles).toHaveLength(2);
    });

    it('should update a role', async () => {
      const createdRole = await roleRepository.create(mockAdminRoleData);
      
      const updatedRole = await roleRepository.update(createdRole._id.toString(), {
        permissions: ['updated_permission']
      });
      
      expect(updatedRole).not.toBeNull();
      expect(updatedRole?.permissions).toEqual(['updated_permission']);
    });

    it('should delete a role', async () => {
      const createdRole = await roleRepository.create(mockAdminRoleData);
      
      const deleted = await roleRepository.delete(createdRole._id.toString());
      
      expect(deleted).toBe(true);
      
      const role = await roleRepository.findById(createdRole._id.toString());
      expect(role).toBeNull();
    });
  });
});