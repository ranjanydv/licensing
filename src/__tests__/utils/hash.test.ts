import { 
  generateLicenseHash, 
  verifyLicenseHash, 
  hashPassword, 
  verifyPassword,
  generateRandomLicenseKey,
  generateHardwareFingerprint
} from '../../utils/hash';
import { License } from '../../interfaces/license.interface';

// Mock environment variables
process.env.LICENSE_HASH_SECRET = 'test_license_hash_secret';

describe('Hash Utilities', () => {
  describe('generateLicenseHash', () => {
    it('should generate a hash for license data', () => {
      const licenseData: Partial<License> = {
        schoolId: 'school123',
        schoolName: 'Test School',
        features: [
          { name: 'feature1', enabled: true },
          { name: 'feature2', enabled: false }
        ],
        issuedAt: new Date('2023-01-01'),
        expiresAt: new Date('2024-01-01')
      };
      
      const hash = generateLicenseHash(licenseData);
      
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash.length).toBe(64); // SHA-256 produces 64 character hex string
    });
    
    it('should generate the same hash for the same data', () => {
      const licenseData: Partial<License> = {
        schoolId: 'school123',
        schoolName: 'Test School',
        features: [
          { name: 'feature1', enabled: true }
        ],
        issuedAt: new Date('2023-01-01'),
        expiresAt: new Date('2024-01-01')
      };
      
      const hash1 = generateLicenseHash(licenseData);
      const hash2 = generateLicenseHash(licenseData);
      
      expect(hash1).toBe(hash2);
    });
    
    it('should generate different hashes for different data', () => {
      const licenseData1: Partial<License> = {
        schoolId: 'school123',
        schoolName: 'Test School',
        features: [{ name: 'feature1', enabled: true }],
        issuedAt: new Date('2023-01-01'),
        expiresAt: new Date('2024-01-01')
      };
      
      const licenseData2: Partial<License> = {
        schoolId: 'school456',
        schoolName: 'Another School',
        features: [{ name: 'feature1', enabled: true }],
        issuedAt: new Date('2023-01-01'),
        expiresAt: new Date('2024-01-01')
      };
      
      const hash1 = generateLicenseHash(licenseData1);
      const hash2 = generateLicenseHash(licenseData2);
      
      expect(hash1).not.toBe(hash2);
    });
    
    it('should throw an error if LICENSE_HASH_SECRET is not defined', () => {
      const originalSecret = process.env.LICENSE_HASH_SECRET;
      delete process.env.LICENSE_HASH_SECRET;
      
      const licenseData: Partial<License> = {
        schoolId: 'school123',
        schoolName: 'Test School'
      };
      
      expect(() => generateLicenseHash(licenseData)).toThrow();
      
      // Restore the environment variable
      process.env.LICENSE_HASH_SECRET = originalSecret;
    });
  });
  
  describe('verifyLicenseHash', () => {
    it('should verify a valid hash', () => {
      const licenseData: Partial<License> = {
        schoolId: 'school123',
        schoolName: 'Test School',
        features: [{ name: 'feature1', enabled: true }],
        issuedAt: new Date('2023-01-01'),
        expiresAt: new Date('2024-01-01')
      };
      
      const hash = generateLicenseHash(licenseData);
      const isValid = verifyLicenseHash(licenseData, hash);
      
      expect(isValid).toBe(true);
    });
    
    it('should reject an invalid hash', () => {
      const licenseData: Partial<License> = {
        schoolId: 'school123',
        schoolName: 'Test School',
        features: [{ name: 'feature1', enabled: true }],
        issuedAt: new Date('2023-01-01'),
        expiresAt: new Date('2024-01-01')
      };
      
      const invalidHash = 'invalid_hash';
      const isValid = verifyLicenseHash(licenseData, invalidHash);
      
      expect(isValid).toBe(false);
    });
    
    it('should reject if license data has changed', () => {
      const originalData: Partial<License> = {
        schoolId: 'school123',
        schoolName: 'Test School',
        features: [{ name: 'feature1', enabled: true }],
        issuedAt: new Date('2023-01-01'),
        expiresAt: new Date('2024-01-01')
      };
      
      const hash = generateLicenseHash(originalData);
      
      const modifiedData: Partial<License> = {
        ...originalData,
        schoolName: 'Modified School Name'
      };
      
      const isValid = verifyLicenseHash(modifiedData, hash);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('hashPassword and verifyPassword', () => {
    it('should hash a password and verify it correctly', async () => {
      const password = 'secure_password123';
      
      const hashedPassword = await hashPassword(password);
      
      expect(hashedPassword).toBeDefined();
      expect(typeof hashedPassword).toBe('string');
      expect(hashedPassword).not.toBe(password);
      
      const isValid = await verifyPassword(hashedPassword, password);
      expect(isValid).toBe(true);
    });
    
    it('should reject an incorrect password', async () => {
      const password = 'secure_password123';
      const wrongPassword = 'wrong_password';
      
      const hashedPassword = await hashPassword(password);
      const isValid = await verifyPassword(hashedPassword, wrongPassword);
      
      expect(isValid).toBe(false);
    });
  });
  
  describe('generateRandomLicenseKey', () => {
    it('should generate a random license key with correct format', () => {
      const key = generateRandomLicenseKey();
      
      expect(key).toBeDefined();
      expect(typeof key).toBe('string');
      
      // Format should be XXXXX-XXXXX-XXXXX-XXXXX
      expect(key).toMatch(/^[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}-[A-Z0-9]{5}$/);
    });
    
    it('should generate different keys on each call', () => {
      const key1 = generateRandomLicenseKey();
      const key2 = generateRandomLicenseKey();
      
      expect(key1).not.toBe(key2);
    });
  });
  
  describe('generateHardwareFingerprint', () => {
    it('should generate a fingerprint from hardware info', () => {
      const hardwareInfo = {
        cpuId: '12345',
        macAddress: '00:11:22:33:44:55',
        diskId: 'disk-123'
      };
      
      const fingerprint = generateHardwareFingerprint(hardwareInfo);
      
      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBe(64); // SHA-256 produces 64 character hex string
    });
    
    it('should generate the same fingerprint for the same hardware info', () => {
      const hardwareInfo = {
        cpuId: '12345',
        macAddress: '00:11:22:33:44:55',
        diskId: 'disk-123'
      };
      
      const fingerprint1 = generateHardwareFingerprint(hardwareInfo);
      const fingerprint2 = generateHardwareFingerprint(hardwareInfo);
      
      expect(fingerprint1).toBe(fingerprint2);
    });
    
    it('should generate different fingerprints for different hardware info', () => {
      const hardwareInfo1 = {
        cpuId: '12345',
        macAddress: '00:11:22:33:44:55',
        diskId: 'disk-123'
      };
      
      const hardwareInfo2 = {
        cpuId: '67890',
        macAddress: '66:77:88:99:AA:BB',
        diskId: 'disk-456'
      };
      
      const fingerprint1 = generateHardwareFingerprint(hardwareInfo1);
      const fingerprint2 = generateHardwareFingerprint(hardwareInfo2);
      
      expect(fingerprint1).not.toBe(fingerprint2);
    });
  });
});