import { LicenseService } from '../../services/license.service';
import { licenseRepository } from '../../repositories/license.repository';
import { LicenseStatus } from '../../interfaces/license.interface';
import { LicenseError } from '../../middlewares/errorHandler';

// Mock the license repository
jest.mock('../../repositories/license.repository');

describe('License Service - Management', () => {
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
  
  describe('getLicense', () => {
    it('should get a license by ID', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      
      // Get license
      const license = await licenseService.getLicense(sampleLicense._id);
      
      // Verify license was returned
      expect(license).toBeDefined();
      expect(license?._id).toBe(sampleLicense._id);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
    });
    
    it('should return null for non-existent license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Get license
      const license = await licenseService.getLicense('non-existent-id');
      
      // Verify null was returned
      expect(license).toBeNull();
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith('non-existent-id');
    });
  });
  
  describe('getAllLicenses', () => {
    it('should get all licenses', async () => {
      // Mock repository methods
      (licenseRepository.findAll as jest.Mock).mockResolvedValue([sampleLicense]);
      
      // Get all licenses
      const licenses = await licenseService.getAllLicenses();
      
      // Verify licenses were returned
      expect(licenses).toHaveLength(1);
      expect(licenses[0]._id).toBe(sampleLicense._id);
      
      // Verify repository methods were called
      expect(licenseRepository.findAll).toHaveBeenCalledWith(undefined);
    });
    
    it('should get licenses with filter', async () => {
      // Mock repository methods
      (licenseRepository.findAll as jest.Mock).mockResolvedValue([sampleLicense]);
      
      // Get licenses with filter
      const filter = { status: LicenseStatus.ACTIVE };
      const licenses = await licenseService.getAllLicenses(filter);
      
      // Verify licenses were returned
      expect(licenses).toHaveLength(1);
      
      // Verify repository methods were called
      expect(licenseRepository.findAll).toHaveBeenCalledWith(filter);
    });
  });
  
  describe('updateLicense', () => {
    it('should update a license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.update as jest.Mock).mockResolvedValue({
        ...sampleLicense,
        schoolName: 'Updated School Name',
        metadata: { plan: 'enterprise' }
      });
      
      // Update data
      const updateData = {
        schoolName: 'Updated School Name',
        metadata: { plan: 'enterprise' }
      };
      
      // Update license
      const updatedLicense = await licenseService.updateLicense(
        sampleLicense._id,
        updateData,
        'admin'
      );
      
      // Verify license was updated
      expect(updatedLicense).toBeDefined();
      expect(updatedLicense?.schoolName).toBe('Updated School Name');
      expect(updatedLicense?.metadata.plan).toBe('enterprise');
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.update).toHaveBeenCalledWith(
        sampleLicense._id,
        expect.objectContaining({
          schoolName: 'Updated School Name',
          metadata: { plan: 'enterprise' },
          updatedBy: 'admin'
        })
      );
    });
    
    it('should throw an error for non-existent license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Update data
      const updateData = {
        schoolName: 'Updated School Name'
      };
      
      // Attempt to update license
      await expect(licenseService.updateLicense(
        'non-existent-id',
        updateData,
        'admin'
      )).rejects.toThrow(LicenseError);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(licenseRepository.update).not.toHaveBeenCalled();
    });
    
    it('should update license key and hash when features are updated', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.update as jest.Mock).mockImplementation((id, data) => {
        return Promise.resolve({
          ...sampleLicense,
          ...data
        });
      });
      
      // Update data with features
      const updateData = {
        features: [
          { name: 'feature1', enabled: true },
          { name: 'feature2', enabled: true },
          { name: 'feature3', enabled: true }
        ]
      };
      
      // Update license
      const updatedLicense = await licenseService.updateLicense(
        sampleLicense._id,
        updateData,
        'admin'
      );
      
      // Verify license was updated
      expect(updatedLicense).toBeDefined();
      expect(updatedLicense?.features).toHaveLength(3);
      expect(updatedLicense?.licenseKey).toBeDefined();
      expect(updatedLicense?.licenseHash).toBeDefined();
      expect(updatedLicense?.licenseKey).not.toBe(sampleLicense.licenseKey);
      expect(updatedLicense?.licenseHash).not.toBe(sampleLicense.licenseHash);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.update).toHaveBeenCalledWith(
        sampleLicense._id,
        expect.objectContaining({
          features: updateData.features,
          licenseKey: expect.any(String),
          licenseHash: expect.any(String),
          updatedBy: 'admin'
        })
      );
    });
  });
  
  describe('revokeLicense', () => {
    it('should revoke a license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.update as jest.Mock).mockResolvedValue({
        ...sampleLicense,
        status: LicenseStatus.REVOKED
      });
      
      // Revoke license
      const result = await licenseService.revokeLicense(sampleLicense._id, 'admin');
      
      // Verify license was revoked
      expect(result).toBe(true);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.update).toHaveBeenCalledWith(
        sampleLicense._id,
        expect.objectContaining({
          status: LicenseStatus.REVOKED,
          updatedBy: 'admin'
        })
      );
    });
    
    it('should return false for non-existent license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Attempt to revoke license
      const result = await licenseService.revokeLicense('non-existent-id', 'admin');
      
      // Verify result
      expect(result).toBe(false);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(licenseRepository.update).not.toHaveBeenCalled();
    });
  });
  
  describe('renewLicense', () => {
    it('should renew an active license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(sampleLicense);
      (licenseRepository.update as jest.Mock).mockImplementation((id, data) => {
        return Promise.resolve({
          ...sampleLicense,
          ...data
        });
      });
      
      // Renew license
      const renewedLicense = await licenseService.renewLicense(
        sampleLicense._id,
        365,
        'admin'
      );
      
      // Verify license was renewed
      expect(renewedLicense).toBeDefined();
      expect(renewedLicense?.expiresAt.getTime()).toBeGreaterThan(sampleLicense.expiresAt.getTime());
      expect(renewedLicense?.status).toBe(LicenseStatus.ACTIVE);
      expect(renewedLicense?.licenseKey).not.toBe(sampleLicense.licenseKey);
      expect(renewedLicense?.licenseHash).not.toBe(sampleLicense.licenseHash);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.update).toHaveBeenCalledWith(
        sampleLicense._id,
        expect.objectContaining({
          expiresAt: expect.any(Date),
          licenseKey: expect.any(String),
          licenseHash: expect.any(String),
          status: LicenseStatus.ACTIVE,
          updatedBy: 'admin'
        })
      );
    });
    
    it('should renew an expired license', async () => {
      // Mock repository methods with expired license
      const expiredLicense = {
        ...sampleLicense,
        expiresAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        status: LicenseStatus.EXPIRED
      };
      (licenseRepository.findById as jest.Mock).mockResolvedValue(expiredLicense);
      (licenseRepository.update as jest.Mock).mockImplementation((id, data) => {
        return Promise.resolve({
          ...expiredLicense,
          ...data
        });
      });
      
      // Renew license
      const renewedLicense = await licenseService.renewLicense(
        expiredLicense._id,
        365,
        'admin'
      );
      
      // Verify license was renewed
      expect(renewedLicense).toBeDefined();
      expect(renewedLicense?.expiresAt.getTime()).toBeGreaterThan(Date.now());
      expect(renewedLicense?.status).toBe(LicenseStatus.ACTIVE);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(expiredLicense._id);
      expect(licenseRepository.update).toHaveBeenCalledWith(
        expiredLicense._id,
        expect.objectContaining({
          expiresAt: expect.any(Date),
          licenseKey: expect.any(String),
          licenseHash: expect.any(String),
          status: LicenseStatus.ACTIVE,
          updatedBy: 'admin'
        })
      );
    });
    
    it('should throw an error for non-existent license', async () => {
      // Mock repository methods
      (licenseRepository.findById as jest.Mock).mockResolvedValue(null);
      
      // Attempt to renew license
      await expect(licenseService.renewLicense(
        'non-existent-id',
        365,
        'admin'
      )).rejects.toThrow(LicenseError);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith('non-existent-id');
      expect(licenseRepository.update).not.toHaveBeenCalled();
    });
  });
  
  describe('transferLicense', () => {
    it('should transfer a license to a new school', async () => {
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
      expect(transferredLicense?.licenseKey).not.toBe(sampleLicense.licenseKey);
      expect(transferredLicense?.licenseHash).not.toBe(sampleLicense.licenseHash);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith('new-school');
      expect(licenseRepository.update).toHaveBeenCalledWith(
        sampleLicense._id,
        expect.objectContaining({
          schoolId: 'new-school',
          schoolName: 'New School Name',
          licenseKey: expect.any(String),
          licenseHash: expect.any(String),
          updatedBy: 'admin'
        })
      );
    });
    
    it('should throw an error for non-existent license', async () => {
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
      expect(licenseRepository.update).not.toHaveBeenCalled();
    });
    
    it('should throw an error if target school already has an active license', async () => {
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
      )).rejects.toThrow(LicenseError);
      
      // Verify repository methods were called
      expect(licenseRepository.findById).toHaveBeenCalledWith(sampleLicense._id);
      expect(licenseRepository.findActiveBySchoolId).toHaveBeenCalledWith('new-school');
      expect(licenseRepository.update).not.toHaveBeenCalled();
    });
  });
  
  describe('checkLicenses', () => {
    it('should check all licenses and generate a report', async () => {
      // Mock licenses
      const activeLicense = { ...sampleLicense };
      const expiredLicense = {
        ...sampleLicense,
        _id: 'expired-license',
        schoolId: 'school456',
        schoolName: 'Expired School',
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: LicenseStatus.ACTIVE // Still marked as active
      };
      const revokedLicense = {
        ...sampleLicense,
        _id: 'revoked-license',
        schoolId: 'school789',
        schoolName: 'Revoked School',
        status: LicenseStatus.REVOKED
      };
      
      // Mock repository methods
      (licenseRepository.findAll as jest.Mock).mockResolvedValue([
        activeLicense,
        expiredLicense,
        revokedLicense
      ]);
      (licenseRepository.updateStatus as jest.Mock).mockResolvedValue({
        ...expiredLicense,
        status: LicenseStatus.EXPIRED
      });
      (licenseRepository.update as jest.Mock).mockImplementation((id, data) => {
        if (id === activeLicense._id) {
          return Promise.resolve({
            ...activeLicense,
            ...data
          });
        }
        return Promise.resolve(null);
      });
      
      // Check licenses
      const report = await licenseService.checkLicenses();
      
      // Verify report
      expect(report).toBeDefined();
      expect(report.totalChecked).toBe(3);
      expect(report.active).toBe(1);
      expect(report.expired).toBe(1);
      expect(report.revoked).toBe(1);
      expect(report.failed).toBe(0);
      expect(report.details).toHaveLength(3);
      
      // Verify repository methods were called
      expect(licenseRepository.findAll).toHaveBeenCalled();
      expect(licenseRepository.updateStatus).toHaveBeenCalledWith(
        expiredLicense._id,
        LicenseStatus.EXPIRED
      );
      expect(licenseRepository.update).toHaveBeenCalledWith(
        activeLicense._id,
        expect.objectContaining({
          lastChecked: expect.any(Date)
        })
      );
    });
  });
});