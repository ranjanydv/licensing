import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  generateLicenseFingerprint,
  verifyLicenseFingerprint,
  validateHardwareBinding,
  validateIpRestrictions,
  validateDeviceLimit,
  validateSecurityRestrictions,
  HardwareInfo,
  ClientInfo
} from '../../utils/security';
import { License, LicenseStatus } from '../../interfaces/license.interface';

// Mock environment variables
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Mock process.env
process.env.LICENSE_FINGERPRINT_SECRET = 'test-fingerprint-secret';
process.env.LICENSE_HASH_SECRET = 'test-hash-secret';

describe('Security Utils', () => {
  let mockLicense: License;
  
  beforeEach(() => {
    // Create a mock license for testing
    mockLicense = {
      _id: '123456789',
      schoolId: 'school-123',
      schoolName: 'Test School',
      licenseKey: 'test-license-key',
      licenseHash: 'test-license-hash',
      features: [
        { name: 'feature1', enabled: true },
        { name: 'feature2', enabled: false }
      ],
      issuedAt: new Date('2023-01-01'),
      expiresAt: new Date('2024-01-01'),
      lastChecked: new Date('2023-01-01'),
      status: LicenseStatus.ACTIVE,
      metadata: {},
      createdBy: 'admin',
      updatedBy: 'admin',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };
  });

  describe('License Fingerprinting', () => {
    it('should generate a license fingerprint', () => {
      const fingerprint = generateLicenseFingerprint(mockLicense);
      expect(fingerprint).toBeDefined();
      expect(typeof fingerprint).toBe('string');
      expect(fingerprint.length).toBeGreaterThan(0);
    });

    it('should verify a valid license fingerprint', () => {
      const fingerprint = generateLicenseFingerprint(mockLicense);
      mockLicense.fingerprint = fingerprint;
      
      const result = verifyLicenseFingerprint(mockLicense);
      expect(result).toBe(true);
    });

    it('should reject an invalid license fingerprint', () => {
      mockLicense.fingerprint = 'invalid-fingerprint';
      
      const result = verifyLicenseFingerprint(mockLicense);
      expect(result).toBe(false);
    });
  });

  describe('Hardware Binding Validation', () => {
    it('should pass validation when hardware binding is disabled', () => {
      mockLicense.securityRestrictions = {
        hardwareBinding: {
          enabled: false,
          fingerprints: []
        }
      };
      
      const result = validateHardwareBinding(mockLicense);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when hardware info is missing but required', () => {
      mockLicense.securityRestrictions = {
        hardwareBinding: {
          enabled: true,
          fingerprints: ['existing-fingerprint']
        }
      };
      
      const result = validateHardwareBinding(mockLicense);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Hardware information required');
    });

    it('should pass validation for first use with no registered fingerprints', () => {
      mockLicense.securityRestrictions = {
        hardwareBinding: {
          enabled: true,
          fingerprints: []
        }
      };
      
      const hardwareInfo: HardwareInfo = {
        cpuId: 'cpu-123',
        diskId: 'disk-456',
        macAddress: '00:11:22:33:44:55'
      };
      
      const result = validateHardwareBinding(mockLicense, hardwareInfo);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should pass validation when hardware fingerprint is in allowed list', () => {
      // We need to mock the generateHardwareFingerprint function to return a predictable value
      vi.mock('../../utils/hash', () => ({
        generateHardwareFingerprint: () => 'allowed-fingerprint'
      }));
      
      mockLicense.securityRestrictions = {
        hardwareBinding: {
          enabled: true,
          fingerprints: ['allowed-fingerprint']
        }
      };
      
      const hardwareInfo: HardwareInfo = {
        cpuId: 'cpu-123',
        diskId: 'disk-456',
        macAddress: '00:11:22:33:44:55'
      };
      
      const result = validateHardwareBinding(mockLicense, hardwareInfo);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Restore the original implementation
      vi.resetModules();
    });

    it('should fail validation when hardware fingerprint is not in allowed list', () => {
      // We need to mock the generateHardwareFingerprint function to return a predictable value
      vi.mock('../../utils/hash', () => ({
        generateHardwareFingerprint: () => 'unknown-fingerprint'
      }));
      
      mockLicense.securityRestrictions = {
        hardwareBinding: {
          enabled: true,
          fingerprints: ['allowed-fingerprint']
        }
      };
      
      const hardwareInfo: HardwareInfo = {
        cpuId: 'cpu-123',
        diskId: 'disk-456',
        macAddress: '00:11:22:33:44:55'
      };
      
      const result = validateHardwareBinding(mockLicense, hardwareInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not authorized');
      
      // Restore the original implementation
      vi.resetModules();
    });
  });

  describe('IP Restrictions Validation', () => {
    it('should pass validation when IP restrictions are disabled', () => {
      mockLicense.securityRestrictions = {
        ipRestrictions: {
          enabled: false,
          allowedIps: []
        }
      };
      
      const result = validateIpRestrictions(mockLicense);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when client info is missing but required', () => {
      mockLicense.securityRestrictions = {
        ipRestrictions: {
          enabled: true,
          allowedIps: ['192.168.1.1']
        }
      };
      
      const result = validateIpRestrictions(mockLicense);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Client IP information required');
    });

    it('should pass validation when client IP is in allowed list', () => {
      mockLicense.securityRestrictions = {
        ipRestrictions: {
          enabled: true,
          allowedIps: ['192.168.1.1', '10.0.0.1']
        }
      };
      
      const clientInfo: ClientInfo = {
        ip: '192.168.1.1',
        userAgent: 'test-user-agent'
      };
      
      const result = validateIpRestrictions(mockLicense, clientInfo);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when client IP is not in allowed list', () => {
      mockLicense.securityRestrictions = {
        ipRestrictions: {
          enabled: true,
          allowedIps: ['192.168.1.1', '10.0.0.1']
        }
      };
      
      const clientInfo: ClientInfo = {
        ip: '192.168.1.2',
        userAgent: 'test-user-agent'
      };
      
      const result = validateIpRestrictions(mockLicense, clientInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('IP address not authorized');
    });

    it('should pass validation when client IP is in allowed CIDR range', () => {
      // Mock the isIpInCidr function to return true
      vi.mock('ipaddr.js', () => ({
        parse: vi.fn(),
        parseCIDR: vi.fn(),
        match: () => true
      }));
      
      mockLicense.securityRestrictions = {
        ipRestrictions: {
          enabled: true,
          allowedIps: ['192.168.1.0/24']
        }
      };
      
      const clientInfo: ClientInfo = {
        ip: '192.168.1.100',
        userAgent: 'test-user-agent'
      };
      
      const result = validateIpRestrictions(mockLicense, clientInfo);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Restore the original implementation
      vi.resetModules();
    });

    it('should pass validation when client country is in allowed list', () => {
      mockLicense.securityRestrictions = {
        ipRestrictions: {
          enabled: true,
          allowedIps: [],
          allowedCountries: ['US', 'CA']
        }
      };
      
      const clientInfo: ClientInfo = {
        ip: '192.168.1.1',
        userAgent: 'test-user-agent',
        country: 'US'
      };
      
      const result = validateIpRestrictions(mockLicense, clientInfo);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when client country is not in allowed list', () => {
      mockLicense.securityRestrictions = {
        ipRestrictions: {
          enabled: true,
          allowedIps: [],
          allowedCountries: ['US', 'CA']
        }
      };
      
      const clientInfo: ClientInfo = {
        ip: '192.168.1.1',
        userAgent: 'test-user-agent',
        country: 'UK'
      };
      
      const result = validateIpRestrictions(mockLicense, clientInfo);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Country not authorized');
    });
  });

  describe('Device Limit Validation', () => {
    it('should pass validation when device limit is disabled', () => {
      mockLicense.securityRestrictions = {
        deviceLimit: {
          enabled: false,
          maxDevices: 5
        }
      };
      
      const result = validateDeviceLimit(mockLicense);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when device ID is missing but required', () => {
      mockLicense.securityRestrictions = {
        deviceLimit: {
          enabled: true,
          maxDevices: 5
        }
      };
      
      const result = validateDeviceLimit(mockLicense);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Device ID required');
    });

    it('should pass validation when device count is below limit', () => {
      mockLicense.securityRestrictions = {
        deviceLimit: {
          enabled: true,
          maxDevices: 5
        }
      };
      
      const result = validateDeviceLimit(mockLicense, 'device-123', 3);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation when device count exceeds limit', () => {
      mockLicense.securityRestrictions = {
        deviceLimit: {
          enabled: true,
          maxDevices: 5
        }
      };
      
      const result = validateDeviceLimit(mockLicense, 'device-123', 6);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Device limit exceeded');
    });
  });

  describe('Combined Security Validation', () => {
    it('should fail validation when license is blacklisted', () => {
      mockLicense.blacklisted = true;
      mockLicense.blacklistReason = 'License violation';
      
      const result = validateSecurityRestrictions(mockLicense);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('License is blacklisted');
      expect(result.errors[0]).toContain('License violation');
    });

    it('should fail validation when license fingerprint is invalid', () => {
      // Mock verifyLicenseFingerprint to return false
      vi.mock('../../utils/security', async () => {
        const actual = await vi.importActual('../../utils/security');
        return {
          ...actual,
          verifyLicenseFingerprint: () => false
        };
      });
      
      mockLicense.fingerprint = 'invalid-fingerprint';
      
      const result = validateSecurityRestrictions(mockLicense);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('License fingerprint verification failed');
      
      // Restore the original implementation
      vi.resetModules();
    });

    it('should pass validation when all security checks pass', () => {
      // Mock all validation functions to return valid
      vi.mock('../../utils/security', async () => {
        const actual = await vi.importActual('../../utils/security');
        return {
          ...actual,
          verifyLicenseFingerprint: () => true,
          validateHardwareBinding: () => ({ valid: true, errors: [] }),
          validateIpRestrictions: () => ({ valid: true, errors: [] }),
          validateDeviceLimit: () => ({ valid: true, errors: [] })
        };
      });
      
      mockLicense.securityRestrictions = {
        hardwareBinding: { enabled: true, fingerprints: ['fp-1'] },
        ipRestrictions: { enabled: true, allowedIps: ['192.168.1.1'] },
        deviceLimit: { enabled: true, maxDevices: 5 }
      };
      
      const clientInfo: ClientInfo = {
        ip: '192.168.1.1',
        userAgent: 'test-user-agent',
        hardwareInfo: { cpuId: 'cpu-123' },
        deviceId: 'device-123'
      };
      
      const result = validateSecurityRestrictions(mockLicense, clientInfo, 3);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      
      // Restore the original implementation
      vi.resetModules();
    });
  });
});