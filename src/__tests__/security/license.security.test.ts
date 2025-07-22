import { licenseService } from '../../services/license.service';
import { LicenseRequest } from '../../interfaces/license.interface';
import mongoose from 'mongoose';

describe('License Security Tests', () => {
  // Sample license data
  const licenseData: LicenseRequest = {
    schoolId: '12345',
    schoolName: 'Test School',
    duration: 365,
    features: [
      { name: 'attendance', enabled: true },
      { name: 'gradebook', enabled: true }
    ],
    createdBy: 'test-user'
  };
  
  // Test for license key uniqueness
  test('should generate unique license keys for different schools', async () => {
    // Generate licenses for different schools
    const license1 = await licenseService.generateLicense({
      ...licenseData,
      schoolId: 'school-1',
      schoolName: 'School One'
    });
    
    const license2 = await licenseService.generateLicense({
      ...licenseData,
      schoolId: 'school-2',
      schoolName: 'School Two'
    });
    
    // Keys should be different
    expect(license1.licenseKey).not.toBe(license2.licenseKey);
    expect(license1.licenseHash).not.toBe(license2.licenseHash);
  });
  
  // Test for license validation with school mismatch
  test('should reject validation when school ID does not match', async () => {
    // Generate license
    const license = await licenseService.generateLicense(licenseData);
    
    // Validate with wrong school ID
    const result = await licenseService.validateLicense(license.licenseKey, 'wrong-school-id');
    
    // Should be invalid
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringMatching(/school.*not match/i));
  });
  
  // Test for license revocation
  test('should reject validation for revoked licenses', async () => {
    // Generate license
    const license = await licenseService.generateLicense(licenseData);
    
    // Revoke license
    await licenseService.revokeLicense(license._id.toString(), 'test-user');
    
    // Validate license
    const result = await licenseService.validateLicense(license.licenseKey, licenseData.schoolId);
    
    // Should be invalid
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringMatching(/revoked/i));
  });
  
  // Test for license blacklisting
  test('should reject validation for blacklisted licenses', async () => {
    // Generate license
    const license = await licenseService.generateLicense(licenseData);
    
    // Blacklist the license (assuming this method exists)
    await licenseService.blacklistLicense(license._id.toString(), 'Security test');
    
    // Validate license
    const result = await licenseService.validateLicense(license.licenseKey, licenseData.schoolId);
    
    // Should be invalid
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringMatching(/blacklisted/i));
  });
  
  // Test for license expiration
  test('should reject validation for expired licenses', async () => {
    // Generate license with very short duration
    const expiredLicenseData = {
      ...licenseData,
      duration: -1 // Expired license
    };
    
    const license = await licenseService.generateLicense(expiredLicenseData);
    
    // Validate license
    const result = await licenseService.validateLicense(license.licenseKey, licenseData.schoolId);
    
    // Should be invalid
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(expect.stringMatching(/expired/i));
  });
  
  // Test for license tampering
  test('should reject validation for tampered licenses', async () => {
    // Generate license
    const license = await licenseService.generateLicense(licenseData);
    
    // Tamper with the license key (change a character)
    const tamperedKey = license.licenseKey.substring(0, license.licenseKey.length - 5) + 'XXXXX';
    
    // Validate license
    const result = await licenseService.validateLicense(tamperedKey, licenseData.schoolId);
    
    // Should be invalid
    expect(result.valid).toBe(false);
  });
});