import mongoose from 'mongoose';
import { JWTPayload, License, LicenseCheckReport, LicenseRequest, LicenseStatus, ValidationResult, ActivationStatus } from '../interfaces/license.interface';
import { ILicenseService } from '../interfaces/service.interface';
import { AppError, LicenseError } from '../middlewares/errorHandler';
import { AuditActionType } from '../models/audit-log.model';
import { licenseRepository } from '../repositories/license.repository';
import { FeatureValidationResult, hasFeature, meetsRestriction, validateFeature, validateFeatures } from '../utils/featureValidation';
import { generateSecureLicenseKey } from '../utils/licenseHexGenerator';
import { Logger } from '../utils/logger';
import { auditService } from './audit.service';
import { AlertSeverity, notificationService } from './notification.service';

/**
 * License service implementation
 */
export class LicenseService implements ILicenseService {
  private readonly logger = new Logger('LicenseService');

  /**
   * Check if a license has a specific feature
   * @param license License to check
   * @param featureName Name of the feature to check
   * @returns Boolean indicating if the feature is available
   */
  hasFeature(license: License, featureName: string): boolean {
    return hasFeature(license.features, featureName);
  }

  /**
   * Validate if a feature meets specific restrictions
   * @param license License to check
   * @param featureName Name of the feature to check
   * @param restrictionKey Specific restriction to check
   * @param value Value to compare against the restriction
   * @returns Boolean indicating if the restriction is met
   */
  meetsRestriction(
    license: License,
    featureName: string,
    restrictionKey: string,
    value: any
  ): boolean {
    return meetsRestriction(license.features, featureName, restrictionKey, value);
  }

  /**
   * Validate a feature against all its restrictions
   * @param license License to check
   * @param featureName Name of the feature to check
   * @param context Context object containing values to check against restrictions
   * @returns Validation result
   */
  validateFeature(
    license: License,
    featureName: string,
    context: Record<string, any> = {}
  ): FeatureValidationResult {
    return validateFeature(license.features, featureName, context);
  }

  /**
   * Validate multiple features against their restrictions
   * @param license License to check
   * @param featureNames Names of features to check
   * @param context Context object containing values to check against restrictions
   * @returns Array of validation results
   */
  validateFeatures(
    license: License,
    featureNames: string[],
    context: Record<string, any> = {}
  ): FeatureValidationResult[] {
    return validateFeatures(license.features, featureNames, context);
  }

  /**
   * Generate a new license
   * @param licenseData License request data
   * @returns Generated license
   */
  async generateLicense(licenseData: LicenseRequest): Promise<License> {
    try {
      this.logger.info('Generating license for school', { schoolId: licenseData.schoolId });

      // Check if school already has an active license
      const existingLicense = await licenseRepository.findActivatedBySchoolId(licenseData.schoolId);
      if (existingLicense) {
        throw new LicenseError(
          'School already has an activated license',
          'LICENSE_ALREADY_EXISTS',
          409
        );
      }

      // Calculate expiration date
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(issuedAt.getDate() + licenseData.duration);

      // Generate a short, random, public-facing license key
      const licenseKey = generateSecureLicenseKey();

      // Create license data
      const licenseDataWithDates: Partial<License> = {
        ...licenseData,
        licenseKey,
        issuedAt,
        expiresAt,
        activationStatus: ActivationStatus.PENDING,
        status: LicenseStatus.PENDING,
        updatedBy: licenseData.createdBy || 'system',
        activationAttempts: 0
      };

      // Create license in database
      const license = await licenseRepository.create(licenseDataWithDates);

      this.logger.info('License generated successfully', { licenseId: license._id });
      return license;
    } catch (error) {
      if (error instanceof LicenseError || error instanceof AppError) {
        throw error;
      }
      this.logger.error('Error generating license:', { error });
      throw new AppError(`Failed to generate license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Validate a license (for backward compatibility)
   * @param licenseKey License key (short, public-facing key)
   * @param schoolId School ID
   * @returns Validation result
   */
  async validateLicense(licenseKey: string, schoolId: string): Promise<ValidationResult> {
    try {
      this.logger.info('Validating license', { schoolId });
      
      // Lookup license by short licenseKey
      const license = await licenseRepository.findByLicenseKey(licenseKey);
      if (!license) {
        return { valid: false, errors: ['License not found'] };
      }
      
      // Validate schoolId matches
      if (license.schoolId !== schoolId) {
        return { valid: false, errors: ['School ID does not match'] };
      }
      
      // Check activation status
      if (license.activationStatus !== ActivationStatus.ACTIVATED) {
        return { valid: false, errors: ['License not activated'] };
      }
      
      // Check expiration
      if (license.expiresAt < new Date()) {
        return { valid: false, errors: ['License has expired'] };
      }
      
      // All checks passed
      return {
        valid: true,
        license: license as License,
        expiresIn: Math.ceil((license.expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      };
    } catch (error) {
      this.logger.error('Error validating license:', { error });
      return { valid: false, errors: [(error as Error).message] };
    }
  }

  /**
   * Get a license by ID
   * @param id License ID
   * @returns License or null if not found
   */
  async getLicense(id: string): Promise<License | null> {
    return licenseRepository.findById(id);
  }

  /**
   * Get all licenses with pagination
   * @param filter Optional filter
   * @param options Pagination options (skip, limit)
   * @returns Paginated result with licenses and total count
   */
  async getAllLicenses(filter: Partial<License> = {}, options: { skip?: number; limit?: number } = {}): Promise<{ licenses: License[]; total: number; page: number; limit: number; totalPages: number; }> {
    const page = options.skip && options.limit ? Math.floor(options.skip / options.limit) + 1 : 1;
    const limit = options.limit || 20;
    const result = await licenseRepository.findWithPagination(filter, page, limit);
    return {
      licenses: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages
    };
  }

  /**
   * Update a license
   * @param id License ID
   * @param data Update data
   * @param updatedBy User who updated the license
   * @returns Updated license or null if not found
   */
  async updateLicense(id: string, data: Partial<LicenseRequest>, updatedBy: string): Promise<License | null> {
    try {
      this.logger.info('Updating license', { licenseId: id });

      // Get existing license
      const existingLicense = await licenseRepository.findById(id);
      if (!existingLicense) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Prepare update data
      const updateData: Partial<License> = {
        ...data,
        updatedBy
      };

      // Calculate new expiration date if duration is provided
      let expiresAt = existingLicense.expiresAt;
      if (data.duration) {
        const now = new Date();
        
        // If license has expired or is expired status, start from current date
        if (existingLicense.expiresAt < now || existingLicense.activationStatus === ActivationStatus.EXPIRED) {
          expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + data.duration);
        } else {
          // If license is still active, extend from current expiration date
          expiresAt = new Date(existingLicense.expiresAt);
          expiresAt.setDate(expiresAt.getDate() + data.duration);
        }
        updateData.expiresAt = expiresAt;
        
        // If license was expired and we're extending it, set status back to PENDING
        if (existingLicense.activationStatus === ActivationStatus.EXPIRED) {
          updateData.activationStatus = ActivationStatus.PENDING;
          this.logger.info('License was expired, setting activation status back to PENDING', { 
            licenseId: id, 
            oldExpiry: existingLicense.expiresAt,
            newExpiry: expiresAt 
          });
        }
      }

      // Update license
      const updatedLicense = await licenseRepository.update(id, updateData);

      if (!updatedLicense) {
        throw new AppError('Failed to update license', 500);
      }

      this.logger.info('License updated successfully', { licenseId: id });
      return updatedLicense;
    } catch (error) {
      if (error instanceof LicenseError || error instanceof AppError) {
        throw error;
      }
      this.logger.error('Error updating license:', { error });
      throw new AppError(`Failed to update license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Revoke a license
   * @param id License ID
   * @param updatedBy User who revoked the license
   * @returns True if revoked, false if not found
   */
  async revokeLicense(idOrKey: string, updatedBy: string): Promise<boolean> {
    let license = null;
    try {
      if (mongoose.Types.ObjectId.isValid(idOrKey)) {
        license = await licenseRepository.findById(idOrKey);
      }
      if (!license) {
        license = await licenseRepository.findByLicenseKey(idOrKey);
      }
      if (!license) {
        // Not found is not an error, just return false
        return false;
      }

      // Check if license is already revoked
      if (license.status === LicenseStatus.REVOKED) {
        // Use a more specific error for already revoked
        throw new LicenseError('License already revoked', 'LICENSE_ALREADY_REVOKED', 400);
      }

      // Update license status to revoked
      const updatedLicense = await licenseRepository.update(license._id.toString(), {
        status: LicenseStatus.REVOKED,
        updatedBy
      });

      if (!updatedLicense) {
        // This should be rare, but treat as not found
        throw new LicenseError('License not found for revocation', 'LICENSE_NOT_FOUND', 404);
      }

      // Send notification about revoked license
      try {
        await notificationService.notifyLicenseRevocation(updatedLicense);
      } catch (notifyError) {
        this.logger.warn('Failed to send license revocation notification', { licenseId: license._id, error: notifyError });
        // Do not fail the whole operation if notification fails
      }

      this.logger.info('License revoked successfully', { licenseId: license._id });
      return true;
    } catch (error) {
      // If already a LicenseError or AppError, rethrow as is
      if (error instanceof LicenseError || error instanceof AppError) {
        throw error;
      }
      this.logger.error('Error revoking license:', { error });
      throw new AppError('Failed to revoke license', 500);
    }
  }

  /**
   * Check all licenses for expiration (for backward compatibility)
   * @returns License check report
   */
  async checkLicenses(): Promise<LicenseCheckReport> {
    try {
      this.logger.info('Checking all licenses');

      const now = new Date();
      const report: LicenseCheckReport = {
        totalChecked: 0,
        active: 0,
        expired: 0,
        revoked: 0,
        failed: 0,
        details: []
      };

      // Get all activated licenses
      const licenses = await licenseRepository.findByActivationStatus(ActivationStatus.ACTIVATED);
      report.totalChecked = licenses.length;

      // Check each license
      for (const license of licenses) {
        try {
          // Check if license has expired
          if (license.expiresAt < now) {
            // Update license status to expired
            await licenseRepository.updateActivationStatus(license._id.toString(), ActivationStatus.EXPIRED);

            // Send notification about expired license
            await notificationService.notifyLicenseExpiration(license);

            report.expired++;
            report.details.push({
              licenseId: license._id.toString(),
              schoolName: license.schoolName,
              status: LicenseStatus.EXPIRED,
              message: 'License expired'
            });
          } else {
            // Check if license is expiring soon (within 30 days)
            const daysUntilExpiration = Math.ceil(
              (license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );

            if (daysUntilExpiration <= 30) {
              // Send notification about license expiring soon
              await notificationService.notifyLicenseExpiringSoon(license, daysUntilExpiration);
            }

            report.active++;
            report.details.push({
              licenseId: license._id.toString(),
              schoolName: license.schoolName,
              status: LicenseStatus.ACTIVE
            });
          }
        } catch (error) {
          report.failed++;
          report.details.push({
            licenseId: license._id.toString(),
            schoolName: license.schoolName,
            status: license.status,
            message: `Failed to check license: ${(error as Error).message}`
          });
        }
      }

      this.logger.info('License check completed', {
        totalChecked: report.totalChecked,
        active: report.active,
        expired: report.expired,
        revoked: report.revoked,
        failed: report.failed
      });

      return report;
    } catch (error) {
      this.logger.error('Error checking licenses:', { error });
      throw new AppError(`Failed to check licenses: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Retry failed license checks
   * @returns Number of retried checks
   */
  async retryFailedChecks(): Promise<number> {
    // This is a placeholder implementation
    // In a real system, you would track failed checks and retry them
    return 0;
  }

  /**
   * Renew a license
   * @param id License ID
   * @param duration Duration in days
   * @param updatedBy User who renewed the license
   * @returns Renewed license or null if not found
   */
  async renewLicense(id: string, duration: number, updatedBy: string): Promise<License | null> {
    try {
      this.logger.info('Renewing license', { licenseId: id, duration });

      // Get existing license
      const existingLicense = await licenseRepository.findById(id);
      if (!existingLicense) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Calculate new expiration date
      const now = new Date();
      const expiresAt = new Date();

      // If license is expired, start from now
      // If license is still active, extend from current expiration date
      if (existingLicense.expiresAt < now || existingLicense.activationStatus === ActivationStatus.EXPIRED) {
        expiresAt.setDate(now.getDate() + duration);
      } else {
        expiresAt.setDate(existingLicense.expiresAt.getDate() + duration);
      }

      // Update license
      const updatedLicense = await licenseRepository.update(id, {
        expiresAt,
        activationStatus: ActivationStatus.PENDING, // Reset to pending for reactivation
        status: LicenseStatus.PENDING,
        updatedBy
      });

      if (!updatedLicense) {
        throw new AppError('Failed to renew license', 500);
      }

      this.logger.info('License renewed successfully', { licenseId: id });
      return updatedLicense;
    } catch (error) {
      if (error instanceof LicenseError || error instanceof AppError) {
        throw error;
      }
      this.logger.error('Error renewing license:', { error });
      throw new AppError(`Failed to renew license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Transfer a license to a different school
   * @param id License ID
   * @param newSchoolId New school ID
   * @param newSchoolName New school name
   * @param updatedBy User who transferred the license
   * @returns Transferred license or null if not found
   */
  async transferLicense(id: string, newSchoolId: string, newSchoolName: string, updatedBy: string): Promise<License | null> {
    try {
      this.logger.info('Transferring license', { licenseId: id, newSchoolId });

      // Input validation
      if (!id || !newSchoolId || !newSchoolName || !updatedBy) {
        throw new LicenseError('Missing required parameters for license transfer', 'INVALID_PARAMETERS', 400);
      }

      // Get existing license
      const existingLicense = await licenseRepository.findById(id);
      if (!existingLicense) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Prevent transferring to the same school
      if (existingLicense.schoolId === newSchoolId) {
        throw new LicenseError(
          'Cannot transfer license to the same school',
          'INVALID_TRANSFER',
          400
        );
      }

      // Check if target school already has an activated license
      const existingTargetLicense = await licenseRepository.findActivatedBySchoolId(newSchoolId);
      if (existingTargetLicense) {
        throw new LicenseError(
          'Target school already has an activated license',
          'LICENSE_ALREADY_EXISTS',
          409
        );
      }

      // Store previous state for audit logging
      const previousState = {
        schoolId: existingLicense.schoolId,
        schoolName: existingLicense.schoolName,
        licenseKey: existingLicense.licenseKey,
        activationStatus: existingLicense.activationStatus
      };

      // Prepare update data
      const updateData = {
        schoolId: newSchoolId,
        schoolName: newSchoolName,
        activationStatus: ActivationStatus.PENDING, // Reset to pending for reactivation
        status: LicenseStatus.PENDING,
        updatedBy,
        updatedAt: new Date()
      };

      // Update license
      const updatedLicense = await licenseRepository.update(id, updateData);

      if (!updatedLicense) {
        throw new AppError('Failed to transfer license', 500);
      }

      // Create detailed audit log entry for the transfer
      await auditService.logAction(
        id,
        'license',
        AuditActionType.TRANSFER,
        updatedBy,
        previousState,
        {
          schoolId: newSchoolId,
          schoolName: newSchoolName,
          activationStatus: ActivationStatus.PENDING
        },
        {
          transferTimestamp: new Date(),
          fromSchool: existingLicense.schoolId,
          toSchool: newSchoolId,
          licenseStatus: existingLicense.status,
          expiresAt: existingLicense.expiresAt,
          features: existingLicense.features.map(f => f.name)
        }
      );

      // Send notification about license transfer
      await notificationService.notifyLicenseTransfer(
        updatedLicense,
        existingLicense.schoolId,
        existingLicense.schoolName
      );

      this.logger.info('License transferred successfully', {
        licenseId: id,
        fromSchool: existingLicense.schoolId,
        toSchool: newSchoolId,
        status: existingLicense.status
      });

      return updatedLicense;
    } catch (error) {
      if (error instanceof LicenseError || error instanceof AppError) {
        throw error;
      }
      this.logger.error('Error transferring license:', { error });
      throw new AppError(`Failed to transfer license: ${(error as Error).message}`, 500);
    }
  }
}

// Export singleton instance
export const licenseService = new LicenseService();

export default licenseService;