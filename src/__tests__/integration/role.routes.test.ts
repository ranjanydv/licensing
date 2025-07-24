import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import { UserModel } from '../../models/user.model';
import { RoleModel } from '../../models/role.model';

describe('Role Routes', () => {
  let adminToken: string;
  let supportToken: string;
  let roleId: string;

  beforeAll(async () => {
    // Create admin role
    const adminRole = await RoleModel.create({
      name: 'admin',
      permissions: ['manage_users', 'manage_roles']
    });

    // Create support role
    const supportRole = await RoleModel.create({
      name: 'support',
      permissions: ['view_users']
    });

    // Create admin user
    const adminUser = await UserModel.create({
      email: 'admin@example.com',
      password: '$2a$12$ik.Yd0YbGQAaA5Lgz9PcXuMlPIqXvNwVXmPQUJHNfMXFrDiWLV/Oi', // hashed 'Password123!'
      firstName: 'Admin',
      lastName: 'User',
      role: adminRole._id,
      isActive: true
    });

    // Create support user
    const supportUser = await UserModel.create({
      email: 'support@example.com',
      password: '$2a$12$ik.Yd0YbGQAaA5Lgz9PcXuMlPIqXvNwVXmPQUJHNfMXFrDiWLV/Oi', // hashed 'Password123!'
      firstName: 'Support',
      lastName: 'User',
      role: supportRole._id,
      isActive: true
    });

    // Login as admin
    const adminLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'admin@example.com',
        password: 'Password123!'
      });
    adminToken = adminLoginRes.body.data.tokens.accessToken;

    // Login as support
    const supportLoginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'support@example.com',
        password: 'Password123!'
      });
    supportToken = supportLoginRes.body.data.tokens.accessToken;
  });

  afterAll(async () => {
    // Clean up
    await UserModel.deleteMany({});
    await RoleModel.deleteMany({});
  });

  describe('GET /api/roles', () => {
    it('should get all roles as admin', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.roles).toBeDefined();
      expect(res.body.data.roles.length).toBeGreaterThanOrEqual(2);
    });

    it('should return 403 if support tries to access roles', async () => {
      const res = await request(app)
        .get('/api/roles')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/roles');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/roles', () => {
    it('should create a new role as admin', async () => {
      // Delete existing roles first to avoid conflicts
      await RoleModel.deleteMany({});

      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'admin',
          permissions: ['manage_users', 'manage_roles', 'view_users']
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBeDefined();
      expect(res.body.data.role.name).toBe('admin');
      expect(res.body.data.role.permissions).toContain('manage_users');
      expect(res.body.data.role.permissions).toContain('manage_roles');
      expect(res.body.data.role.permissions).toContain('view_users');

      // Save role ID for later tests
      roleId = res.body.data.role.id;
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'invalid_role',
          permissions: ['manage_users']
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should return 409 if role already exists', async () => {
      const res = await request(app)
        .post('/api/roles')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'admin',
          permissions: ['manage_users', 'manage_roles']
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/roles/:id', () => {
    it('should get role by ID as admin', async () => {
      const res = await request(app)
        .get(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBeDefined();
      expect(res.body.data.role.id).toBe(roleId);
      expect(res.body.data.role.name).toBe('admin');
    });

    it('should return 404 if role not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/roles/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('PUT /api/roles/:id', () => {
    it('should update a role as admin', async () => {
      const res = await request(app)
        .put(`/api/roles/${roleId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: ['manage_users', 'manage_roles', 'view_users', 'create_user']
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBeDefined();
      expect(res.body.data.role.permissions).toContain('create_user');
    });

    it('should return 404 if role not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/roles/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permissions: ['view_users']
        });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/roles/:id/permissions', () => {
    it('should add permission to role as admin', async () => {
      const res = await request(app)
        .post(`/api/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permission: 'delete_user'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBeDefined();
      expect(res.body.data.role.permissions).toContain('delete_user');
    });

    it('should return 400 if permission is not provided', async () => {
      const res = await request(app)
        .post(`/api/roles/${roleId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should return 404 if role not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/roles/${nonExistentId}/permissions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          permission: 'view_users'
        });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/roles/permission/:permission', () => {
    it('should get roles by permission as admin', async () => {
      const res = await request(app)
        .get('/api/roles/permission/manage_users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.roles).toBeDefined();
      expect(res.body.data.roles.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.roles[0].permissions).toContain('manage_users');
    });
  });

  describe('DELETE /api/roles/:id/permissions/:permission', () => {
    it('should remove permission from role as admin', async () => {
      const res = await request(app)
        .delete(`/api/roles/${roleId}/permissions/delete_user`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.role).toBeDefined();
      expect(res.body.data.role.permissions).not.toContain('delete_user');
    });

    it('should return 404 if role not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/roles/${nonExistentId}/permissions/view_users`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('DELETE /api/roles/:id', () => {
    it('should delete a role as admin', async () => {
      // Create a new role to delete
      const newRole = await RoleModel.create({
        name: 'support',
        permissions: ['view_users']
      });

      const res = await request(app)
        .delete(`/api/roles/${newRole._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Role deleted successfully');
    });

    it('should return 404 if role not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .delete(`/api/roles/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });
});