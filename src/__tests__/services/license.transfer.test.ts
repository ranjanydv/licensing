import { LicenseService } from '../../services/license.service';
import { licenseRepository } from '../../repositories/license.repository';
import { auditService } from '../../services/audit.service';
import { notificationService } from '../../services/notification.service';
import { LicenseStatus } from '../../interfaces/license.interface';
import { LicenseError } from '../../middlewares/errorHandler';
import { AuditActionType } from '../../models/audit-log.model';

// Mock dependencies
jest.mock('../../repositories/license.repository');
jest.mock('../../services/audit.service');
jest.mock('../../services/notification.service');
jest.mock('../../utils/jwt', () => ({
  generateToken: jest.fn().mockReturnValue('new-license-key'),
  verifyToken: jest.fn()
}));
jest.mock('../../utils/hash', () => ({
  generateLicenseHash: jest.fn().mockReturnValue('new-license-hash'),
  verifyLicenseHash: jest.fn().mockReturnValue(true)
}));

describe('License Service - Transfer Functionality', () => {
  let licenseService: LicenseService;
  
  // Sample license data
  const sampleLicense = {
    _id: 'license123',
    schoolId: 'school123',
    schoolName: 'Test School',
    licenseKey: 'license-key-123',
    licenseHash: 'hash-value-123',
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
  });
  
  describe('transferLicense', () => {
    it('should successfully transfer a license to a new school', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue(null);
      (licenseRepository.update as jest.Mock).mockImplementation((id, data) => {
        return Promise.resolve({
          ...sampleLicense,
          ...data
        });
      });
      
      // Transfer license
      const transferredLicense = await licenseService.transferLicense(
        sampleLicense._id,
        'new-school',
        'New School Name',
        'admin'
      );
      
      // Verify license was transferred
      expect(transferredLicense).toBeDefined();
      expect(transferredLicense?.schoolId).toBe('new-school');
      expect(transferredLicense?.schoolName).toBe('New School Name');
      expect(transferredLicense?.licenseKey).toBe('new-license-key');
      expect(transferredLicense?.licenseHash).toBe('new-license-hash');
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith('new-school');
      expect(licenseRepository.update).toHaveBeenCalledWith(
        sampleLicense._id,
        expect.objectContaining({
          schoolId: 'new-school',
          schoolName: 'New School Name',
          licenseKey: 'new-license-key',
          licenseHash: 'new-license-hash',
          updatedBy: 'admin'
        })
      );
      
      // Verify audit log was created
      expect(auditService.logAction).toHaveBeenCalledWith(
        sampleLicense._id,
        'license',
        AuditActionType.TRANSFER,
        'admin',
        expect.objectContaining({
          schoolId: sampleLicense.schoolId,
          schoolName: sampleLicense.schoolName
        }),
        expect.objectContaining({
          schoolId: 'new-school',
          schoolName: 'New School Name'
        }),
        expect.objectContaining({
          transferTimestamp: expect.any(Date),
          fromSchool: sampleLicense.schoolId,
          toSchool: 'new-school'
        })
      );
      
      // Verify notification was sent
      expect(notificationService.notifyLicenseTransfer).toHaveBeenCalledWith(
        expect.objectContaining({
          schoolId: 'new-school',
          schoolName: 'New School Name'
        }),
        sampleLicense.schoolId,
        sampleLicense.schoolName
      );
    });
    
    it('should throw an error when license does not exist', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Attempt to transfer license
      await expect(licenseService.transferLicense(
        'non-existent-id',
        'new-school',
        'New School Name',
        'admin'
      )).rejects.toThrow(LicenseError);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(licenseRepository.findActiveBySchoolId).not.toHaveBeenCalled();
      expect(licenseRepository.update).not.toHaveBeenCalled();
      
      // Verify audit log was not created
      expect(auditService.logAction).not.toHaveBeenCalled();
      
      // Verify notification was not sent
      expect(notificationService.notifyLicenseTransfer).not.toHaveBeenCalled();
    });
    
    it('should throw an error when target school already has an active license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue({
        _id: 'existing-license',
        schoolId: 'new-school',
        status: LicenseStatus.ACTIVE
      });
      
      // Attempt to transfer license
      await expect(licenseService.transferLicense(
        sampleLicense._id,
        'new-school',
        'New School Name',
        'admin'
      )).rejects.toThrow('Target school already has an active license');
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith('new-school');
      expect(licenseRepository.update).not.toHaveBeenCalled();
      
      // Verify audit log was not created
      expect(auditService.logAction).not.toHaveBeenCalled();
      
      // Verify notification was not sent
      expect(notificationService.notifyLicenseTransfer).not.toHaveBeenCalled();
    });
    
    it('should throw an error when license update fails', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue(null);
      (licenseRepository.update as jest.Mock).mockResolvedValue(null);
      
      // Attempt to transfer license
      await expect(licenseService.transferLicense(
        sampleLicense._id,
        'new-school',
        'New School Name',
        'admin'
      )).rejects.toThrow('Failed to transfer license');
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith('new-school');
      expect(licenseRepository.update).toHaveBeenCalledWith(
        sampleLicense._id,
        expect.objectContaining({
          schoolId: 'new-school',
          schoolName: 'New School Name'
        })
      );
      
      // Verify audit log was not created
      expect(auditService.logAction).not.toHaveBeenCalled();
      
      // Verify notification was not sent
      expect(notificationService.notifyLicenseTransfer).not.toHaveBeenCalled();
    });
    
    it('should handle transfer of expired licenses', async () => {
      // Create an expired license
      const expiredLicense = {
        ...sampleLicense,
        status: LicenseStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
      };
      
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(expiredLicense);
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue(null);
      (licenseRepository.update as jest.Mock).mockImplementation((id, data) => {
        return Promise.resolve({
          ...expiredLicense,
          ...data
        });
      });
      
      // Transfer license
      const transferredLicense = await licenseService.transferLicense(
        expiredLicense._id,
        'new-school',
        'New School Name',
        'admin'
      );
      
      // Verify license was transferred
      expect(transferredLicense).toBeDefined();
      expect(transferredLicense?.schoolId).toBe('new-school');
      expect(transferredLicense?.schoolName).toBe('New School Name');
      expect(transferredLicense?.status).toBe(LicenseStatus.EXPIRED); // Status should remain expired
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(expiredLicense._id);
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith('new-school');
      expect(licenseRepository.update).toHaveBeenCalledWith(
        expiredLicense._id,
        expect.objectContaining({
          schoolId: 'new-school',
          schoolName: 'New School Name'
        })
      );
      
      // Verify audit log was created
      expect(auditService.logAction).toHaveBeenCalled();
      
      // Verify notification was sent
      expect(notificationService.notifyLicenseTransfer).toHaveBeenCalled();
    });
    
    it('should preserve license features and metadata during transfer', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.findActiveBySchoolId as jest.Mock).mockResolvedValue(null);
      (licenseRepository.update as jest.Mock).mockImplementation((id, data) => {
        return Promise.resolve({
          ...sampleLicense,
          ...data
        });
      });
      
      // Transfer license
      const transferredLicense = await licenseService.transferLicense(
        sampleLicense._id,
        'new-school',
        'New School Name',
        'admin'
      );
      
      // Verify license features and metadata were preserved
      expect(transferredLicense).toBeDefined();
      expect(transferredLicense?.features).toEqual(sampleLicense.features);
      expect(transferredLicense?.metadata).toEqual(sampleLicense.metadata);
      expect(transferredLicense?.issuedAt).toEqual(sampleLicense.issuedAt);
      expect(transferredLicense?.expiresAt).toEqual(sampleLicense.expiresAt);
    });
  });
});