import { licenseRepository } from '../repositories/license.repository';
import { generateLicenseHex } from '../utils/licenseHexGenerator';
import { ActivationRequest, ActivationResponse, ActivationStatus, License, LicenseStatus } from '../interfaces/license.interface';
import { Logger } from '../utils/logger';
import { auditService } from './audit.service';
import { AuditActionType } from '../models/audit-log.model';
import { AppError, LicenseError } from '../middlewares/errorHandler';

const logger = new Logger('LicenseActivationService');

export class LicenseActivationService {
  /**
   * Activate a license with license key and schoolId
   * @param activationRequest Activation request data
   * @returns Activation response with hex
   */
  async activateLicense(activationRequest: ActivationRequest,userId:string): Promise<ActivationResponse> {
    try {
      const { licenseKey, schoolId } = activationRequest;
      
      logger.info('Attempting license activation', { 
        licenseKey: licenseKey.substring(0, 8) + '...', 
        schoolId 
      });
      
      // Find license by key
      const license = await licenseRepository.findByLicenseKey(licenseKey);
      if (!license) {
        throw new LicenseError('Invalid license key', 'INVALID_LICENSE_KEY', 400);
      }
      
      // Check if license is already activated
      if (license.activationStatus === ActivationStatus.ACTIVATED) {
        throw new LicenseError('License already activated', 'LICENSE_ALREADY_ACTIVATED', 400);
      }
      
      // Check if license has expired
      if (license.expiresAt < new Date()) {
        throw new LicenseError('License has expired', 'LICENSE_EXPIRED', 400);
      }
      
      // Verify school ID matches
      if (license.schoolId !== schoolId) {
        await licenseRepository.update(license._id.toString(), {
          activationAttempts: +license.activationAttempts + 1
        });
        
        throw new LicenseError('School ID does not match', 'SCHOOL_ID_MISMATCH', 400);
      }
      
      // Generate license hex
      const licenseHex = generateLicenseHex(license);
      
      // Update license status
      const activatedLicense = await licenseRepository.update(license._id.toString(), {
        activationStatus: ActivationStatus.ACTIVATED,
        licenseHex,
        activatedAt: new Date(),
        status: LicenseStatus.ACTIVE
      });
      
      if (!activatedLicense) {
        throw new AppError('Failed to activate license', 500);
      }
      
      // Log activation audit
      await auditService.logAction(
        license._id.toString(),
        'license',
        AuditActionType.ACTIVATE,
        userId,
        { activationStatus: license.activationStatus },
        { activationStatus: ActivationStatus.ACTIVATED, licenseHex: licenseHex.substring(0, 16) + '...' },
        { schoolId, activatedAt: new Date() }
      );
      
      logger.info('License activated successfully', { 
        licenseId: license._id, 
        schoolId
      });
      
      return {
        licenseHex,
        expiresAt: license.expiresAt,
        features: license.features.filter(f => f.enabled).map(f => f.name),
        message: 'License activated successfully'
      };
      
    } catch (error) {
      if (error instanceof LicenseError || error instanceof AppError) {
        throw error;
      }
      
      logger.error('Error activating license:', { error });
      throw new AppError(`Failed to activate license: ${(error as Error).message}`, 500);
    }
  }
}

export const licenseActivationService = new LicenseActivationService(); 