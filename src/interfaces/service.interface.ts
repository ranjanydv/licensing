import { License, LicenseRequest, ValidationResult, LicenseCheckReport } from './license.interface';
import { FeatureValidationResult } from '../utils/featureValidation';
import { ClientInfo, HardwareInfo } from '../utils/security';

/**
 * License service interface
 */
export interface ILicenseService {
  /**
   * Check if a license has a specific feature
   * @param license License to check
   * @param featureName Name of the feature to check
   * @returns Boolean indicating if the feature is available
   */
  hasFeature(license: License, featureName: string): boolean;
  
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
  ): boolean;
  
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
    context?: Record<string, any>
  ): FeatureValidationResult;
  
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
    context?: Record<string, any>
  ): FeatureValidationResult[];
  /**
   * Generate a new license
   * @param licenseData License request data
   * @returns Generated license
   */
  generateLicense(licenseData: LicenseRequest): Promise<License>;
  
  /**
   * Validate a license
   * @param licenseKey License key (JWT token)
   * @param schoolId School ID
   * @param checkRevocation Whether to check revocation status
   * @param clientInfo Client information for security validation
   * @returns Validation result
   */
  validateLicense(licenseKey: string, schoolId: string, checkRevocation?: boolean, clientInfo?: ClientInfo): Promise<ValidationResult>;
  
  /**
   * Get a license by ID
   * @param id License ID
   * @returns License or null if not found
   */
  getLicense(id: string): Promise<License | null>;
  
  /**
   * Get all licenses with pagination
   * @param filter Optional filter
   * @param options Pagination options (skip, limit)
   * @returns Paginated result with licenses and total count
   */
  getAllLicenses(filter?: Partial<License>, options?: { skip?: number; limit?: number }): Promise<{ licenses: License[]; total: number; page: number; limit: number; totalPages: number; }>;
  
  /**
   * Update a license
   * @param id License ID
   * @param data Update data
   * @param updatedBy User who updated the license
   * @returns Updated license or null if not found
   */
  updateLicense(id: string, data: Partial<LicenseRequest>, updatedBy: string): Promise<License | null>;
  
  /**
   * Revoke a license
   * @param id License ID
   * @param updatedBy User who revoked the license
   * @returns True if revoked, false if not found
   */
  revokeLicense(id: string, updatedBy: string): Promise<boolean>;
  
  /**
   * Check all licenses for expiration
   * @returns License check report
   */
  checkLicenses(): Promise<LicenseCheckReport>;
  
  /**
   * Retry failed license checks
   * @returns Number of retried checks
   */
  retryFailedChecks(): Promise<number>;
  
  /**
   * Renew a license
   * @param id License ID
   * @param duration Duration in days
   * @param updatedBy User who renewed the license
   * @returns Renewed license or null if not found
   */
  renewLicense(id: string, duration: number, updatedBy: string): Promise<License | null>;
  
  /**
   * Transfer a license to a different school
   * @param id License ID
   * @param newSchoolId New school ID
   * @param newSchoolName New school name
   * @param updatedBy User who transferred the license
   * @returns Transferred license or null if not found
   */
  transferLicense(id: string, newSchoolId: string, newSchoolName: string, updatedBy: string): Promise<License | null>;
  
  /**
   * Register a hardware fingerprint for a license
   * @param licenseId License ID
   * @param hardwareInfo Hardware information
   * @returns Updated license or null if not found
   */
  registerHardwareFingerprint(licenseId: string, hardwareInfo: HardwareInfo): Promise<License | null>;
  
  /**
   * Remove a hardware fingerprint from a license
   * @param licenseId License ID
   * @param fingerprint Hardware fingerprint to remove
   * @returns Updated license or null if not found
   */
  removeHardwareFingerprint(licenseId: string, fingerprint: string): Promise<License | null>;
  
  /**
   * Update IP restrictions for a license
   * @param licenseId License ID
   * @param ipRestrictions IP restrictions
   * @returns Updated license or null if not found
   */
  updateIpRestrictions(
    licenseId: string, 
    ipRestrictions: { enabled: boolean; allowedIps: string[]; allowedCountries?: string[] }
  ): Promise<License | null>;
  
  /**
   * Update device limit for a license
   * @param licenseId License ID
   * @param deviceLimit Device limit
   * @returns Updated license or null if not found
   */
  updateDeviceLimit(
    licenseId: string, 
    deviceLimit: { enabled: boolean; maxDevices: number }
  ): Promise<License | null>;
  
  /**
   * Get device count for a license
   * @param licenseId License ID
   * @returns Number of devices using this license
   */
  getDeviceCountForLicense(licenseId: string): Promise<number>;
  
  /**
   * Blacklist a license
   * @param licenseId License ID
   * @param reason Reason for blacklisting
   * @param updatedBy User who blacklisted the license
   * @returns Updated license or null if not found
   */
  blacklistLicense(licenseId: string, reason: string, updatedBy: string): Promise<License | null>;
  
  /**
   * Remove a license from the blacklist
   * @param licenseId License ID
   * @param updatedBy User who removed the license from the blacklist
   * @returns Updated license or null if not found
   */
  removeFromBlacklist(licenseId: string, updatedBy: string): Promise<License | null>;
  
  /**
   * Check if a license is blacklisted
   * @param licenseIdOrKey License ID or license key
   * @returns Boolean indicating if license is blacklisted and reason if available
   */
  checkBlacklist(licenseIdOrKey: string): Promise<{ blacklisted: boolean; reason?: string }>;
}