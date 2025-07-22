import mongoose from 'mongoose';
import { LicenseModel } from '../../models/license.model';
import { LicenseStatus } from '../../interfaces/license.interface';

describe('License Model', () => {
  const mockLicenseData = {
    schoolId: 'school123',
    schoolName: 'Test School',
    licenseKey: 'jwt-token-here',
    licenseHash: 'hash-value-here',
    features: [
      { name: 'feature1', enabled: true },
      { name: 'feature2', enabled: false, restrictions: { maxUsers: 10 } }
    ],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    createdBy: 'admin',
    updatedBy: 'admin'
  };

  afterEach(async () => {
    await LicenseModel.deleteMany({});
  });

  it('should create a license successfully', async () => {
    const license = new LicenseModel(mockLicenseData);
    const savedLicense = await license.save();
    
    expect(savedLicense._id).toBeDefined();
    expect(savedLicense.schoolId).toBe(mockLicenseData.schoolId);
    expect(savedLicense.schoolName).toBe(mockLicenseData.schoolName);
    expect(savedLicense.status).toBe(LicenseStatus.ACTIVE);
    expect(savedLicense.features).toHaveLength(2);
    expect(savedLicense.features[0].name).toBe('feature1');
    expect(savedLicense.features[1].restrictions).toEqual({ maxUsers: 10 });
  });

  it('should require schoolId', async () => {
    const licenseWithoutSchoolId = new LicenseModel({
      ...mockLicenseData,
      schoolId: undefined
    });
    
    await expect(licenseWithoutSchoolId.save()).rejects.toThrow();
  });

  it('should calculate isExpired virtual correctly', async () => {
    // Active license
    const activeLicense = new LicenseModel(mockLicenseData);
    await activeLicense.save();
    expect(activeLicense.get('isExpired')).toBe(false);
    
    // Expired license
    const expiredLicense = new LicenseModel({
      ...mockLicenseData,
      expiresAt: new Date(Date.now() - 1000) // 1 second ago
    });
    await expiredLicense.save();
    expect(expiredLicense.get('isExpired')).toBe(true);
  });

  it('should calculate daysUntilExpiration virtual correctly', async () => {
    // License expiring in 30 days
    const license = new LicenseModel({
      ...mockLicenseData,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    await license.save();
    
    // Should be approximately 30 days
    expect(license.get('daysUntilExpiration')).toBeCloseTo(30, 0);
  });

  it('should update status to EXPIRED when saving an expired license', async () => {
    const license = new LicenseModel({
      ...mockLicenseData,
      expiresAt: new Date(Date.now() - 1000) // 1 second ago
    });
    
    await license.save();
    expect(license.status).toBe(LicenseStatus.EXPIRED);
  });
});