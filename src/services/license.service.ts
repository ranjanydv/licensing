import { License, LicenseRequest, ValidationResult, LicenseStatus, LicenseCheckReport, JWTPayload, Feature, SecurityRestrictions } from '../interfaces/license.interface';
import { ILicenseService } from '../interfaces/service.interface';
import { licenseRepository } from '../repositories/license.repository';
import { generateToken, verifyToken } from '../utils/jwt';
import { generateLicenseHash, verifyLicenseHash, generateHardwareFingerprint } from '../utils/hash';
import { Logger } from '../utils/logger';
import { AppError, LicenseError } from '../middlewares/errorHandler';
import { Document } from 'mongoose';
import { notificationService, AlertSeverity } from './notification.service';
import { auditService } from './audit.service';
import { AuditActionType } from '../models/audit-log.model';
import { hasFeature, meetsRestriction, validateFeature, validateFeatures, FeatureValidationResult } from '../utils/featureValidation';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRepository } from '../repositories/analytics.repository';
import { UsageEventType } from '../interfaces/analytics.interface';
import {
  generateLicenseFingerprint,
  validateSecurityRestrictions,
  ClientInfo,
  HardwareInfo,
  SecurityValidationResult,
  verifyLicenseFingerprint
} from '../utils/security';


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
    context: Record<string, any> = {},
    clientInfo?: any
  ): FeatureValidationResult {
    const result = validateFeature(license.features, featureName, context);

    // Track feature usage
    analyticsService.trackFeatureUsage(
      license._id.toString(),
      license.schoolId,
      featureName,
      {
        valid: result.isValid,
        restrictions: result.restrictionDetails,
        context
      },
      clientInfo
    ).catch(err => this.logger.error('Failed to track feature usage', { error: err }));

    return result;
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
      const existingLicense = await licenseRepository.findActiveBySchoolId(licenseData.schoolId);
      if (existingLicense) {
        throw new LicenseError(
          'School already has an active license',
          'LICENSE_ALREADY_EXISTS',
          409
        );
      }

      // Calculate expiration date
      const issuedAt = new Date();
      const expiresAt = new Date();
      expiresAt.setDate(issuedAt.getDate() + licenseData.duration);

      // Create license data
      const licenseDataWithDates: Partial<License> = {
        ...licenseData,
        issuedAt,
        expiresAt,
        lastChecked: issuedAt,
        status: LicenseStatus.ACTIVE,
        updatedBy: licenseData.createdBy || 'system',
        blacklisted: false
      };

      // Generate license hash
      const licenseHash = generateLicenseHash(licenseDataWithDates);

      // Create JWT payload with security info
      const jwtPayload: JWTPayload = {
        sub: licenseData.schoolId,
        iss: 'license-management-system',
        iat: Math.floor(issuedAt.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
        schoolName: licenseData.schoolName,
        features: licenseData.features.map(f => f.name),
        licenseId: '', // Will be updated after creation
        metadata: licenseData.metadata || {},
        securityInfo: {
          hardwareBindingEnabled: licenseData.securityRestrictions?.hardwareBinding?.enabled || false,
          ipRestrictionsEnabled: licenseData.securityRestrictions?.ipRestrictions?.enabled || false,
          deviceLimitEnabled: licenseData.securityRestrictions?.deviceLimit?.enabled || false
        }
      };

      // Generate JWT token
      const licenseKey = generateToken(jwtPayload);

      // Create license in database
      const license = await licenseRepository.create({
        ...licenseDataWithDates,
        licenseKey,
        licenseHash
      });

      // Generate license fingerprint for tamper detection
      const fingerprint = generateLicenseFingerprint(license);

      // Update JWT payload with license ID and regenerate token
      jwtPayload.licenseId = license._id.toString();
      jwtPayload.securityInfo!.fingerprint = fingerprint;
      const updatedLicenseKey = generateToken(jwtPayload);

      // Update license with new token and fingerprint
      const updatedLicense = await licenseRepository.update(license._id.toString(), {
        licenseKey: updatedLicenseKey,
        fingerprint
      });

      if (!updatedLicense) {
        throw new AppError('Failed to update license with ID', 500);
      }

      this.logger.info('License generated successfully', { licenseId: updatedLicense._id });
      return updatedLicense;
    } catch (error) {
      if (error instanceof LicenseError || error instanceof AppError) {
        throw error;
      }
      this.logger.error('Error generating license:', { error });
      throw new AppError(`Failed to generate license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Validate a license
   * @param licenseKey License key (JWT token)
   * @param schoolId School ID
   * @param checkRevocation Whether to check revocation status
   * @param clientInfo Client information for security validation
   * @returns Validation result
   */
  async validateLicense(licenseKey: string, schoolId: string, checkRevocation = true, clientInfo?: ClientInfo): Promise<ValidationResult> {
    try {
      this.logger.info('Validating license', { schoolId });
      let payload: JWTPayload | undefined;
      try {
        payload = verifyToken(licenseKey);
      } catch (error) {
        if (payload?.licenseId) {
          analyticsService.trackLicenseValidation(
            payload.licenseId,
            schoolId,
            false,
            { error: (error as Error).message },
            clientInfo
          ).catch(err => this.logger.error('Failed to track license validation', { error: err }));
        }
        return {
          valid: false,
          errors: [(error as Error).message]
        };
      }

      if (payload.sub !== schoolId) {
        analyticsService.trackLicenseValidation(
          payload.licenseId,
          schoolId,
          false,
          { error: 'License does not match school ID' },
          clientInfo
        ).catch(err => this.logger.error('Failed to track license validation', { error: err }));
        return {
          valid: false,
          errors: ['License does not match school ID']
        };
      }

      // Check if license exists in database
      const license = await licenseRepository.findByLicenseKey(licenseKey);
      if (!license) {
        analyticsService.trackLicenseValidation(
          payload.licenseId,
          schoolId,
          false,
          { error: 'License not found in database' },
          clientInfo
        ).catch(err => this.logger.error('Failed to track license validation', { error: err }));
        return {
          valid: false,
          errors: ['License not found in database']
        };
      }

      // Verify license hash
      const isHashValid = verifyLicenseHash(license, license.licenseHash);
      if (!isHashValid) {
        analyticsService.trackLicenseValidation(
          license._id.toString(),
          schoolId,
          false,
          { error: 'License hash verification failed' },
          clientInfo
        ).catch(err => this.logger.error('Failed to track license validation', { error: err }));
        return {
          valid: false,
          errors: ['License hash verification failed']
        };
      }

      // Check if license is blacklisted
      if (license.blacklisted) {
        analyticsService.trackLicenseValidation(
          license._id.toString(),
          schoolId,
          false,
          { error: `License is blacklisted: ${license.blacklistReason || 'No reason provided'}` },
          clientInfo
        ).catch(err => this.logger.error('Failed to track license validation', { error: err }));
        return {
          valid: false,
          errors: [`License is blacklisted: ${license.blacklistReason || 'No reason provided'}`]
        };
      }

      // Verify license fingerprint if available
      if (license.fingerprint) {
        const isFingerprintValid = verifyLicenseFingerprint(license);
        if (!isFingerprintValid) {
          analyticsService.trackLicenseValidation(
            license._id.toString(),
            schoolId,
            false,
            { error: 'License fingerprint verification failed, possible tampering detected' },
            clientInfo
          ).catch(err => this.logger.error('Failed to track license validation', { error: err }));
          return {
            valid: false,
            errors: ['License fingerprint verification failed, possible tampering detected']
          };
        }
      }

      // Check if license is active
      if (license.status !== LicenseStatus.ACTIVE) {
        analyticsService.trackLicenseValidation(
          license._id.toString(),
          schoolId,
          false,
          { error: `License is ${license.status}` },
          clientInfo
        ).catch(err => this.logger.error('Failed to track license validation', { error: err }));
        return {
          valid: false,
          errors: [`License is ${license.status}`]
        };
      }

      // Check if license has expired
      const now = new Date();
      if (license.expiresAt < now) {
        // Update license status to expired
        await licenseRepository.updateStatus(license._id.toString(), LicenseStatus.EXPIRED);

        // Track failed validation
        analyticsService.trackLicenseValidation(
          license._id.toString(),
          schoolId,
          false,
          { error: 'License has expired' },
          clientInfo
        ).catch(err => this.logger.error('Failed to track license validation', { error: err }));

        return {
          valid: false,
          errors: ['License has expired']
        };
      }

      // Validate security restrictions if present
      if (license.securityRestrictions) {
        // Get current device count for this license (would be implemented in a real system)
        const currentDeviceCount = await this.getDeviceCountForLicense(license._id.toString());

        // Validate all security restrictions
        const securityResult = validateSecurityRestrictions(license, clientInfo, currentDeviceCount);

        if (!securityResult.valid) {
          // Track failed validation
          analyticsService.trackLicenseValidation(
            license._id.toString(),
            schoolId,
            false,
            { error: securityResult.errors.join(', ') },
            clientInfo
          ).catch(err => this.logger.error('Failed to track license validation', { error: err }));

          return {
            valid: false,
            errors: securityResult.errors
          };
        }

        // If hardware binding is enabled and this is a new device, register it
        if (
          license.securityRestrictions.hardwareBinding?.enabled &&
          clientInfo?.hardwareInfo &&
          license.securityRestrictions.hardwareBinding.fingerprints.length === 0
        ) {
          await this.registerHardwareFingerprint(license._id.toString(), clientInfo.hardwareInfo);
        }
      }

      // Check revocation status if requested
      if (checkRevocation) {
        // Update last checked timestamp
        await licenseRepository.update(license._id.toString(), {
          lastChecked: new Date()
        });
      }

      // Calculate days until expiration
      const daysUntilExpiration = Math.ceil(
        (license.expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Track successful validation
      analyticsService.trackLicenseValidation(
        license._id.toString(),
        schoolId,
        true,
        { daysUntilExpiration },
        clientInfo
      ).catch(err => this.logger.error('Failed to track license validation', { error: err }));

      return {
        valid: true,
        license,
        expiresIn: daysUntilExpiration
      };
    } catch (error) {
      this.logger.error('Error validating license:', { error });
      if (typeof schoolId === 'string') {
        analyticsService.trackEvent({
          licenseId: 'unknown',
          schoolId,
          eventType: UsageEventType.ERROR,
          eventData: { error: (error as Error).message, context: 'license_validation' },
          clientInfo
        }).catch(err => this.logger.error('Failed to track error event', { error: err }));
      }
      return {
        valid: false,
        errors: [(error as Error).message]
      };
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

      // If features are updated, update the license key
      if (data.features) {
        // Calculate expiration date if duration is provided
        let expiresAt = existingLicense.expiresAt;
        if (data.duration) {
          expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + data.duration);
          updateData.expiresAt = expiresAt;
        }

        // Create updated license data for hash generation
        const licenseDataForHash: Partial<License> = {
          schoolId: data.schoolId || existingLicense.schoolId,
          schoolName: data.schoolName || existingLicense.schoolName,
          features: data.features,
          issuedAt: existingLicense.issuedAt,
          expiresAt
        };

        // Generate new license hash
        const licenseHash = generateLicenseHash(licenseDataForHash);
        updateData.licenseHash = licenseHash;

        // Create JWT payload
        const jwtPayload: JWTPayload = {
          sub: data.schoolId || existingLicense.schoolId,
          iss: 'license-management-system',
          iat: Math.floor(existingLicense.issuedAt.getTime() / 1000),
          exp: Math.floor(expiresAt.getTime() / 1000),
          schoolName: data.schoolName || existingLicense.schoolName,
          features: data.features.map(f => f.name),
          licenseId: existingLicense._id.toString(),
          metadata: data.metadata || existingLicense.metadata
        };

        // Generate new JWT token
        const licenseKey = generateToken(jwtPayload);
        updateData.licenseKey = licenseKey;
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
  async revokeLicense(id: string, updatedBy: string): Promise<boolean> {
    try {
      this.logger.info('Revoking license', { licenseId: id });

      // Get existing license
      const existingLicense = await licenseRepository.findById(id);
      if (!existingLicense) {
        return false;
      }

      // Update license status to revoked
      const updatedLicense = await licenseRepository.update(id, {
        status: LicenseStatus.REVOKED,
        updatedBy
      });

      if (!updatedLicense) {
        throw new AppError('Failed to revoke license', 500);
      }

      // Send notification about revoked license
      await notificationService.notifyLicenseRevocation(updatedLicense);

      this.logger.info('License revoked successfully', { licenseId: id });
      return true;
    } catch (error) {
      this.logger.error('Error revoking license:', { error });
      throw new AppError(`Failed to revoke license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Check all licenses for expiration
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

      // Get all licenses
      const licenses = await licenseRepository.findAll();
      report.totalChecked = licenses.length;

      // Check each license
      for (const license of licenses) {
        try {
          // Skip already expired or revoked licenses
          if (license.status === LicenseStatus.EXPIRED) {
            report.expired++;
            report.details.push({
              licenseId: license._id.toString(),
              schoolName: license.schoolName,
              status: LicenseStatus.EXPIRED
            });
            continue;
          }

          if (license.status === LicenseStatus.REVOKED) {
            report.revoked++;
            report.details.push({
              licenseId: license._id.toString(),
              schoolName: license.schoolName,
              status: LicenseStatus.REVOKED
            });
            continue;
          }

          // Check if license has expired
          if (license.expiresAt < now && license.status === LicenseStatus.ACTIVE) {
            // Update license status to expired
            await licenseRepository.updateStatus(license._id.toString(), LicenseStatus.EXPIRED);

            // Send notification about expired license
            await notificationService.notifyLicenseExpiration(license);

            report.expired++;
            report.details.push({
              licenseId: license._id.toString(),
              schoolName: license.schoolName,
              status: LicenseStatus.EXPIRED,
              message: 'License expired'
            });
          } else if (license.status === LicenseStatus.ACTIVE) {
            // Update last checked timestamp
            await licenseRepository.update(license._id.toString(), {
              lastChecked: now
            });

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
      if (existingLicense.expiresAt < now || existingLicense.status === LicenseStatus.EXPIRED) {
        expiresAt.setDate(now.getDate() + duration);
      } else {
        expiresAt.setDate(existingLicense.expiresAt.getDate() + duration);
      }

      // Create updated license data for hash generation
      const licenseDataForHash: Partial<License> = {
        schoolId: existingLicense.schoolId,
        schoolName: existingLicense.schoolName,
        features: existingLicense.features,
        issuedAt: existingLicense.issuedAt,
        expiresAt
      };

      // Generate new license hash
      const licenseHash = generateLicenseHash(licenseDataForHash);

      // Create JWT payload
      const jwtPayload: JWTPayload = {
        sub: existingLicense.schoolId,
        iss: 'license-management-system',
        iat: Math.floor(existingLicense.issuedAt.getTime() / 1000),
        exp: Math.floor(expiresAt.getTime() / 1000),
        schoolName: existingLicense.schoolName,
        features: existingLicense.features.map(f => f.name),
        licenseId: existingLicense._id.toString(),
        metadata: existingLicense.metadata
      };

      // Generate new JWT token
      const licenseKey = generateToken(jwtPayload);

      // Update license
      const updatedLicense = await licenseRepository.update(id, {
        expiresAt,
        licenseKey,
        licenseHash,
        status: LicenseStatus.ACTIVE,
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

      // Check if target school already has an active license
      const existingTargetLicense = await licenseRepository.findActiveBySchoolId(newSchoolId);
      if (existingTargetLicense) {
        throw new LicenseError(
          'Target school already has an active license',
          'LICENSE_ALREADY_EXISTS',
          409
        );
      }

      // Store previous state for audit logging
      const previousState = {
        schoolId: existingLicense.schoolId,
        schoolName: existingLicense.schoolName,
        licenseKey: existingLicense.licenseKey,
        licenseHash: existingLicense.licenseHash,
        status: existingLicense.status
      };

      // Create updated license data for hash generation
      const licenseDataForHash: Partial<License> = {
        schoolId: newSchoolId,
        schoolName: newSchoolName,
        features: existingLicense.features,
        issuedAt: existingLicense.issuedAt,
        expiresAt: existingLicense.expiresAt
      };

      // Generate new license hash
      const licenseHash = generateLicenseHash(licenseDataForHash);

      // Create JWT payload
      const jwtPayload: JWTPayload = {
        sub: newSchoolId,
        iss: 'license-management-system',
        iat: Math.floor(existingLicense.issuedAt.getTime() / 1000),
        exp: Math.floor(existingLicense.expiresAt.getTime() / 1000),
        schoolName: newSchoolName,
        features: existingLicense.features.map(f => f.name),
        licenseId: existingLicense._id.toString(),
        metadata: existingLicense.metadata
      };

      // Generate new JWT token
      const licenseKey = generateToken(jwtPayload);

      // Prepare update data
      const updateData = {
        schoolId: newSchoolId,
        schoolName: newSchoolName,
        licenseKey,
        licenseHash,
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
          licenseKey: licenseKey.substring(0, 10) + '...' // Only log part of the key for security
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

  /**
   * Register a hardware fingerprint for a license
   * @param licenseId License ID
   * @param hardwareInfo Hardware information
   * @returns Updated license or null if not found
   */
  async registerHardwareFingerprint(licenseId: string, hardwareInfo: HardwareInfo): Promise<License | null> {
    try {
      this.logger.info('Registering hardware fingerprint', { licenseId });

      // Get existing license
      const license = await licenseRepository.findById(licenseId);
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Generate hardware fingerprint
      const fingerprint = generateHardwareFingerprint(hardwareInfo);

      // Initialize security restrictions if not present
      if (!license.securityRestrictions) {
        license.securityRestrictions = {
          hardwareBinding: {
            enabled: true,
            fingerprints: []
          }
        };
      }

      // Initialize hardware binding if not present
      if (!license.securityRestrictions.hardwareBinding) {
        license.securityRestrictions.hardwareBinding = {
          enabled: true,
          fingerprints: []
        };
      }

      // Add fingerprint if not already registered
      if (!license.securityRestrictions.hardwareBinding.fingerprints.includes(fingerprint)) {
        license.securityRestrictions.hardwareBinding.fingerprints.push(fingerprint);
      }

      // Update license
      const updatedLicense = await licenseRepository.update(licenseId, {
        securityRestrictions: license.securityRestrictions
      });

      this.logger.info('Hardware fingerprint registered successfully', {
        licenseId,
        fingerprintCount: license.securityRestrictions.hardwareBinding.fingerprints.length
      });

      return updatedLicense;
    } catch (error) {
      this.logger.error('Error registering hardware fingerprint:', { error });
      throw new AppError(`Failed to register hardware fingerprint: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Remove a hardware fingerprint from a license
   * @param licenseId License ID
   * @param fingerprint Hardware fingerprint to remove
   * @returns Updated license or null if not found
   */
  async removeHardwareFingerprint(licenseId: string, fingerprint: string): Promise<License | null> {
    try {
      this.logger.info('Removing hardware fingerprint', { licenseId });

      // Get existing license
      const license = await licenseRepository.findById(licenseId);
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Check if license has hardware binding
      if (
        !license.securityRestrictions?.hardwareBinding?.enabled ||
        !license.securityRestrictions?.hardwareBinding?.fingerprints
      ) {
        throw new LicenseError('License does not have hardware binding enabled', 'HARDWARE_BINDING_NOT_ENABLED', 400);
      }

      // Remove fingerprint
      const fingerprints = license.securityRestrictions.hardwareBinding.fingerprints.filter(
        fp => fp !== fingerprint
      );

      license.securityRestrictions.hardwareBinding.fingerprints = fingerprints;

      // Update license
      const updatedLicense = await licenseRepository.update(licenseId, {
        securityRestrictions: license.securityRestrictions
      });

      this.logger.info('Hardware fingerprint removed successfully', {
        licenseId,
        fingerprintCount: fingerprints.length
      });

      return updatedLicense;
    } catch (error) {
      this.logger.error('Error removing hardware fingerprint:', { error });
      throw new AppError(`Failed to remove hardware fingerprint: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Update IP restrictions for a license
   * @param licenseId License ID
   * @param ipRestrictions IP restrictions
   * @returns Updated license or null if not found
   */
  async updateIpRestrictions(
    licenseId: string,
    ipRestrictions: { enabled: boolean; allowedIps: string[]; allowedCountries?: string[] }
  ): Promise<License | null> {
    try {
      this.logger.info('Updating IP restrictions', { licenseId });

      // Get existing license
      const license = await licenseRepository.findById(licenseId);
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Initialize security restrictions if not present
      if (!license.securityRestrictions) {
        license.securityRestrictions = {};
      }

      // Update IP restrictions
      license.securityRestrictions.ipRestrictions = ipRestrictions;

      // Update license
      const updatedLicense = await licenseRepository.update(licenseId, {
        securityRestrictions: license.securityRestrictions
      });

      this.logger.info('IP restrictions updated successfully', { licenseId });

      return updatedLicense;
    } catch (error) {
      this.logger.error('Error updating IP restrictions:', { error });
      throw new AppError(`Failed to update IP restrictions: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Update device limit for a license
   * @param licenseId License ID
   * @param deviceLimit Device limit
   * @returns Updated license or null if not found
   */
  async updateDeviceLimit(
    licenseId: string,
    deviceLimit: { enabled: boolean; maxDevices: number }
  ): Promise<License | null> {
    try {
      this.logger.info('Updating device limit', { licenseId });

      // Get existing license
      const license = await licenseRepository.findById(licenseId);
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Initialize security restrictions if not present
      if (!license.securityRestrictions) {
        license.securityRestrictions = {};
      }

      // Update device limit
      license.securityRestrictions.deviceLimit = deviceLimit;

      // Update license
      const updatedLicense = await licenseRepository.update(licenseId, {
        securityRestrictions: license.securityRestrictions
      });

      this.logger.info('Device limit updated successfully', { licenseId });

      return updatedLicense;
    } catch (error) {
      this.logger.error('Error updating device limit:', { error });
      throw new AppError(`Failed to update device limit: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Get device count for a license
   * This is a placeholder implementation
   * In a real system, you would track devices in a separate collection
   * 
   * @param licenseId License ID
   * @returns Number of devices using this license
   */
  async getDeviceCountForLicense(licenseId: string): Promise<number> {
    try {
      // In a real implementation, this would query a device tracking collection
      // For now, we'll return a placeholder value
      return 0;
    } catch (error) {
      this.logger.error('Error getting device count:', { error });
      return 0;
    }
  }

  /**
   * Blacklist a license
   * @param licenseId License ID
   * @param reason Reason for blacklisting
   * @param updatedBy User who blacklisted the license
   * @returns Updated license or null if not found
   */
  async blacklistLicense(licenseId: string, reason: string, updatedBy: string): Promise<License | null> {
    try {
      this.logger.info('Blacklisting license', { licenseId, reason });

      // Get existing license
      const license = await licenseRepository.findById(licenseId);
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // Update license
      const updatedLicense = await licenseRepository.update(licenseId, {
        blacklisted: true,
        blacklistReason: reason,
        updatedBy
      });

      if (!updatedLicense) {
        throw new AppError('Failed to blacklist license', 500);
      }

      // Log the blacklisting action
      await auditService.logAction(
        licenseId,
        'license',
        AuditActionType.BLACKLIST,
        updatedBy,
        { blacklisted: license.blacklisted, blacklistReason: license.blacklistReason },
        { blacklisted: true, blacklistReason: reason },
        { timestamp: new Date() }
      );

      // Send notification about blacklisted license
      await notificationService.sendAdminAlert(
        `License ${licenseId} for ${license.schoolName} has been blacklisted: ${reason}`,
        AlertSeverity.HIGH
      );

      this.logger.info('License blacklisted successfully', { licenseId });
      return updatedLicense;
    } catch (error) {
      this.logger.error('Error blacklisting license:', { error });
      throw new AppError(`Failed to blacklist license: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Remove a license from the blacklist
   * @param licenseId License ID
   * @param updatedBy User who removed the license from the blacklist
   * @returns Updated license or null if not found
   */
  async removeFromBlacklist(licenseId: string, updatedBy: string): Promise<License | null> {
    try {
      this.logger.info('Removing license from blacklist', { licenseId });

      // Get existing license
      const license = await licenseRepository.findById(licenseId);
      if (!license) {
        throw new LicenseError('License not found', 'LICENSE_NOT_FOUND', 404);
      }

      // If license is not blacklisted, return it as is
      if (!license.blacklisted) {
        return license;
      }

      // Update license
      const updatedLicense = await licenseRepository.update(licenseId, {
        blacklisted: false,
        blacklistReason: undefined,
        updatedBy
      });

      if (!updatedLicense) {
        throw new AppError('Failed to remove license from blacklist', 500);
      }

      // Log the action
      await auditService.logAction(
        licenseId,
        'license',
        AuditActionType.UNBLACKLIST,
        updatedBy,
        { blacklisted: license.blacklisted, blacklistReason: license.blacklistReason },
        { blacklisted: false, blacklistReason: undefined },
        { timestamp: new Date() }
      );

      this.logger.info('License removed from blacklist successfully', { licenseId });
      return updatedLicense;
    } catch (error) {
      this.logger.error('Error removing license from blacklist:', { error });
      throw new AppError(`Failed to remove license from blacklist: ${(error as Error).message}`, 500);
    }
  }

  /**
   * Check if a license is blacklisted
   * @param licenseId License ID or license key
   * @returns Boolean indicating if license is blacklisted and reason if available
   */
  async checkBlacklist(licenseIdOrKey: string): Promise<{ blacklisted: boolean; reason?: string }> {
    try {
      this.logger.info('Checking blacklist status', { licenseIdOrKey: licenseIdOrKey.substring(0, 10) + '...' });

      // Try to find by ID first
      let license = await licenseRepository.findById(licenseIdOrKey);

      // If not found by ID, try by license key
      if (!license) {
        license = await licenseRepository.findByLicenseKey(licenseIdOrKey);
      }

      // If license not found, return not blacklisted
      if (!license) {
        return { blacklisted: false };
      }
      
      return {
        blacklisted: !!license.blacklisted,
        reason: license.blacklisted ? license.blacklistReason : undefined
      };
    } catch (error) {
      this.logger.error('Error checking blacklist status:', { error });
      throw new AppError(`Failed to check blacklist status: ${(error as Error).message}`, 500);
    }
  }
}

// Create analytics repository and service
export const analyticsRepository = new AnalyticsRepository();
export const analyticsService = new AnalyticsService(analyticsRepository, null as any); // Will be updated after licenseService is created

// Export singleton instance
export const licenseService = new LicenseService();

// Update analytics service with license service reference
(analyticsService as any).licenseService = licenseService;

export default licenseService;