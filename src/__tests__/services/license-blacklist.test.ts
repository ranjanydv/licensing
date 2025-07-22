import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LicenseService } from '../../services/license.service';
import { License, LicenseStatus } from '../../interfaces/license.interface';

// Mock dependencies
vi.mock('../../repositories/license.repository', () => ({
  licenseRepository: {
    findById: vi.fn(),
    findByLicenseKey: vi.fn(),
    update: vi.fn()
  }
}));

vi.mock('../../services/audit.service', () => ({
  auditService: {
    logAction: vi.fn()
  }
}));

vi.mock('../../services/notification.service', () => ({
  notificationService: {
    sendAdminAlert: vi.fn()
  },
  AlertSeverity: {
    HIGH: 'high'
  }
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn()
  }
}));

// Import mocked dependencies
import { licenseRepository } from '../../repositories/license.repository';
import { auditService } from '../../services/audit.service';
import { notificationService, AlertSeverity } from '../../services/notification.service';
import { AuditActionType } from '../../models/audit-log.model';

describe('License Blacklisting', () => {
  let licenseService: LicenseService;
  let mockLicense: License;
  
  beforeEach(() => {
    // Reset mocks
    vi.resetAllMocks();
    
    // Create license service instance
    licenseService = new LicenseService();
    
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
      blacklisted: false,
      createdBy: 'admin',
      updatedBy: 'admin',
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01')
    };
    
    // Mock repository responses
    (licenseRepository.findById as any).mockResolvedValue(mockLicense);
    (licenseRepository.update as any).mockImplementation((id, data) => {
      return Promise.resolve({
        ...mockLicense,
        ...data
      });
    });
  });

  describe('blacklistLicense', () => {
    it('should blacklist a license successfully', async () => {
      const licenseId = '123456789';
      const reason = 'License violation detected';
      const updatedBy = 'admin';
      
      const result = await licenseService.blacklistLicense(licenseId, reason, updatedBy);
      
      // Verify repository calls
      expect(licenseRepository.findById).toHaveBeenCalledWith(licenseId);
      expect(licenseRepository.update).toHaveBeenCalledWith(licenseId, {
        blacklisted: true,
        blacklistReason: reason,
        updatedBy
      });
      
      // Verify audit log
      expect(auditService.logAction).toHaveBeenCalledWith(
        licenseId,
        'license',
        AuditActionType.BLACKLIST,
        updatedBy,
        { blacklisted: false, blacklistReason: undefined },
        { blacklisted: true, blacklistReason: reason },
        expect.objectContaining({ timestamp: expect.any(Date) })
      );
      
      // Verify notification
      expect(notificationService.sendAdminAlert).toHaveBeenCalledWith(
        expect.stringContaining(licenseId),
        AlertSeverity.HIGH
      );
      
      // Verify result
      expect(result).toBeDefined();
      expect(result?.blacklisted).toBe(true);
      expect(result?.blacklistReason).toBe(reason);
    });

    it('should throw an error when license is not found', async () => {
      (licenseRepository.findById as any).mockResolvedValue(null);
      
      const licenseId = 'non-existent-id';
      const reason = 'License violation detected';
      const updatedBy = 'admin';
      
      await expect(licenseService.blacklistLicense(licenseId, reason, updatedBy))
        .rejects.toThrow('License not found');
    });

    it('should throw an error when update fails', async () => {
      (licenseRepository.update as any).mockResolvedValue(null);
      
      const licenseId = '123456789';
      const reason = 'License violation detected';
      const updatedBy = 'admin';
      
      await expect(licenseService.blacklistLicense(licenseId, reason, updatedBy))
        .rejects.toThrow('Failed to blacklist license');
    });
  });

  describe('removeFromBlacklist', () => {
    it('should remove a license from blacklist successfully', async () => {
      // Set the license as blacklisted
      mockLicense.blacklisted = true;
      mockLicense.blacklistReason = 'Previous violation';
      
      const licenseId = '123456789';
      const updatedBy = 'admin';
      
      const result = await licenseService.removeFromBlacklist(licenseId, updatedBy);
      
      // Verify repository calls
      expect(licenseRepository.findById).toHaveBeenCalledWith(licenseId);
      expect(licenseRepository.update).toHaveBeenCalledWith(licenseId, {
        blacklisted: false,
        blacklistReason: undefined,
        updatedBy
      });
      
      // Verify audit log
      expect(auditService.logAction).toHaveBeenCalledWith(
        licenseId,
        'license',
        AuditActionType.UNBLACKLIST,
        updatedBy,
        { blacklisted: true, blacklistReason: 'Previous violation' },
        { blacklisted: false, blacklistReason: undefined },
        expect.objectContaining({ timestamp: expect.any(Date) })
      );
      
      // Verify result
      expect(result).toBeDefined();
      expect(result?.blacklisted).toBe(false);
      expect(result?.blacklistReason).toBeUndefined();
    });

    it('should return the license as is when not blacklisted', async () => {
      // Ensure the license is not blacklisted
      mockLicense.blacklisted = false;
      mockLicense.blacklistReason = undefined;
      
      const licenseId = '123456789';
      const updatedBy = 'admin';
      
      const result = await licenseService.removeFromBlacklist(licenseId, updatedBy);
      
      // Verify repository calls
      expect(licenseRepository.findById).toHaveBeenCalledWith(licenseId);
      expect(licenseRepository.update).not.toHaveBeenCalled();
      
      // Verify audit log was not called
      expect(auditService.logAction).not.toHaveBeenCalled();
      
      // Verify result
      expect(result).toBeDefined();
      expect(result).toEqual(mockLicense);
    });

    it('should throw an error when license is not found', async () => {
      (licenseRepository.findById as any).mockResolvedValue(null);
      
      const licenseId = 'non-existent-id';
      const updatedBy = 'admin';
      
      await expect(licenseService.removeFromBlacklist(licenseId, updatedBy))
        .rejects.toThrow('License not found');
    });
  });

  describe('checkBlacklist', () => {
    it('should return blacklisted status when checking by ID', async () => {
      // Set the license as blacklisted
      mockLicense.blacklisted = true;
      mockLicense.blacklistReason = 'Violation detected';
      
      const licenseId = '123456789';
      
      const result = await licenseService.checkBlacklist(licenseId);
      
      // Verify repository calls
      expect(licenseRepository.findById).toHaveBeenCalledWith(licenseId);
      expect(licenseRepository.findByLicenseKey).not.toHaveBeenCalled();
      
      // Verify result
      expect(result).toEqual({
        blacklisted: true,
        reason: 'Violation detected'
      });
    });

    it('should return blacklisted status when checking by license key', async () => {
      // Set the license as blacklisted
      mockLicense.blacklisted = true;
      mockLicense.blacklistReason = 'Violation detected';
      
      // Mock findById to return null so it falls back to findByLicenseKey
      (licenseRepository.findById as any).mockResolvedValue(null);
      (licenseRepository.findByLicenseKey as any).mockResolvedValue(mockLicense);
      
      const licenseKey = 'test-license-key';
      
      const result = await licenseService.checkBlacklist(licenseKey);
      
      // Verify repository calls
      expect(licenseRepository.findById).toHaveBeenCalledWith(licenseKey);
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(licenseKey);
      
      // Verify result
      expect(result).toEqual({
        blacklisted: true,
        reason: 'Violation detected'
      });
    });

    it('should return not blacklisted when license is not found', async () => {
      // Mock both repository methods to return null
      (licenseRepository.findById as any).mockResolvedValue(null);
      (licenseRepository.findByLicenseKey as any).mockResolvedValue(null);
      
      const licenseId = 'non-existent-id';
      
      const result = await licenseService.checkBlacklist(licenseId);
      
      // Verify repository calls
      expect(licenseRepository.findById).toHaveBeenCalledWith(licenseId);
      expect(licenseRepository.findByLicenseKey).toHaveBeenCalledWith(licenseId);
      
      // Verify result
      expect(result).toEqual({
        blacklisted: false
      });
    });

    it('should return not blacklisted when license is not blacklisted', async () => {
      // Ensure the license is not blacklisted
      mockLicense.blacklisted = false;
      mockLicense.blacklistReason = undefined;
      
      const licenseId = '123456789';
      
      const result = await licenseService.checkBlacklist(licenseId);
      
      // Verify repository calls
      expect(licenseRepository.findById).toHaveBeenCalledWith(licenseId);
      
      // Verify result
      expect(result).toEqual({
        blacklisted: false
      });
    });
  });
});