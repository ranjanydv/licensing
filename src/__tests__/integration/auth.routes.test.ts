import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../app';
import { UserModel } from '../../models/user.model';
import { RoleModel } from '../../models/role.model';
import { TokenBlacklistModel } from '../../models/token-blacklist.model';

describe('Auth Routes', () => {
  let adminRoleId: string;
  let supportRoleId: string;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Create roles
    const adminRole = await RoleModel.create({
      name: 'admin',
      permissions: ['manage_users', 'manage_roles']
    });
    adminRoleId = adminRole._id.toString();

    const supportRole = await RoleModel.create({
      name: 'support',
      permissions: ['view_users']
    });
    supportRoleId = supportRole._id.toString();
  });

  afterAll(async () => {
    // Clean up
    await UserModel.deleteMany({});
    await RoleModel.deleteMany({});
    await TokenBlacklistModel.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
      expect(res.body.data.user.firstName).toBe('Test');
      expect(res.body.data.user.lastName).toBe('User');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // First user should be admin
      expect(res.body.data.user.role).toBe('admin');
    });

    it('should register a second user as support', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'support@example.com',
          password: 'Password123!',
          firstName: 'Support',
          lastName: 'User'
        });

      expect(res.status).toBe(201);
      expect(res.body.data.user.role).toBe('support');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'short'
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should return 409 if user already exists', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: 'Password123!',
          firstName: 'Test',
          lastName: 'User'
        });

      expect(res.status).toBe(409);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Save tokens for later tests
      accessToken = res.body.data.tokens.accessToken;
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('should return 401 for invalid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('should return 400 for invalid input', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'invalid-email'
          // Missing password
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user profile', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.user).toBeDefined();
      expect(res.body.data.user.email).toBe('test@example.com');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('should return 401 if token is invalid', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalid-token');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.data.tokens.accessToken).toBeDefined();
      expect(res.body.data.tokens.refreshToken).toBeDefined();

      // Update tokens for later tests
      accessToken = res.body.data.tokens.accessToken;
      refreshToken = res.body.data.tokens.refreshToken;
    });

    it('should return 400 if refresh token is not provided', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });

    it('should return 401 if refresh token is invalid', async () => {
      const res = await request(app)
        .post('/api/auth/refresh')
        .send({
          refreshToken: 'invalid-refresh-token'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Logged out successfully');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/auth/logout');

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('should return 401 if token is already blacklisted', async () => {
      const res = await request(app)
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });
  });

  describe('POST /api/auth/change-password', () => {
    // Login again to get a new token
    beforeAll(async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'Password123!'
        });

      accessToken = res.body.data.tokens.accessToken;
    });

    it('should change password successfully', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe('success');
      expect(res.body.message).toBe('Password changed successfully');
    });

    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .send({
          currentPassword: 'Password123!',
          newPassword: 'NewPassword123!'
        });

      expect(res.status).toBe(401);
      expect(res.body.status).toBe('error');
    });

    it('should return 400 if required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/change-password')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          currentPassword: 'Password123!'
          // Missing newPassword
        });

      expect(res.status).toBe(400);
      expect(res.body.status).toBe('error');
    });
  });
});