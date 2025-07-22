import crypto from 'crypto';
import { Logger } from './logger';
import { AppError } from '../middlewares/errorHandler';

// Algorithm to use for encryption
const ALGORITHM = 'aes-256-gcm';

const logger = new Logger('Encryption');

/**
 * Encrypt sensitive data
 * 
 * @param data Data to encrypt
 * @param key Encryption key (defaults to LICENSE_HASH_SECRET)
 * @returns Encrypted data object with iv, tag, and encrypted data
 */
export const encrypt = (data: string, key?: string): { iv: string; tag: string; encryptedData: string } => {
  try {
    const encryptionKey = key || process.env.LICENSE_HASH_SECRET;

    if (!encryptionKey) {
      throw new Error('Encryption key is not defined');
    }

    // Create a 32-byte key from the provided key
    const keyBuffer = crypto.createHash('sha256').update(encryptionKey).digest();

    // Generate a random initialization vector
    const iv = crypto.randomBytes(16);

    // Create cipher
    const cipher = crypto.createCipheriv(ALGORITHM, keyBuffer, iv);

    // Encrypt the data
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    // Get the authentication tag
    const tag = cipher.getAuthTag();

    return {
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
      encryptedData: encrypted
    };
  } catch (error) {
    logger.error('Error encrypting data:', { error });
    throw new AppError('Failed to encrypt data', 500);
  }
};

/**
 * Decrypt encrypted data
 * 
 * @param encryptedData Encrypted data
 * @param iv Initialization vector
 * @param tag Authentication tag
 * @param key Encryption key (defaults to LICENSE_HASH_SECRET)
 * @returns Decrypted data
 */
export const decrypt = (encryptedData: string, iv: string, tag: string, key?: string): string => {
  try {
    const encryptionKey = key || process.env.LICENSE_HASH_SECRET;

    if (!encryptionKey) {
      throw new Error('Encryption key is not defined');
    }

    // Create a 32-byte key from the provided key
    const keyBuffer = crypto.createHash('sha256').update(encryptionKey).digest();

    // Convert iv and tag from hex to Buffer
    const ivBuffer = Buffer.from(iv, 'hex');
    const tagBuffer = Buffer.from(tag, 'hex');

    // Create decipher
    const decipher = crypto.createDecipheriv(ALGORITHM, keyBuffer, ivBuffer);
    decipher.setAuthTag(tagBuffer);

    // Decrypt the data
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logger.error('Error decrypting data:', { error });
    throw new AppError('Failed to decrypt data', 500);
  }
};

/**
 * Encrypt an object
 * 
 * @param obj Object to encrypt 
 * @param key Encryption key (defaults to LICENSE_HASH_SECRET)
 * @returns Encrypted object string
 */
export const encryptObject = (obj: Record<string, any>, key?: string): string => {
  const jsonString = JSON.stringify(obj);
  const encrypted = encrypt(jsonString, key);
  return JSON.stringify(encrypted);
};

/**
 * Decrypt an encrypted object
 * 
 * @param encryptedString Encrypted object string
 * @param key Encryption key (defaults to LICENSE_HASH_SECRET)
 * @returns Decrypted object
 */
export const decryptObject = <T>(encryptedString: string, key?: string): T => {
  const { iv, tag, encryptedData } = JSON.parse(encryptedString);
  const decrypted = decrypt(encryptedData, iv, tag, key);
  return JSON.parse(decrypted) as T;
};