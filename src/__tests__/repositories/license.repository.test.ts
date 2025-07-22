import mongoose from 'mongoose';
import { LicenseRepository } from '../../repositories/license.repository';
import { LicenseModel } from '../../models/license.model';
import { License, LicenseStatus } from '../../interfaces/license.interface';

describe('License Repository', () => {
  let licenseRepository: LicenseRepository;
  
  // Sample license data
  const sampleLicense = {
    schoolId: 'school123',
    schoolName: 'Test School',
    licenseKey: 'license-key-123',
    licenseHash: 'hash-value-123',
    features: [
      { name: 'feature1', enabled: true },
      { name: 'feature2', enabled: false }
    ],
    issuedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    lastChecked: new Date(),
    status: LicenseStatus.ACTIVE,
    metadata: { plan: 'premium' },
    createdBy: 'admin',
    updatedBy: 'admin'
  };
  
  beforeEach(async () => {
    licenseRepository = new LicenseRepository();
    await LicenseModel.deleteMany({});
  });
  
  describe('create', () => {
    it('should create a license successfully', async () => {
      const license = await licenseRepository.create(sampleLicense);
      
      expect(license).toBeDefined();
      expect(license._id).toBeDefined();
      expect(license.schoolId).toBe(sampleLicense.schoolId);
      expect(license.schoolName).toBe(sampleLicense.schoolName);
      expect(license.status).toBe(LicenseStatus.ACTIVE);
    });
  });
  
  describe('findById', () => {
    it('should find a license by ID', async () => {
      const createdLicense = await licenseRepository.create(sampleLicense);
      const foundLicense = await licenseRepository.findById(createdLicense._id.toString());
      
      expect(foundLicense).toBeDefined();
      expect(foundLicense?._id.toString()).toBe(createdLicense._id.toString());
    });
    
    it('should return null for non-existent ID', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const foundLicense = await licenseRepository.findById(nonExistentId);
      
      expect(foundLicense).toBeNull();
    });
    
    it('should throw error for invalid ID format', async () => {
      await expect(licenseRepository.findById('invalid-id')).rejects.toThrow();
    });
  });
  
  describe('findBySchoolId', () => {
    it('should find a license by school ID', async () => {
      await licenseRepository.create(sampleLicense);
      const foundLicense = await licenseRepository.findBySchoolId(sampleLicense.schoolId);
      
      expect(foundLicense).toBeDefined();
      expect(foundLicense?.schoolId).toBe(sampleLicense.schoolId);
    });
    
    it('should return null for non-existent school ID', async () => {
      const foundLicense = await licenseRepository.findBySchoolId('non-existent-school');
      
      expect(foundLicense).toBeNull();
    });
  });
  
  describe('findActiveBySchoolId', () => {
    it('should find an active license by school ID', async () => {
      await licenseRepository.create(sampleLicense);
      const foundLicense = await licenseRepository.findActiveBySchoolId(sampleLicense.schoolId);
      
      expect(foundLicense).toBeDefined();
      expect(foundLicense?.schoolId).toBe(sampleLicense.schoolId);
      expect(foundLicense?.status).toBe(LicenseStatus.ACTIVE);
    });
    
    it('should not find expired licenses', async () => {
      const expiredLicense = {
        ...sampleLicense,
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: LicenseStatus.EXPIRED
      };
      
      await licenseRepository.create(expiredLicense);
      const foundLicense = await licenseRepository.findActiveBySchoolId(expiredLicense.schoolId);
      
      expect(foundLicense).toBeNull();
    });
  });
  
  describe('findExpired', () => {
    it('should find expired licenses', async () => {
      // Create an active license
      await licenseRepository.create(sampleLicense);
      
      // Create an expired license
      const expiredLicense = {
        ...sampleLicense,
        schoolId: 'school456',
        licenseKey: 'expired-key',
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: LicenseStatus.EXPIRED
      };
      await licenseRepository.create(expiredLicense);
      
      const expiredLicenses = await licenseRepository.findExpired();
      
      expect(expiredLicenses).toHaveLength(1);
      expect(expiredLicenses[0].schoolId).toBe('school456');
      expect(expiredLicenses[0].status).toBe(LicenseStatus.EXPIRED);
    });
    
    it('should find active licenses that have passed expiration date', async () => {
      // Create an active but expired license
      const activeButExpired = {
        ...sampleLicense,
        schoolId: 'school789',
        licenseKey: 'active-but-expired',
        expiresAt: new Date(Date.now() - 1000), // Expired
        status: LicenseStatus.ACTIVE // But still marked as active
      };
      await licenseRepository.create(activeButExpired);
      
      const expiredLicenses = await licenseRepository.findExpired();
      
      expect(expiredLicenses).toHaveLength(1);
      expect(expiredLicenses[0].schoolId).toBe('school789');
    });
  });
  
  describe('findExpiring', () => {
    it('should find licenses expiring soon', async () => {
      // Create a license expiring in 5 days
      const expiringLicense = {
        ...sampleLicense,
        schoolId: 'school456',
        licenseKey: 'expiring-key',
        expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
      };
      await licenseRepository.create(expiringLicense);
      
      // Create a license expiring in 20 days
      const notExpiringYetLicense = {
        ...sampleLicense,
        schoolId: 'school789',
        licenseKey: 'not-expiring-yet',
        expiresAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000)
      };
      await licenseRepository.create(notExpiringYetLicense);
      
      // Find licenses expiring in the next 7 days
      const expiringLicenses = await licenseRepository.findExpiring(7);
      
      expect(expiringLicenses).toHaveLength(1);
      expect(expiringLicenses[0].schoolId).toBe('school456');
    });
  });
  
  describe('updateStatus', () => {
    it('should update license status', async () => {
      const license = await licenseRepository.create(sampleLicense);
      const updatedLicense = await licenseRepository.updateStatus(
        license._id.toString(),
        LicenseStatus.REVOKED
      );
      
      expect(updatedLicense).toBeDefined();
      expect(updatedLicense?.status).toBe(LicenseStatus.REVOKED);
    });
  });
  
  describe('findByLicenseKey', () => {
    it('should find a license by license key', async () => {
      await licenseRepository.create(sampleLicense);
      const foundLicense = await licenseRepository.findByLicenseKey(sampleLicense.licenseKey);
      
      expect(foundLicense).toBeDefined();
      expect(foundLicense?.licenseKey).toBe(sampleLicense.licenseKey);
    });
    
    it('should return null for non-existent license key', async () => {
      const foundLicense = await licenseRepository.findByLicenseKey('non-existent-key');
      
      expect(foundLicense).toBeNull();
    });
  });
  
  describe('findAll', () => {
    it('should find all licenses matching filter', async () => {
      // Create multiple licenses
      await licenseRepository.create(sampleLicense);
      await licenseRepository.create({
        ...sampleLicense,
        schoolId: 'school456',
        licenseKey: 'license-key-456',
        status: LicenseStatus.REVOKED
      });
      await licenseRepository.create({
        ...sampleLicense,
        schoolId: 'school789',
        licenseKey: 'license-key-789',
        status: LicenseStatus.REVOKED
      });
      
      // Find all revoked licenses
      const revokedLicenses = await licenseRepository.findAll({ status: LicenseStatus.REVOKED } as any);
      
      expect(revokedLicenses).toHaveLength(2);
      expect(revokedLicenses[0].status).toBe(LicenseStatus.REVOKED);
      expect(revokedLicenses[1].status).toBe(LicenseStatus.REVOKED);
    });
    
    it('should apply limit, skip, and sort options', async () => {
      // Create multiple licenses with different creation dates
      await licenseRepository.create({
        ...sampleLicense,
        schoolId: 'school1',
        schoolName: 'School A',
        licenseKey: 'key1'
      });
      await licenseRepository.create({
        ...sampleLicense,
        schoolId: 'school2',
        schoolName: 'School B',
        licenseKey: 'key2'
      });
      await licenseRepository.create({
        ...sampleLicense,
        schoolId: 'school3',
        schoolName: 'School C',
        licenseKey: 'key3'
      });
      
      // Find with limit, skip, and sort
      const licenses = await licenseRepository.findAll({}, {
        limit: 2,
        skip: 1,
        sort: { schoolName: 1 } // Sort by school name ascending
      });
      
      expect(licenses).toHaveLength(2);
      expect(licenses[0].schoolName).toBe('School B');
      expect(licenses[1].schoolName).toBe('School C');
    });
  });
  
  describe('update', () => {
    it('should update a license', async () => {
      const license = await licenseRepository.create(sampleLicense);
      const updatedLicense = await licenseRepository.update(license._id.toString(), {
        schoolName: 'Updated School Name',
        metadata: { plan: 'enterprise' }
      } as any);
      
      expect(updatedLicense).toBeDefined();
      expect(updatedLicense?.schoolName).toBe('Updated School Name');
      expect(updatedLicense?.metadata.plan).toBe('enterprise');
    });
  });
  
  describe('delete', () => {
    it('should delete a license', async () => {
      const license = await licenseRepository.create(sampleLicense);
      const result = await licenseRepository.delete(license._id.toString());
      
      expect(result).toBe(true);
      
      const foundLicense = await licenseRepository.findById(license._id.toString());
      expect(foundLicense).toBeNull();
    });
    
    it('should return false when deleting non-existent license', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const result = await licenseRepository.delete(nonExistentId);
      
      expect(result).toBe(false);
    });
  });
  
  describe('count', () => {
    it('should count licenses matching filter', async () => {
      // Create multiple licenses
      await licenseRepository.create(sampleLicense);
      await licenseRepository.create({
        ...sampleLicense,
        schoolId: 'school456',
        licenseKey: 'license-key-456',
        status: LicenseStatus.REVOKED
      });
      await licenseRepository.create({
        ...sampleLicense,
        schoolId: 'school789',
        licenseKey: 'license-key-789',
        status: LicenseStatus.REVOKED
      });
      
      // Count all licenses
      const totalCount = await licenseRepository.count();
      expect(totalCount).toBe(3);
      
      // Count revoked licenses
      const revokedCount = await licenseRepository.count({ status: LicenseStatus.REVOKED } as any);
      expect(revokedCount).toBe(2);
    });
  });
});