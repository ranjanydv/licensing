import { Feature } from '../../interfaces/license.interface';
import { 
  hasFeature, 
  meetsRestriction, 
  validateFeature, 
  validateFeatures,
  RestrictionType
} from '../../utils/featureValidation';

describe('Feature Validation Utility', () => {
  // Sample features for testing
  const features: Feature[] = [
    {
      name: 'basic-feature',
      enabled: true
    },
    {
      name: 'disabled-feature',
      enabled: false
    },
    {
      name: 'feature-with-restrictions',
      enabled: true,
      restrictions: {
        maxUsers: 10,
        allowedModules: ['admin', 'reports', 'dashboard'],
        premiumEnabled: false,
        userLevel: {
          min: 1,
          max: 5
        }
      }
    },
    {
      name: 'advanced-feature',
      enabled: true,
      restrictions: {
        ipAccess: {
          type: RestrictionType.IP_RANGE,
          ranges: ['192.168.1.0/24', '10.0.0.1']
        },
        accessTime: {
          type: RestrictionType.TIME_RANGE,
          min: '08:00',
          max: '17:00'
        },
        validPeriod: {
          type: RestrictionType.DATE_RANGE,
          min: '2025-01-01',
          max: '2025-12-31'
        },
        emailDomain: {
          type: RestrictionType.REGEX,
          pattern: '^.*@school\\.edu$',
          flags: 'i'
        },
        allowedRoles: {
          type: RestrictionType.ALLOWED_VALUES,
          values: ['admin', 'teacher', 'principal']
        },
        forbiddenActions: {
          type: RestrictionType.FORBIDDEN_VALUES,
          values: ['delete', 'export']
        }
      }
    }
  ];

  describe('hasFeature', () => {
    it('should return true for enabled features', () => {
      expect(hasFeature(features, 'basic-feature')).toBe(true);
    });

    it('should return false for disabled features', () => {
      expect(hasFeature(features, 'disabled-feature')).toBe(false);
    });

    it('should return false for non-existent features', () => {
      expect(hasFeature(features, 'non-existent-feature')).toBe(false);
    });
  });

  describe('meetsRestriction', () => {
    describe('Basic restriction types', () => {
      it('should validate number restrictions', () => {
        expect(meetsRestriction(features, 'feature-with-restrictions', 'maxUsers', 5)).toBe(true);
        expect(meetsRestriction(features, 'feature-with-restrictions', 'maxUsers', 10)).toBe(true);
        expect(meetsRestriction(features, 'feature-with-restrictions', 'maxUsers', 15)).toBe(false);
      });

      it('should validate array restrictions', () => {
        expect(meetsRestriction(features, 'feature-with-restrictions', 'allowedModules', 'admin')).toBe(true);
        expect(meetsRestriction(features, 'feature-with-restrictions', 'allowedModules', 'settings')).toBe(false);
      });

      it('should validate boolean restrictions', () => {
        expect(meetsRestriction(features, 'feature-with-restrictions', 'premiumEnabled', false)).toBe(true);
        expect(meetsRestriction(features, 'feature-with-restrictions', 'premiumEnabled', true)).toBe(false);
      });

      it('should validate range restrictions', () => {
        expect(meetsRestriction(features, 'feature-with-restrictions', 'userLevel', 3)).toBe(true);
        expect(meetsRestriction(features, 'feature-with-restrictions', 'userLevel', 0)).toBe(false);
        expect(meetsRestriction(features, 'feature-with-restrictions', 'userLevel', 6)).toBe(false);
      });
    });

    describe('Advanced restriction types', () => {
      it('should validate IP range restrictions', () => {
        expect(meetsRestriction(features, 'advanced-feature', 'ipAccess', '192.168.1.100')).toBe(true);
        expect(meetsRestriction(features, 'advanced-feature', 'ipAccess', '10.0.0.1')).toBe(true);
        expect(meetsRestriction(features, 'advanced-feature', 'ipAccess', '172.16.0.1')).toBe(false);
      });

      it('should validate time range restrictions', () => {
        expect(meetsRestriction(features, 'advanced-feature', 'accessTime', '12:00')).toBe(true);
        expect(meetsRestriction(features, 'advanced-feature', 'accessTime', '07:59')).toBe(false);
        expect(meetsRestriction(features, 'advanced-feature', 'accessTime', '17:01')).toBe(false);
      });

      it('should validate date range restrictions', () => {
        expect(meetsRestriction(features, 'advanced-feature', 'validPeriod', '2025-06-15')).toBe(true);
        expect(meetsRestriction(features, 'advanced-feature', 'validPeriod', '2024-12-31')).toBe(false);
        expect(meetsRestriction(features, 'advanced-feature', 'validPeriod', '2026-01-01')).toBe(false);
      });

      it('should validate regex restrictions', () => {
        expect(meetsRestriction(features, 'advanced-feature', 'emailDomain', 'user@school.edu')).toBe(true);
        expect(meetsRestriction(features, 'advanced-feature', 'emailDomain', 'user@SCHOOL.EDU')).toBe(true); // Case insensitive
        expect(meetsRestriction(features, 'advanced-feature', 'emailDomain', 'user@gmail.com')).toBe(false);
      });

      it('should validate allowed values restrictions', () => {
        expect(meetsRestriction(features, 'advanced-feature', 'allowedRoles', 'admin')).toBe(true);
        expect(meetsRestriction(features, 'advanced-feature', 'allowedRoles', 'student')).toBe(false);
      });

      it('should validate forbidden values restrictions', () => {
        expect(meetsRestriction(features, 'advanced-feature', 'forbiddenActions', 'view')).toBe(true);
        expect(meetsRestriction(features, 'advanced-feature', 'forbiddenActions', 'delete')).toBe(false);
      });
    });

    it('should return false for disabled features', () => {
      expect(meetsRestriction(features, 'disabled-feature', 'anyRestriction', 'anyValue')).toBe(false);
    });

    it('should return false for non-existent features', () => {
      expect(meetsRestriction(features, 'non-existent-feature', 'anyRestriction', 'anyValue')).toBe(false);
    });

    it('should return true when restriction key does not exist', () => {
      expect(meetsRestriction(features, 'basic-feature', 'nonExistentRestriction', 'anyValue')).toBe(true);
    });
  });

  describe('validateFeature', () => {
    it('should validate a feature with no restrictions', () => {
      const result = validateFeature(features, 'basic-feature', {});
      expect(result.isValid).toBe(true);
      expect(result.feature).toBe('basic-feature');
    });

    it('should validate a feature with restrictions that are met', () => {
      const result = validateFeature(features, 'feature-with-restrictions', {
        maxUsers: 5,
        allowedModules: 'admin',
        premiumEnabled: false,
        userLevel: 3
      });
      expect(result.isValid).toBe(true);
      expect(result.feature).toBe('feature-with-restrictions');
    });

    it('should invalidate a feature with restrictions that are not met', () => {
      const result = validateFeature(features, 'feature-with-restrictions', {
        maxUsers: 15,
        allowedModules: 'admin',
        premiumEnabled: false,
        userLevel: 3
      });
      expect(result.isValid).toBe(false);
      expect(result.feature).toBe('feature-with-restrictions');
      expect(result.message).toBe("Feature 'feature-with-restrictions' restrictions not met");
      expect(result.restrictionDetails).toHaveProperty('maxUsers');
    });

    it('should validate a feature with advanced restrictions that are met', () => {
      const result = validateFeature(features, 'advanced-feature', {
        ipAccess: '192.168.1.100',
        accessTime: '12:00',
        validPeriod: '2025-06-15',
        emailDomain: 'user@school.edu',
        allowedRoles: 'admin',
        forbiddenActions: 'view'
      });
      expect(result.isValid).toBe(true);
      expect(result.feature).toBe('advanced-feature');
    });

    it('should invalidate a feature with advanced restrictions that are not met', () => {
      const result = validateFeature(features, 'advanced-feature', {
        ipAccess: '172.16.0.1',
        accessTime: '12:00',
        validPeriod: '2025-06-15',
        emailDomain: 'user@school.edu',
        allowedRoles: 'admin',
        forbiddenActions: 'view'
      });
      expect(result.isValid).toBe(false);
      expect(result.feature).toBe('advanced-feature');
      expect(result.message).toBe("Feature 'advanced-feature' restrictions not met");
      expect(result.restrictionDetails).toHaveProperty('ipAccess');
    });

    it('should return invalid result for disabled features', () => {
      const result = validateFeature(features, 'disabled-feature', {});
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Feature 'disabled-feature' is disabled in license");
    });

    it('should return invalid result for non-existent features', () => {
      const result = validateFeature(features, 'non-existent-feature', {});
      expect(result.isValid).toBe(false);
      expect(result.message).toBe("Feature 'non-existent-feature' not found in license");
    });

    it('should skip restrictions not provided in context', () => {
      const result = validateFeature(features, 'feature-with-restrictions', {
        maxUsers: 5 // Only providing one restriction
      });
      expect(result.isValid).toBe(true);
    });
  });

  describe('validateFeatures', () => {
    it('should validate multiple features', () => {
      const results = validateFeatures(features, ['basic-feature', 'feature-with-restrictions'], {
        maxUsers: 5,
        allowedModules: 'admin',
        premiumEnabled: false,
        userLevel: 3
      });
      
      expect(results).toHaveLength(2);
      expect(results[0].isValid).toBe(true);
      expect(results[0].feature).toBe('basic-feature');
      expect(results[1].isValid).toBe(true);
      expect(results[1].feature).toBe('feature-with-restrictions');
    });

    it('should return mixed results for valid and invalid features', () => {
      const results = validateFeatures(features, ['basic-feature', 'disabled-feature', 'non-existent-feature'], {});
      
      expect(results).toHaveLength(3);
      expect(results[0].isValid).toBe(true);
      expect(results[0].feature).toBe('basic-feature');
      expect(results[1].isValid).toBe(false);
      expect(results[1].feature).toBe('disabled-feature');
      expect(results[2].isValid).toBe(false);
      expect(results[2].feature).toBe('non-existent-feature');
    });
  });
});