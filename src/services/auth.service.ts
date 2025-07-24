import 'dotenv/config';
import jwt, { Secret, SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { IAuthService } from '../interfaces/auth-service.interface';
import { AuthResponseDTO, AuthTokens, DecodedToken, LoginDTO, RegisterDTO } from '../interfaces/auth.interface';
import { AppError } from '../middlewares/errorHandler';
import { UserDocument } from '../models/user.model';
import { roleRepository } from '../repositories/role.repository';
import { tokenBlacklistRepository } from '../repositories/token-blacklist.repository';
import { userRepository } from '../repositories/user.repository';
import { hashPassword, verifyPassword } from '../utils/hash';
import { Logger } from '../utils/logger';

const logger = new Logger('AuthService');

/**
 * Authentication service implementation
 */
export class AuthService implements IAuthService {
  private readonly accessTokenSecret: Secret;
  private readonly refreshTokenSecret: Secret;
  private readonly accessTokenExpiry: string;
  private readonly refreshTokenExpiry: string;

  constructor() {
    // Load configuration from environment variables
    this.accessTokenSecret = (process.env.JWT_ACCESS_SECRET || 'access_secret') as Secret;
    this.refreshTokenSecret = (process.env.JWT_REFRESH_SECRET || 'refresh_secret') as Secret;
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRES || '15m';
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRES || '7d';

    // Validate configuration
    if (this.accessTokenSecret === 'access_secret' || this.refreshTokenSecret === 'refresh_secret') {
      logger.warn('Using default JWT secrets. This is not secure for production.');
    }
  }

  /**
   * Register a new user
   * @param registerData User registration data
   * @returns Authentication response with user and tokens
   */
  async register(registerData: RegisterDTO): Promise<AuthResponseDTO> {
    try {
      logger.info('Registering new user', { email: registerData.email });

      // Check if user already exists
      const existingUser = await userRepository.findByEmail(registerData.email);
      if (existingUser) {
        throw new AppError('User with this email already exists', 409);
      }

      // Check if this is the first user in the system
      const isFirstUser = await userRepository.isFirstUser();

      // Get appropriate role (first user gets admin role, others get support role by default)
      let role: any;
      if (isFirstUser) {
        role = await roleRepository.findAdminRole();
        if (!role) {
          // Create admin role if it doesn't exist
          role = await roleRepository.create({
            name: 'admin',
            permissions: ['manage_users', 'manage_roles', 'view_users', 'create_user', 'update_user', 'delete_user']
          });
        }
      } else {
        role = await roleRepository.findSupportRole();
        if (!role) {
          // Create support role if it doesn't exist
          role = await roleRepository.create({
            name: 'support',
            permissions: ['view_users']
          });
        }
      }

      // Get role ID properly
      const roleId = role._id || role.id;

      // Create user
      const user = await userRepository.create({
        email: registerData.email,
        password: registerData.password,
        firstName: registerData.firstName,
        lastName: registerData.lastName,
        role: roleId,
        isActive: true
      });

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Get user ID properly
      const userId = user._id || user.id;

      // Update last login time
      await userRepository.updateLastLogin(userId.toString());

      logger.info('User registered successfully', { userId, isFirstUser });

      // Return user data and tokens
      return {
        user: {
          id: userId.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: role.name
        },
        tokens
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error registering user:', { error });
      throw new AppError(`Failed to register user: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Login a user
   * @param loginData User login credentials
   * @returns Authentication response with user and tokens
   */
  async login(loginData: LoginDTO): Promise<AuthResponseDTO> {
    try {
      logger.info('User login attempt', { email: loginData.email });

      // Find user by email
      const user = await userRepository.findByEmail(loginData.email) as UserDocument;
      if (!user) {
        throw new AppError('Invalid email or password', 401);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError('User account is inactive', 403);
      }

      // Verify password
      const isPasswordValid = await user.comparePassword(loginData.password);
      if (!isPasswordValid) {
        throw new AppError('Invalid email or password', 401);
      }

      // Get user role ID properly (role is always ObjectId)
      const roleId = user.role;

      // Get user role
      const role = await roleRepository.findById(roleId.toString());
      if (!role) {
        throw new AppError('User role not found', 500);
      }

      // Generate tokens
      const tokens = await this.generateTokens(user);

      // Get user ID properly
      const userId = user._id;

      // Update last login time
      await userRepository.updateLastLogin(userId.toString());

      logger.info('User logged in successfully', { userId });

      // Return user data and tokens
      return {
        user: {
          id: userId.toString(),
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: role.name
        },
        tokens
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error logging in user:', { error });
      throw new AppError(`Failed to login: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Logout a user
   * @param userId User ID
   * @param token Access token to blacklist
   * @returns True if successful
   */
  async logout(userId: string, token: string): Promise<boolean> {
    try {
      logger.info('User logout', { userId });

      // Verify and decode token to get expiration
      const decoded = jwt.verify(token, this.accessTokenSecret) as DecodedToken;

      // Calculate expiration date safely
      if (typeof decoded.exp !== 'number') {
        throw new AppError('Invalid token: missing expiration', 400);
      }
      const expiresAt = new Date(decoded.exp * 1000);

      // Add token to blacklist
      await this.blacklistToken(token, expiresAt);

      logger.info('User logged out successfully', { userId });

      return true;
    } catch (error) {
      logger.error('Error logging out user:', { error });
      // Don't throw error on logout failures, just return false
      return false;
    }
  }

  /**
   * Refresh access token using refresh token
   * @param refreshToken Refresh token
   * @returns New authentication tokens
   */
  async refreshToken(refreshToken: string): Promise<AuthTokens> {
    try {
      logger.info('Token refresh attempt');

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(refreshToken);
      if (isBlacklisted) {
        throw new AppError('Invalid refresh token', 401);
      }

      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.refreshTokenSecret) as DecodedToken;

      // Get user
      const user = await userRepository.findById(decoded.userId);
      if (!user) {
        throw new AppError('User not found', 404);
      }

      // Check if user is active
      if (!user.isActive) {
        throw new AppError('User account is inactive', 403);
      }

      // Generate new tokens
      const tokens = await this.generateTokens(user);

      // Blacklist old refresh token safely
      if (typeof decoded.exp !== 'number') {
        throw new AppError('Invalid token: missing expiration', 400);
      }
      const expiresAt = new Date(decoded.exp * 1000);
      await this.blacklistToken(refreshToken, expiresAt);

      logger.info('Token refreshed successfully', { userId: user._id });

      return tokens;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Refresh token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid refresh token', 401);
      } else if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error refreshing token:', { error });
      throw new AppError(`Failed to refresh token: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Verify access token
   * @param token Access token
   * @returns Decoded token payload if valid
   */
  async verifyToken(token: string): Promise<{ userId: string; email: string; role: string }> {
    try {
      logger.debug('Verifying token');

      // Check if token is blacklisted
      const isBlacklisted = await this.isTokenBlacklisted(token);
      if (isBlacklisted) {
        throw new AppError('Token is invalid', 401);
      }

      // Verify token
      const decoded = jwt.verify(token, this.accessTokenSecret) as DecodedToken;

      return {
        userId: decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AppError('Token expired', 401);
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new AppError('Invalid token', 401);
      } else if (error instanceof AppError) {
        throw error;
      }
      logger.error('Error verifying token:', { error });
      throw new AppError(`Failed to verify token: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Hash a password
   * @param password Plain text password
   * @returns Hashed password
   */
  async hashPassword(password: string): Promise<string> {
    try {
      return await hashPassword(password);
    } catch (error) {
      logger.error('Error hashing password:', { error });
      throw new AppError('Failed to hash password', 500);
    }
  }

  /**
   * Compare a password with a hash
   * @param password Plain text password
   * @param hash Hashed password
   * @returns True if password matches hash
   */
  async comparePassword(password: string, hash: string): Promise<boolean> {
    try {
      return await verifyPassword(hash, password);
    } catch (error) {
      logger.error('Error comparing password:', { error });
      throw new AppError('Failed to compare password', 500);
    }
  }

  /**
   * Generate authentication tokens for a user
   * @param user User object
   * @returns Authentication tokens
   */
  async generateTokens(user: UserDocument): Promise<AuthTokens> {
    try {
      // Get user role - user.role is always ObjectId
      const roleId = user.role;
      const role = await roleRepository.findById(roleId.toString());
      if (!role) {
        throw new AppError('User role not found', 500);
      }

      // Create payload with proper user ID handling
      const userId = user._id;
      const payload = {
        userId: userId.toString(),
        email: user.email,
        role: role.name,
        iat: Math.floor(Date.now() / 1000)
      };

      // Generate access token
      const accessTokenOptions: SignOptions = { expiresIn: this.accessTokenExpiry as StringValue };
      const accessToken = jwt.sign(
        payload,
        this.accessTokenSecret,
        accessTokenOptions
      );

      // Generate refresh token
      const refreshTokenOptions: SignOptions = { expiresIn: this.refreshTokenExpiry as StringValue };
      const refreshToken = jwt.sign(
        payload,
        this.refreshTokenSecret,
        refreshTokenOptions
      );

      return { accessToken, refreshToken };

    } catch (error) {
      logger.error('Error generating tokens:', { error });
      throw new AppError(`Failed to generate tokens: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Blacklist a token
   * @param token Token to blacklist
   * @param expiresAt Token expiration date
   * @returns True if successful
   */
  async blacklistToken(token: string, expiresAt: Date): Promise<boolean> {
    try {
      await tokenBlacklistRepository.addToBlacklist(token, expiresAt);
      return true;
    } catch (error) {
      logger.error('Error blacklisting token:', { error });
      return false;
    }
  }

  /**
   * Check if a token is blacklisted
   * @param token Token to check
   * @returns True if token is blacklisted
   */
  async isTokenBlacklisted(token: string): Promise<boolean> {
    try {
      return await tokenBlacklistRepository.isBlacklisted(token);
    } catch (error) {
      logger.error('Error checking token blacklist:', { error });
      // Default to treating token as blacklisted on error for security
      return true;
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

export default authService;