import { LicenseService } from '../../services/license.service';
import { licenseRepository } from '../../repositories/license.repository';
import { LicenseStatus } from '../../interfaces/license.interface';
import { generateToken } from '../../utils/jwt';
import { generateLicenseHash } from '../../utils/hash';

// Mock the license repository
jest.mock('../../repositories/license.repository');

describe('License Service - Validation', () => {
  let licenseService: LicenseService;
  
  // Sample license data
  const sampleLicense = {
    _id: 'license123',
    schoolId: 'school123',
    schoolName: 'Test School',
    features: [
      { name: 'feature1', enabled: true },
      { name: 'feature2', enabled: false }
    ],
    issuedAt: new Date('2023-01-01'),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    lastChecked: new Date(),
    status: LicenseStatus.ACTIVE,
    metadata: { plan: 'premium' },
    createdBy: 'admin',
    updatedBy: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  beforeEach(() => {
    licenseService = new LicenseService();
    jest.clearAllMocks();
    
    // Generate a real license key and hash for the sample license
    const jwtPayload = {
      sub: sampleLicense.schoolId,
      iss: 'license-management-system',
      iat: Math.floor(sampleLicense.issuedAt.getTime() / 1000),
      exp: Math.floor(sampleLicense.expiresAt.getTime() / 1000),
      schoolName: sampleLicense.schoolName,
      features: sampleLicense.features.map(f => f.name),
      licenseId: sampleLicense._id,
      metadata: sampleLicense.metadata
    };
    
    sampleLicense.licenseKey = generateToken(jwtPayload);
    sampleLicense.licenseHash = generateLicenseHash(sampleLicense);
  });
  
  describe('validateLicense', () => {
    it('should validate a valid license', async () => {
      // Mock repository methods
      (licenseRepository.findByLicenseKey as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.update as jest.Mock).mockResolvedValue(sampleLicense);
      
      // Validate license
      const result = await licenseService.validateLicense(
        sampleLicense.licenseKey,
        sampleLicense.schoolId
      );
      
      // Verify validation result
      expect(result.valid).toBe(true);
      expect(result.license).toBeDefined();
      expect(result.expiresIn).toBeGreaterThan(0);
      
      // Verify repository methods were called
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(sampleLicense.licenseKey);
      expect(licenseRepository.update).toHaveBeenCalled();
    });
    
    it('should reject an invalid JWT token', async () => {
      // Validate with invalid token
      const result = await licenseService.validateLicense(
        'invalid-token',
        sampleLicense.schoolId
      );
      
      // Verify validation result
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors?.length).toBeGreaterThan(0);
      
      // Verify repository methods were not called
      expect(licenseRepository.findByLicenseKey).not.toHaveBeenCalled();
    });
    
    it('should reject if school ID does not match', async () => {
      // Validate with different school ID
      const result = await licenseService.validateLicense(
        sampleLicense.licenseKey,
        'different-school'
      );
      
      // Verify validation result
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('License does not match school ID');
      
      // Verify repository methods were not called
      expect(licenseRepository.findByLicenseKey).not.toHaveBeenCalled();
    });
    
    it('should reject if license is not found in database', async () => {
      // Mock repository methods
      (licenseRepository.findByLicenseKey as jest.Mock).mockResolvedValue(null);
      
      // Validate license
      const result = await licenseService.validateLicense(
        sampleLicense.licenseKey,
        sampleLicense.schoolId
      );
      
      // Verify validation result
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('License not found in database');
      
      // Verify repository methods were called
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(sampleLicense.licenseKey);
    });
    
    it('should reject if license hash verification fails', async () => {
      // Mock repository methods with tampered hash
      const tamperedLicense = {
        ...sampleLicense,
        licenseHash: 'tampered-hash'
      };
      (licenseRepository.findByLicenseKey as jest.Mock).mockResolvedValue(tamperedLicense);
      
      // Validate license
      const result = await licenseService.validateLicense(
        sampleLicense.licenseKey,
        sampleLicense.schoolId
      );
      
      // Verify validation result
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('License hash verification failed');
      
      // Verify repository methods were called
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(sampleLicense.licenseKey);
    });
    
    it('should reject if license is not active', async () => {
      // Mock repository methods with revoked license
      const revokedLicense = {
        ...sampleLicense,
        status: LicenseStatus.REVOKED
      };
      revokedLicense.licenseHash = generateLicenseHash(revokedLicense);
      (licenseRepository.findByLicenseKey as jest.Mock).mockResolvedValue(revokedLicense);
      
      // Validate license
      const result = await licenseService.validateLicense(
        sampleLicense.licenseKey,
        sampleLicense.schoolId
      );
      
      // Verify validation result
      expect(result.valid).toBe(false);
      expect(result.errors).toContain(`License is ${LicenseStatus.REVOKED}`);
      
      // Verify repository methods were called
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(sampleLicense.licenseKey);
    });
    
    it('should reject and update status if license has expired', async () => {
      // Mock repository methods with expired license
      const expiredLicense = {
        ...sampleLicense,
        expiresAt: new Date(Date.now() - 1000) // Expired
      };
      expiredLicense.licenseHash = generateLicenseHash(expiredLicense);
      (licenseRepository.findByLicenseKey as jest.Mock).mockResolvedValue(expiredLicense);
      (licenseRepository.updateStatus as jest.Mock).mockResolvedValue({
        ...expiredLicense,
        status: LicenseStatus.EXPIRED
      });
      
      // Validate license
      const result = await licenseService.validateLicense(
        sampleLicense.licenseKey,
        sampleLicense.schoolId
      );
      
      // Verify validation result
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('License has expired');
      
      // Verify repository methods were called
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(sampleLicense.licenseKey);
      expect(licenseRepository.updateStatus).toHaveBeenCalledWith(
        expiredLicense._id,
        LicenseStatus.EXPIRED
      );
    });
    
    it('should not update lastChecked if checkRevocation is false', async () => {
      // Mock repository methods
      (licenseRepository.findByLicenseKey as jest.Mock).mockResolvedValue(sampleLicense);
      
      // Validate license without revocation check
      await licenseService.validateLicense(
        sampleLicense.licenseKey,
        sampleLicense.schoolId,
        false
      );
      
      // Verify repository methods were called
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(sampleLicense.licenseKey);
      expect(licenseRepository.update).not.toHaveBeenCalled();
    });
  });
});