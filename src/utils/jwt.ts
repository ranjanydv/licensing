import jwt from 'jsonwebtoken';
import { JWTPayload } from '../interfaces/license.interface';
import { Logger } from './logger';
import { AppError } from '../middlewares/errorHandler';
import type { Secret, SignOptions } from 'jsonwebtoken';

const logger = new Logger('JWT');

/**
 * Generate a JWT token for a license
 * @param payload JWT payload
 * @returns JWT token string
 */
export const generateToken = (payload: JWTPayload): string => {
  try {
    const secret = process.env.JWT_SECRET as Secret;
    
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    let expiresIn: string | number = process.env.JWT_EXPIRES_IN || '30d';
    if (typeof expiresIn === 'string' && !isNaN(Number(expiresIn))) {
      expiresIn = Number(expiresIn);
    }
    const options: SignOptions = {
      expiresIn: expiresIn as any
    };
    return jwt.sign(payload, secret, options);
  } catch (error) {
    logger.error('Error generating JWT token:', { error });
    throw new AppError('Failed to generate license token', 500);
  }
};

/**
 * Verify a JWT token
 * @param token JWT token string
 * @returns Decoded JWT payload
 */
export const verifyToken = (token: string): JWTPayload => {
  try {
    const secret = process.env.JWT_SECRET;
    
    if (!secret) {
      throw new Error('JWT_SECRET is not defined in environment variables');
    }
    
    return jwt.verify(token, secret) as JWTPayload;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('License token has expired', 401);
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new AppError('Invalid license token', 401);
    } else {
      logger.error('Error verifying JWT token:', { error });
      throw new AppError('Failed to verify license token', 500);
    }
  }
};

/**
 * Decode a JWT token without verification
 * @param token JWT token string
 * @returns Decoded JWT payload
 */
export const decodeToken = (token: string): JWTPayload | null => {
  try {
    return jwt.decode(token) as JWTPayload;
  } catch (error) {
    logger.error('Error decoding JWT token:', { error });
    return null;
  }
};