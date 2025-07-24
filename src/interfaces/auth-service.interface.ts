import { IUser, IRole, AuthTokens, RegisterDTO, LoginDTO, AuthResponseDTO } from './auth.interface';

/**
 * Authentication service interface
 */
export interface IAuthService {
  /**
   * Register a new user
   * @param registerData User registration data
   * @returns Authentication response with user and tokens
   */
  register(registerData: RegisterDTO): Promise<AuthResponseDTO>;
  
  /**
   * Login a user
   * @param loginData User login credentials
   * @returns Authentication response with user and tokens
   */
  login(loginData: LoginDTO): Promise<AuthResponseDTO>;
  
  /**
   * Logout a user
   * @param userId User ID
   * @param token Access token to blacklist
   * @returns True if successful
   */
  logout(userId: string, token: string): Promise<boolean>;
  
  /**
   * Refresh access token using refresh token
   * @param refreshToken Refresh token
   * @returns New authentication tokens
   */
  refreshToken(refreshToken: string): Promise<AuthTokens>;
  
  /**
   * Verify access token
   * @param token Access token
   * @returns Decoded token payload if valid
   */
  verifyToken(token: string): Promise<{ userId: string; email: string; role: string }>;
  
  /**
   * Hash a password
   * @param password Plain text password
   * @returns Hashed password
   */
  hashPassword(password: string): Promise<string>;
  
  /**
   * Compare a password with a hash
   * @param password Plain text password
   * @param hash Hashed password
   * @returns True if password matches hash
   */
  comparePassword(password: string, hash: string): Promise<boolean>;
  
  /**
   * Generate authentication tokens for a user
   * @param user User object
   * @returns Authentication tokens
   */
  generateTokens(user: IUser): Promise<AuthTokens>;
  
  /**
   * Blacklist a token
   * @param token Token to blacklist
   * @param expiresAt Token expiration date
   * @returns True if successful
   */
  blacklistToken(token: string, expiresAt: Date): Promise<boolean>;
  
  /**
   * Check if a token is blacklisted
   * @param token Token to check
   * @returns True if token is blacklisted
   */
  isTokenBlacklisted(token: string): Promise<boolean>;
}