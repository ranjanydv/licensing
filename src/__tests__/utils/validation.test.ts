import { 
  licenseRequestSchema, 
  licenseUpdateSchema, 
  licenseValidationSchema,
  validate
} from '../../utils/validation';
import { LicenseStatus } from '../../interfaces/license.interface';

describe('Validation Schemas', () => {
  describe('licenseRequestSchema', () => {
    it('should validate a valid license request', () => {
      const validRequest = {
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
      
      const result = validate(licenseRequestSchema, validRequest);
      expect(result).toEqual(validRequest);
    });
    
    it('should throw error for missing required fields', () => {
      const invalidRequest = {
        schoolName: 'Test School',
        duration: 365,
        features: []
      };
      
      expect(() => validate(licenseRequestSchema, invalidRequest)).toThrow();
    });
    
    it('should throw error for invalid duration', () => {
      const invalidRequest = {
        schoolId: 'school123',
        schoolName: 'Test School',
        duration: -10, // Negative duration
        features: [{ name: 'feature1', enabled: true }]
      };
      
      expect(() => validate(licenseRequestSchema, invalidRequest)).toThrow();
    });
    
    it('should throw error for empty features array', () => {
      const invalidRequest = {
        schoolId: 'school123',
        schoolName: 'Test School',
        duration: 365,
        features: [] // Empty features
      };
      
      expect(() => validate(licenseRequestSchema, invalidRequest)).toThrow();
    });
  });
  
  describe('licenseUpdateSchema', () => {
    it('should validate a valid license update', () => {
      const validUpdate = {
        schoolName: 'Updated School Name',
        duration: 730,
        features: [{ name: 'newFeature', enabled: true }],
        status: LicenseStatus.ACTIVE,
        metadata: { plan: 'enterprise' },
        updatedBy: 'admin'
      };
      
      const result = validate(licenseUpdateSchema, validUpdate);
      expect(result).toEqual(validUpdate);
    });
    
    it('should throw error for missing updatedBy', () => {
      const invalidUpdate = {
        schoolName: 'Updated School Name',
        updatedBy: '' // Empty updatedBy
      };
      
      expect(() => validate(licenseUpdateSchema, invalidUpdate)).toThrow();
    });
    
    it('should throw error for invalid status', () => {
      const invalidUpdate = {
        status: 'invalid-status', // Invalid status
        updatedBy: 'admin'
      };
      
      expect(() => validate(licenseUpdateSchema, invalidUpdate)).toThrow();
    });
  });
  
  describe('licenseValidationSchema', () => {
    it('should validate a valid license validation request', () => {
      const validRequest = {
        licenseKey: 'jwt-token-here',
        schoolId: 'school123'
      };
      
      const result = validate(licenseValidationSchema, validRequest);
      expect(result).toEqual(validRequest);
    });
    
    it('should throw error for missing licenseKey', () => {
      const invalidRequest = {
        licenseKey: '',
        schoolId: 'school123'
      };
      
      expect(() => validate(licenseValidationSchema, invalidRequest)).toThrow();
    });
    
    it('should throw error for missing schoolId', () => {
      const invalidRequest = {
        licenseKey: 'jwt-token-here',
        schoolId: ''
      };
      
      expect(() => validate(licenseValidationSchema, invalidRequest)).toThrow();
    });
  });
});