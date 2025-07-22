import crypto from 'crypto';
import * as argon2 from 'argon2';
import { License } from '../interfaces/license.interface';
import { Logger } from './logger';
import { AppError } from '../middlewares/errorHandler';

const logger = new Logger('Hash');

/**
 * Generate a secure hash for license verification
 * Uses HMAC-SHA256 for fast verification
 * 
 * @param licenseData License data to hash
 * @returns Hash string
 */
export const generateLicenseHash = (licenseData: Partial<License>): string => {
  try {
    const secret = process.env.LICENSE_HASH_SECRET;
    
    if (!secret) {
      throw new Error('LICENSE_HASH_SECRET is not defined in environment variables');
    }
    
    // Create a string representation of the license data
    const dataToHash = JSON.stringify({
      schoolId: licenseData.schoolId,
      schoolName: licenseData.schoolName,
      features: licenseData.features?.map(f => ({ name: f.name, enabled: f.enabled })),
      issuedAt: licenseData.issuedAt,
      expiresAt: licenseData.expiresAt
    });
    
    // Create HMAC using SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(dataToHash);
    
    return hmac.digest('hex');
  } catch (error) {
    logger.error('Error generating license hash:', { error });
    throw new AppError('Failed to generate license hash', 500);
  }
};

/**
 * Verify a license hash
 * 
 * @param licenseData License data to verify
 * @param hash Hash to verify against
 * @returns Boolean indicating if hash is valid
 */
export const verifyLicenseHash = (licenseData: Partial<License>, hash: string): boolean => {
  try {
    const generatedHash = generateLicenseHash(licenseData);
    return crypto.timingSafeEqual(
      Buffer.from(generatedHash, 'hex'),
      Buffer.from(hash, 'hex')
    );
  } catch (error) {
    logger.error('Error verifying license hash:', { error });
    return false;
  }
};

/**
 * Generate a secure password hash using Argon2
 * Used for admin authentication, not for license verification
 * 
 * @param password Password to hash
 * @returns Hashed password
 */
export const hashPassword = async (password: string): Promise<string> => {
  try {
    return await argon2.hash(password, {
      type: argon2.argon2id, // Most secure variant
      memoryCost: 2 ** 16,   // 64 MiB
      timeCost: 3,           // 3 iterations
      parallelism: 1         // 1 thread
    });
  } catch (error) {
    logger.error('Error hashing password:', { error });
    throw new AppError('Failed to hash password', 500);
  }
};

/**
 * Verify a password against a hash using Argon2
 * 
 * @param hash Stored hash
 * @param password Password to verify
 * @returns Boolean indicating if password is valid
 */
export const verifyPassword = async (hash: string, password: string): Promise<boolean> => {
  try {
    return await argon2.verify(hash, password);
  } catch (error) {
    logger.error('Error verifying password:', { error });
    return false;
  }
};

/**
 * Generate a random license key (for use before JWT implementation)
 * 
 * @returns Random license key
 */
export const generateRandomLicenseKey = (): string => {
  const segments = 4;
  const segmentLength = 5;
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed confusing chars like O, 0, 1, I
  
  let key = '';
  
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < segmentLength; j++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      key += chars[randomIndex];
    }
    
    if (i < segments - 1) {
      key += '-';
    }
  }
  
  return key;
};

/**
 * Generate a fingerprint for hardware binding
 * 
 * @param hardwareInfo Hardware information
 * @returns Hardware fingerprint
 */
export const generateHardwareFingerprint = (hardwareInfo: Record<string, any>): string => {
  try {
    const dataToHash = JSON.stringify(hardwareInfo);
    const hash = crypto.createHash('sha256');
    hash.update(dataToHash);
    return hash.digest('hex');
  } catch (error) {
    logger.error('Error generating hardware fingerprint:', { error });
    throw new AppError('Failed to generate hardware fingerprint', 500);
  }
};