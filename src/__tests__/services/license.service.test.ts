import { LicenseService } from '../../services/license.service';
import { licenseRepository } from '../../repositories/license.repository';
import { LicenseStatus, LicenseRequest } from '../../interfaces/license.interface';
import { verifyToken } from '../../utils/jwt';
import { verifyLicenseHash } from '../../utils/hash';
import { LicenseError } from '../../middlewares/errorHandler';

// Mock the license repository
jest.mock('../../repositories/license.repository');

describe('License Service - Generation', () => {
  let licenseService: LicenseService;
  
  // Sample license request data
  const sampleLicenseRequest: LicenseRequest = {
    schoolId: 'school123',
    schoolName: 'Test School',
    duration: 365,
    features: [
      { name: 'feature1', enabled: true },
      { name: 'feature2', enabled: false, restrictions: { maxUsers: 10 } }
    ],
    metadata: { plan: 'premium' },
    createdBy: 'admin'
  };
  
  beforeEach(() => {
    licenseService = new LicenseService();
    jest.clearAllMocks();
  });
  
  describe('generateLicense', () => {
    it('should generate a license successfully', async () => {
      // Mock repository methods
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue(null);
      (licenseRepository.create as jest.Mock).mockResolvedValue({
        _id: 'license123',
        ...sampleLicenseRequest,
        licenseKey: 'mock-license-key',
        licenseHash: 'mock-license-hash',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lastChecked: new Date(),
        status: LicenseStatus.ACTIVE,
        updatedBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      (licenseRepository.update as jest.Mock).mockResolvedValue({
        _id: 'license123',
        ...sampleLicenseRequest,
        licenseKey: 'mock-updated-license-key',
        licenseHash: 'mock-license-hash',
        issuedAt: new Date(),
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        lastChecked: new Date(),
        status: LicenseStatus.ACTIVE,
        updatedBy: 'admin',
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      // Generate license
      const license = await licenseService.generateLicense(sampleLicenseRequest);
      
      // Verify license was created
      expect(license).toBeDefined();
      expect(license._id).toBe('license123');
      expect(license.schoolId).toBe(sampleLicenseRequest.schoolId);
      expect(license.schoolName).toBe(sampleLicenseRequest.schoolName);
      expect(license.status).toBe(LicenseStatus.ACTIVE);
      
      // Verify repository methods were called
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith(sampleLicenseRequest.schoolId);
      expect(licenseRepository.create).toHaveBeenCalled();
      expect(licenseRepository.update).toHaveBeenCalled();
    });
    
    it('should throw an error if school already has an active license', async () => {
      // Mock repository methods
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue({
        _id: 'existing-license',
        schoolId: sampleLicenseRequest.schoolId,
        status: LicenseStatus.ACTIVE
      });
      
      // Attempt to generate license
      await expect(licenseService.generateLicense(sampleLicenseRequest))
        .rejects.toThrow(LicenseError);
      
      // Verify repository methods were called
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith(sampleLicenseRequest.schoolId);
      expect(licenseRepository.create).not.toHaveBeenCalled();
    });
    
    it('should generate a valid JWT token and license hash', async () => {
      // Mock current date for consistent testing
      const mockDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as unknown as string);
      
      // Mock repository methods
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue(null);
      
      // Mock license creation with actual implementation for licenseKey and licenseHash
      (licenseRepository.create as jest.Mock).mockImplementation(async (data) => {
        return {
          _id: 'license123',
          ...data,
          createdAt: mockDate,
          updatedAt: mockDate
        };
      });
      
      // Mock license update with actual implementation
      (licenseRepository.update as jest.Mock).mockImplementation(async (id, data) => {
        return {
          _id: id,
          ...sampleLicenseRequest,
          ...data,
          issuedAt: mockDate,
          expiresAt: new Date(mockDate.getTime() + 365 * 24 * 60 * 60 * 1000),
          lastChecked: mockDate,
          status: LicenseStatus.ACTIVE,
          createdAt: mockDate,
          updatedAt: mockDate
        };
      });
      
      // Generate license
      const license = await licenseService.generateLicense(sampleLicenseRequest);
      
      // Verify license was created
      expect(license).toBeDefined();
      expect(license.licenseKey).toBeDefined();
      expect(license.licenseHash).toBeDefined();
      
      // Verify JWT token can be decoded
      const decodedToken = verifyToken(license.licenseKey);
      expect(decodedToken).toBeDefined();
      expect(decodedToken.sub).toBe(sampleLicenseRequest.schoolId);
      expect(decodedToken.schoolName).toBe(sampleLicenseRequest.schoolName);
      expect(decodedToken.licenseId).toBe('license123');
      
      // Restore Date
      jest.restoreAllMocks();
    });
  });
});