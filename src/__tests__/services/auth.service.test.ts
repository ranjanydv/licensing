import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { AuthService } from '../../services/auth.service';
import { userRepository } from '../../repositories/user.repository';
import { roleRepository } from '../../repositories/role.repository';
import { tokenBlacklistRepository } from '../../repositories/token-blacklist.repository';
import { AppError } from '../../middlewares/errorHandler';

// Mock repositories
jest.mock('../../repositories/user.repository');
jest.mock('../../repositories/role.repository');
jest.mock('../../repositories/token-blacklist.repository');
jest.mock('jsonwebtoken');
jest.mock('bcrypt');

describe('AuthService', () => {
  let authService: AuthService;
  
  const mockUserId = new mongoose.Types.ObjectId().toString();
  const mockRoleId = new mongoose.Types.ObjectId().toString();
  
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
    name: 'admin',
    permissions: ['manage_users', 'manage_roles'],
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  const mockTokens = {
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token'
  };
  
  const mockDecodedToken = {
    userId: mockUserId,
    email: 'test@example.com',
    role: 'admin',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 3600
  };

  beforeEach(() => {
    jest.clearAllMocks();
    authService = new AuthService();
    
    // Mock environment variables
    process.env.JWT_ACCESS_SECRET = 'test_access_secret';
    process.env.JWT_REFRESH_SECRET = 'test_refresh_secret';
    process.env.JWT_ACCESS_EXPIRES = '15m';
    process.env.JWT_REFRESH_EXPIRES = '7d';
    process.env.BCRYPT_SALT_ROUNDS = '12';
    
    // Mock repository methods
    (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
    (userRepository.isFirstUser as jest.Mock).mockResolvedValue(false);
    (userRepository.findById as jest.Mock).mockResolvedValue(mockUser);
    (userRepository.create as jest.Mock).mockResolvedValue(mockUser);
    (userRepository.updateLastLogin as jest.Mock).mockResolvedValue(mockUser);
    
    (roleRepository.findAdminRole as jest.Mock).mockResolvedValue(mockRole);
    (roleRepository.findSupportRole as jest.Mock).mockResolvedValue({
      ...mockRole,
      name: 'support',
      permissions: ['view_users']
    });
    (roleRepository.findById as jest.Mock).mockResolvedValue(mockRole);
    (roleRepository.create as jest.Mock).mockResolvedValue(mockRole);
    
    (tokenBlacklistRepository.isBlacklisted as jest.Mock).mockResolvedValue(false);
    (tokenBlacklistRepository.addToBlacklist as jest.Mock).mockResolvedValue({
      token: 'mock-token',
      expiresAt: new Date()
    });
    
    // Mock JWT methods
    (jwt.sign as jest.Mock).mockImplementation(() => 'mock-token');
    (jwt.verify as jest.Mock).mockImplementation(() => mockDecodedToken);
    
    // Mock bcrypt methods
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashedPassword123');
    (bcrypt.compare as jest.Mock).mockResolvedValue(true);
  });

  describe('register', () => {
    const registerData = {
      email: 'test@example.com',
      password: 'Password123!',
      firstName: 'Test',
      lastName: 'User'
    };

    it('should register a new user successfully', async () => {
      const result = await authService.register(registerData);
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(registerData.email);
      expect(userRepository.isFirstUser).toHaveBeenCalled();
      expect(roleRepository.findSupportRole).toHaveBeenCalled();
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(userRepository.create).toHaveBeenCalled();
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(mockUserId);
      
      expect(result).toEqual({
        user: {
          id: mockUserId,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockRole.name
        },
        tokens: mockTokens
      });
    });

    it('should assign admin role to first user', async () => {
      (userRepository.isFirstUser as jest.Mock).mockResolvedValue(true);
      
      await authService.register(registerData);
      
      expect(roleRepository.findAdminRole).toHaveBeenCalled();
      expect(roleRepository.findSupportRole).not.toHaveBeenCalled();
    });

    it('should create admin role if it does not exist for first user', async () => {
      (userRepository.isFirstUser as jest.Mock).mockResolvedValue(true);
      (roleRepository.findAdminRole as jest.Mock).mockResolvedValue(null);
      
      await authService.register(registerData);
      
      expect(roleRepository.create).toHaveBeenCalledWith({
        name: 'admin',
        permissions: expect.any(Array)
      });
    });

    it('should create support role if it does not exist', async () => {
      (roleRepository.findSupportRole as jest.Mock).mockResolvedValue(null);
      
      await authService.register(registerData);
      
      expect(roleRepository.create).toHaveBeenCalledWith({
        name: 'support',
        permissions: expect.any(Array)
      });
    });

    it('should throw error if user already exists', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      await expect(authService.register(registerData)).rejects.toThrow(AppError);
      expect(userRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('login', () => {
    const loginData = {
      email: 'test@example.com',
      password: 'Password123!'
    };

    it('should login a user successfully', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      
      const result = await authService.login(loginData);
      
      expect(userRepository.findByEmail).toHaveBeenCalledWith(loginData.email);
      expect(bcrypt.compare).toHaveBeenCalledWith(loginData.password, mockUser.password);
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(userRepository.updateLastLogin).toHaveBeenCalledWith(mockUserId);
      
      expect(result).toEqual({
        user: {
          id: mockUserId,
          email: mockUser.email,
          firstName: mockUser.firstName,
          lastName: mockUser.lastName,
          role: mockRole.name
        },
        tokens: mockTokens
      });
    });

    it('should throw error if user not found', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(null);
      
      await expect(authService.login(loginData)).rejects.toThrow(AppError);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if user is inactive', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false
      });
      
      await expect(authService.login(loginData)).rejects.toThrow(AppError);
      expect(bcrypt.compare).not.toHaveBeenCalled();
    });

    it('should throw error if password is invalid', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);
      
      await expect(authService.login(loginData)).rejects.toThrow(AppError);
      expect(userRepository.updateLastLogin).not.toHaveBeenCalled();
    });

    it('should throw error if role not found', async () => {
      (userRepository.findByEmail as jest.Mock).mockResolvedValue(mockUser);
      (roleRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(authService.login(loginData)).rejects.toThrow(AppError);
      expect(userRepository.updateLastLogin).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('should logout a user successfully', async () => {
      const result = await authService.logout(mockUserId, 'mock-token');
      
      expect(jwt.verify).toHaveBeenCalledWith('mock-token', expect.any(String));
      expect(tokenBlacklistRepository.addToBlacklist).toHaveBeenCalledWith(
        'mock-token',
        expect.any(Date)
      );
      expect(result).toBe(true);
    });

    it('should return false if logout fails', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid token');
      });
      
      const result = await authService.logout(mockUserId, 'mock-token');
      
      expect(result).toBe(false);
      expect(tokenBlacklistRepository.addToBlacklist).not.toHaveBeenCalled();
    });
  });

  describe('refreshToken', () => {
    it('should refresh tokens successfully', async () => {
      const result = await authService.refreshToken('mock-refresh-token');
      
      expect(tokenBlacklistRepository.isBlacklisted).toHaveBeenCalledWith('mock-refresh-token');
      expect(jwt.verify).toHaveBeenCalledWith('mock-refresh-token', expect.any(String));
      expect(userRepository.findById).toHaveBeenCalledWith(mockUserId);
      expect(tokenBlacklistRepository.addToBlacklist).toHaveBeenCalledWith(
        'mock-refresh-token',
        expect.any(Date)
      );
      
      expect(result).toEqual(mockTokens);
    });

    it('should throw error if token is blacklisted', async () => {
      (tokenBlacklistRepository.isBlacklisted as jest.Mock).mockResolvedValue(true);
      
      await expect(authService.refreshToken('mock-refresh-token')).rejects.toThrow(AppError);
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should throw error if user not found', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(authService.refreshToken('mock-refresh-token')).rejects.toThrow(AppError);
      expect(tokenBlacklistRepository.addToBlacklist).not.toHaveBeenCalled();
    });

    it('should throw error if user is inactive', async () => {
      (userRepository.findById as jest.Mock).mockResolvedValue({
        ...mockUser,
        isActive: false
      });
      
      await expect(authService.refreshToken('mock-refresh-token')).rejects.toThrow(AppError);
      expect(tokenBlacklistRepository.addToBlacklist).not.toHaveBeenCalled();
    });

    it('should throw error if token is expired', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });
      
      await expect(authService.refreshToken('mock-refresh-token')).rejects.toThrow(AppError);
      expect(tokenBlacklistRepository.addToBlacklist).not.toHaveBeenCalled();
    });

    it('should throw error if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });
      
      await expect(authService.refreshToken('mock-refresh-token')).rejects.toThrow(AppError);
      expect(tokenBlacklistRepository.addToBlacklist).not.toHaveBeenCalled();
    });
  });

  describe('verifyToken', () => {
    it('should verify token successfully', async () => {
      const result = await authService.verifyToken('mock-token');
      
      expect(tokenBlacklistRepository.isBlacklisted).toHaveBeenCalledWith('mock-token');
      expect(jwt.verify).toHaveBeenCalledWith('mock-token', expect.any(String));
      
      expect(result).toEqual({
        userId: mockDecodedToken.userId,
        email: mockDecodedToken.email,
        role: mockDecodedToken.role
      });
    });

    it('should throw error if token is blacklisted', async () => {
      (tokenBlacklistRepository.isBlacklisted as jest.Mock).mockResolvedValue(true);
      
      await expect(authService.verifyToken('mock-token')).rejects.toThrow(AppError);
      expect(jwt.verify).not.toHaveBeenCalled();
    });

    it('should throw error if token is expired', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('Token expired', new Date());
      });
      
      await expect(authService.verifyToken('mock-token')).rejects.toThrow(AppError);
    });

    it('should throw error if token is invalid', async () => {
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.JsonWebTokenError('Invalid token');
      });
      
      await expect(authService.verifyToken('mock-token')).rejects.toThrow(AppError);
    });
  });

  describe('hashPassword', () => {
    it('should hash password successfully', async () => {
      const result = await authService.hashPassword('password');
      
      expect(bcrypt.hash).toHaveBeenCalledWith('password', 12);
      expect(result).toBe('hashedPassword123');
    });

    it('should throw error if hashing fails', async () => {
      (bcrypt.hash as jest.Mock).mockImplementation(() => {
        throw new Error('Hashing failed');
      });
      
      await expect(authService.hashPassword('password')).rejects.toThrow(AppError);
    });
  });

  describe('comparePassword', () => {
    it('should compare password successfully', async () => {
      const result = await authService.comparePassword('password', 'hash');
      
      expect(bcrypt.compare).toHaveBeenCalledWith('password', 'hash');
      expect(result).toBe(true);
    });

    it('should throw error if comparison fails', async () => {
      (bcrypt.compare as jest.Mock).mockImplementation(() => {
        throw new Error('Comparison failed');
      });
      
      await expect(authService.comparePassword('password', 'hash')).rejects.toThrow(AppError);
    });
  });

  describe('generateTokens', () => {
    it('should generate tokens successfully', async () => {
      const result = await authService.generateTokens(mockUser);
      
      expect(roleRepository.findById).toHaveBeenCalledWith(mockRoleId);
      expect(jwt.sign).toHaveBeenCalledTimes(2);
      expect(result).toEqual(mockTokens);
    });

    it('should throw error if role not found', async () => {
      (roleRepository.findById as jest.Mock).mockResolvedValue(null);
      
      await expect(authService.generateTokens(mockUser)).rejects.toThrow(AppError);
      expect(jwt.sign).not.toHaveBeenCalled();
    });

    it('should throw error if token generation fails', async () => {
      (jwt.sign as jest.Mock).mockImplementation(() => {
        throw new Error('Token generation failed');
      });
      
      await expect(authService.generateTokens(mockUser)).rejects.toThrow(AppError);
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist token successfully', async () => {
      const expiresAt = new Date();
      const result = await authService.blacklistToken('mock-token', expiresAt);
      
      expect(tokenBlacklistRepository.addToBlacklist).toHaveBeenCalledWith('mock-token', expiresAt);
      expect(result).toBe(true);
    });

    it('should return false if blacklisting fails', async () => {
      (tokenBlacklistRepository.addToBlacklist as jest.Mock).mockImplementation(() => {
        throw new Error('Blacklisting failed');
      });
      
      const expiresAt = new Date();
      const result = await authService.blacklistToken('mock-token', expiresAt);
      
      expect(result).toBe(false);
    });
  });

  describe('isTokenBlacklisted', () => {
    it('should check if token is blacklisted successfully', async () => {
      const result = await authService.isTokenBlacklisted('mock-token');
      
      expect(tokenBlacklistRepository.isBlacklisted).toHaveBeenCalledWith('mock-token');
      expect(result).toBe(false);
    });

    it('should return true if checking fails', async () => {
      (tokenBlacklistRepository.isBlacklisted as jest.Mock).mockImplementation(() => {
        throw new Error('Checking failed');
      });
      
      const result = await authService.isTokenBlacklisted('mock-token');
      
      expect(result).toBe(true);
    });
  });
});