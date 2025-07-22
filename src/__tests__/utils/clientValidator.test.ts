import { validateLicenseLocally, isFeatureEnabled, getLicenseMetadata } from '../../utils/clientValidator';
import { generateToken } from '../../utils/jwt';

describe('Client Validator', () => {
  // Generate a valid JWT token for testing
  const validPayload = {
    sub: 'school123',
    iss: 'license-management-system',
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 days from now
    schoolName: 'Test School',
    features: ['feature1', 'feature2'],
    licenseId: 'license123',
    metadata: { plan: 'premium' }
  };
  
  const validToken = generateToken(validPayload);
  
  // Generate an expired JWT token for testing
  const expiredPayload = {
    ...validPayload,
    exp: Math.floor(Date.now() / 1000) - 1000 // Expired
  };
  
  const expiredToken = generateToken(expiredPayload);
  
  describe('validateLicenseLocally', () => {
    it('should validate a valid license', () => {
      const result = validateLicenseLocally(validToken, 'school123');
      
      expect(result.valid).toBe(true);
      expect(result.expiresIn).toBeGreaterThan(0);
      expect(result.features).toContain('feature1');
      expect(result.features).toContain('feature2');
    });
    
    it('should reject an invalid token format', () => {
      const result = validateLicenseLocally('invalid-token', 'school123');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid license format');
    });
    
    it('should reject if school ID does not match', () => {
      const result = validateLicenseLocally(validToken, 'different-school');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('License does not match school ID');
    });
    
    it('should reject an expired license', () => {
      const result = validateLicenseLocally(expiredToken, 'school123');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('License has expired');
    });
  });
  
  describe('isFeatureEnabled', () => {
    it('should return true for enabled features', () => {
      expect(isFeatureEnabled(validToken, 'feature1')).toBe(true);
      expect(isFeatureEnabled(validToken, 'feature2')).toBe(true);
    });
    
    it('should return false for non-existent features', () => {
      expect(isFeatureEnabled(validToken, 'non-existent-feature')).toBe(false);
    });
    
    it('should return false for invalid token', () => {
      expect(isFeatureEnabled('invalid-token', 'feature1')).toBe(false);
    });
  });
  
  describe('getLicenseMetadata', () => {
    it('should return metadata for valid token', () => {
      const metadata = getLicenseMetadata(validToken);
      
      expect(metadata).toBeDefined();
      expect(metadata?.plan).toBe('premium');
    });
    
    it('should return null for invalid token', () => {
      const metadata = getLicenseMetadata('invalid-token');
      
      expect(metadata).toBeNull();
    });
  });
});