import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import { UserModel } from '../../models/user.model';
import { RoleModel } from '../../models/role.model';

describe('User Routes', () => {
  let adminToken: string;
  let supportToken: string;
  let adminRoleId: string;
  let supportRoleId: string;
  let userId: string;

  beforeAll(async () => {
    // Create roles
    const adminRole = await RoleModel.create({
      name: 'admin',
      permissions: ['view_users', 'create_user', 'update_user', 'delete_user', 'manage_roles']
    });
    adminRoleId = adminRole._id.toString();

    const supportRole = await RoleModel.create({
      name: 'support',
      permissions: ['view_users']
    });
    supportRoleId = supportRole._id.toString();

    // Create admin user
    const adminUser = await UserModel.create({
      email: 'admin@example.com',
      password: '$2a$12$ik.Yd0YbGQAaA5Lgz9PcXuMlPIqXvNwVXmPQUJHNfMXFrDiWLV/Oi', // hashed 'Password123!'
      firstName: 'Admin',
      lastName: 'User',
      role: adminRoleId,
      isActive: true
    });

    // Create support user
    const supportUser = await UserModel.create({
      email: 'support@example.com',
      password: '$2a$12$ik.Yd0YbGQAaA5Lgz9PcXuMlPIqXvNwVXmPQUJHNfMXFrDiWLV/Oi', // hashed 'Password123!'
      firstName: 'Support',
      lastName: 'User',
      role: supportRoleId,
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

  describe('GET /api/users', () => {
    it('should get all users as admin', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(2);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should get all users as support', async () => {
      const res = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.users).toBeDefined();
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/users');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/users', () => {
    it('should create a new user as admin', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
          role: supportRoleId
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('newuser@example.com');
      expect(res.body.data.user.firstName).toBe('New');
      expect(res.body.data.user.lastName).toBe('User');
      expect(res.body.data.user.role).toBe(supportRoleId);

      // Save user ID for later tests
      userId = res.body.data.user.id;
    });

    it('should return 403 if support tries to create a user', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          email: 'another@example.com',
          password: 'Password123!',
          firstName: 'Another',
          lastName: 'User',
          role: supportRoleId
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'invalid-email',
          password: 'short',
          role: supportRoleId
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should return 409 if user already exists', async () => {
      const res = await request(app)
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          email: 'newuser@example.com',
          password: 'Password123!',
          firstName: 'New',
          lastName: 'User',
          role: supportRoleId
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/users/:id', () => {
    it('should get user by ID as admin', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe(userId);
    });

    it('should get user by ID as support', async () => {
      const res = await request(app)
        .get(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.id).toBe(userId);
    });

    it('should return 404 if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should update a user as admin', async () => {
      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Updated',
          lastName: 'User'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.firstName).toBe('Updated');
      expect(res.body.data.user.lastName).toBe('User');
    });

    it('should return 403 if support tries to update a user', async () => {
      const res = await request(app)
        .put(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          firstName: 'Should',
          lastName: 'Fail'
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('should return 404 if user not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .put(`/api/users/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          firstName: 'Not',
          lastName: 'Found'
        });

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/users/:id/role', () => {
    it('should assign role to user as admin', async () => {
      const res = await request(app)
        .post(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          roleId: adminRoleId
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.role).toBe(adminRoleId);
    });

    it('should return 403 if support tries to assign role', async () => {
      const res = await request(app)
        .post(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${supportToken}`)
        .send({
          roleId: supportRoleId
        });

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('should return 400 if roleId is not provided', async () => {
      const res = await request(app)
        .post(`/api/users/${userId}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/users/role/:roleId', () => {
    it('should get users by role as admin', async () => {
      const res = await request(app)
        .get(`/api/users/role/${adminRoleId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.users).toBeDefined();
      expect(res.body.data.users.length).toBeGreaterThanOrEqual(1);
      expect(res.body.data.pagination).toBeDefined();
    });

    it('should get users by role as support', async () => {
      const res = await request(app)
        .get(`/api/users/role/${adminRoleId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.users).toBeDefined();
    });

    it('should return 404 if role not found', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .get(`/api/users/role/${nonExistentId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });

  describe('PATCH /api/users/:id/deactivate', () => {
    it('should deactivate a user as admin', async () => {
      const res = await request(app)
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.isActive).toBe(false);
    });

    it('should return 403 if support tries to deactivate a user', async () => {
      const res = await request(app)
        .patch(`/api/users/${userId}/deactivate`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });
  });

  describe('PATCH /api/users/:id/activate', () => {
    it('should activate a user as admin', async () => {
      const res = await request(app)
        .patch(`/api/users/${userId}/activate`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.isActive).toBe(true);
    });

    it('should return 403 if support tries to activate a user', async () => {
      const res = await request(app)
        .patch(`/api/users/${userId}/activate`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should delete a user as admin', async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('User deleted successfully');
    });

    it('should return 403 if support tries to delete a user', async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${supportToken}`);

      expect(res.status).toBe(403);
      expect(res.body.status).toBe('error');
    });

    it('should return 404 if user not found', async () => {
      const res = await request(app)
        .delete(`/api/users/${userId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(404);
      expect(res.body.status).toBe('error');
    });
  });
});