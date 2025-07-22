import crypto from 'crypto';
import { License, SecurityRestrictions } from '../interfaces/license.interface';
import { Logger } from './logger';
import { AppError } from '../middlewares/errorHandler';
import { generateHardwareFingerprint } from './hash';
import ipaddr from 'ipaddr.js';

const logger = new Logger('Security');

/**
 * Hardware information interface
 */
export interface HardwareInfo {
	cpuId?: string;
	diskId?: string;
	macAddress?: string;
	hostname?: string;
	osInfo?: {
		platform?: string;
		release?: string;
		arch?: string;
	};
	[key: string]: any;
}

/**
 * Client information interface
 */
export interface ClientInfo {
	ip?: string;
	userAgent?: string;
	country?: string;
	hardwareInfo?: HardwareInfo;
	deviceId?: string;
	[key: string]: any;
}

/**
 * Security validation result interface
 */
export interface SecurityValidationResult {
	valid: boolean;
	errors: string[];
}

/**
 * Generate a license fingerprint
 * This is used to detect license tampering
 * 
 * @param license License to fingerprint
 * @returns Fingerprint string
 */
export const generateLicenseFingerprint = (license: Partial<License>): string => {
	try {
		const secret = process.env.LICENSE_FINGERPRINT_SECRET || process.env.LICENSE_HASH_SECRET;

		if (!secret) {
			throw new Error('LICENSE_FINGERPRINT_SECRET is not defined in environment variables');
		}

		// Create a string representation of the critical license data
		const dataToHash = JSON.stringify({
			schoolId: license.schoolId,
			schoolName: license.schoolName,
			features: license.features?.map(f => ({ name: f.name, enabled: f.enabled })),
			issuedAt: license.issuedAt,
			expiresAt: license.expiresAt,
			licenseKey: license.licenseKey?.substring(0, 20), // Include part of the license key
			securityRestrictions: license.securityRestrictions
		});

		// Create HMAC using SHA256
		const hmac = crypto.createHmac('sha256', secret);
		hmac.update(dataToHash);

		return hmac.digest('hex');
	} catch (error) {
		logger.error('Error generating license fingerprint:', {error});
		throw new AppError('Failed to generate license fingerprint', 500);
	}
};

/**
 * Verify a license fingerprint
 * 
 * @param license License to verify
 * @returns Boolean indicating if fingerprint is valid
 */
export const verifyLicenseFingerprint = (license: License): boolean => {
	try {
		if (!license.fingerprint) {
			return true; // No fingerprint to verify
		}

		const generatedFingerprint = generateLicenseFingerprint(license);
		return crypto.timingSafeEqual(
			Buffer.from(generatedFingerprint, 'hex'),
			Buffer.from(license.fingerprint, 'hex')
		);
	} catch (error) {
		logger.error('Error verifying license fingerprint:', {error});
		return false;
	}
};

/**
 * Validate hardware binding
 * 
 * @param license License to validate
 * @param hardwareInfo Hardware information
 * @returns Validation result
 */
export const validateHardwareBinding = (
	license: License,
	hardwareInfo?: HardwareInfo
): SecurityValidationResult => {
	try {
		// If hardware binding is not enabled, return valid
		if (!license.securityRestrictions?.hardwareBinding?.enabled) {
			return { valid: true, errors: [] };
		}

		// If no hardware info provided, return invalid
		if (!hardwareInfo) {
			return {
				valid: false,
				errors: ['Hardware information required for validation']
			};
		}

		// Generate hardware fingerprint
		const fingerprint = generateHardwareFingerprint(hardwareInfo);

		// Check if fingerprint is in allowed list
		const allowedFingerprints = license.securityRestrictions.hardwareBinding.fingerprints || [];

		// If no fingerprints are registered yet, this is the first use
		// Add this fingerprint to the allowed list
		if (allowedFingerprints.length === 0) {
			return {
				valid: true,
				errors: []
			};
		}

		// Check if fingerprint is allowed
		const isAllowed = allowedFingerprints.includes(fingerprint);

		return {
			valid: isAllowed,
			errors: isAllowed ? [] : ['Hardware fingerprint not authorized for this license']
		};
	} catch (error) {
		logger.error('Error validating hardware binding:', {error});
		return {
			valid: false,
			errors: [`Hardware binding validation error: ${(error as Error).message}`]
		};
	}
};

/**
 * Check if an IP is within a CIDR range
 * 
 * @param ip IP address to check
 * @param cidr CIDR range
 * @returns Boolean indicating if IP is in range
 */
export const isIpInCidr = (ip: string, cidr: string): boolean => {
	try {
		const addr = ipaddr.parse(ip);
		const range = ipaddr.parseCIDR(cidr);
		return addr.match(range);
	} catch (error) {
		logger.error('Error checking IP in CIDR:', {error});
		return false;
	}
};

/**
 * Validate IP restrictions
 * 
 * @param license License to validate
 * @param clientInfo Client information
 * @returns Validation result
 */
export const validateIpRestrictions = (
	license: License,
	clientInfo?: ClientInfo
): SecurityValidationResult => {
	try {
		// If IP restrictions are not enabled, return valid
		if (!license.securityRestrictions?.ipRestrictions?.enabled) {
			return { valid: true, errors: [] };
		}

		// If no client info provided, return invalid
		if (!clientInfo || !clientInfo.ip) {
			return {
				valid: false,
				errors: ['Client IP information required for validation']
			};
		}

		const ipRestrictions = license.securityRestrictions.ipRestrictions;
		const clientIp = clientInfo.ip;

		// Check IP address restrictions
		if (ipRestrictions.allowedIps && ipRestrictions.allowedIps.length > 0) {
			let ipAllowed = false;

			for (const allowedIp of ipRestrictions.allowedIps) {
				// Check if it's a CIDR range
				if (allowedIp.includes('/')) {
					if (isIpInCidr(clientIp, allowedIp)) {
						ipAllowed = true;
						break;
					}
				}
				// Exact IP match
				else if (allowedIp === clientIp) {
					ipAllowed = true;
					break;
				}
			}

			if (!ipAllowed) {
				return {
					valid: false,
					errors: ['IP address not authorized for this license']
				};
			}
		}

		// Check country restrictions
		if (
			ipRestrictions.allowedCountries &&
			ipRestrictions.allowedCountries.length > 0 &&
			clientInfo.country
		) {
			const countryAllowed = ipRestrictions.allowedCountries.includes(clientInfo.country);

			if (!countryAllowed) {
				return {
					valid: false,
					errors: ['Country not authorized for this license']
				};
			}
		}

		return { valid: true, errors: [] };
	} catch (error) {
		logger.error('Error validating IP restrictions:', {error});
		return {
			valid: false,
			errors: [`IP restriction validation error: ${(error as Error).message}`]
		};
	}
};

/**
 * Validate device limit
 * 
 * @param license License to validate
 * @param deviceId Device ID
 * @param currentDeviceCount Current number of devices using this license
 * @returns Validation result
 */
export const validateDeviceLimit = (
	license: License,
	deviceId?: string,
	currentDeviceCount?: number
): SecurityValidationResult => {
	try {
		// If device limit is not enabled, return valid
		if (!license.securityRestrictions?.deviceLimit?.enabled) {
			return { valid: true, errors: [] };
		}

		// If no device ID provided, return invalid
		if (!deviceId) {
			return {
				valid: false,
				errors: ['Device ID required for validation']
			};
		}

		const deviceLimit = license.securityRestrictions.deviceLimit;

		// If current device count is not provided or is less than max, return valid
		// The actual counting logic would be implemented in the license service
		if (currentDeviceCount === undefined || currentDeviceCount < deviceLimit.maxDevices) {
			return { valid: true, errors: [] };
		}

		return {
			valid: false,
			errors: [`Device limit exceeded (${currentDeviceCount}/${deviceLimit.maxDevices})`]
		};
	} catch (error) {
		logger.error('Error validating device limit:', {error});
		return {
			valid: false,
			errors: [`Device limit validation error: ${(error as Error).message}`]
		};
	}
};

/**
 * Validate all security restrictions
 * 
 * @param license License to validate
 * @param clientInfo Client information
 * @param currentDeviceCount Current number of devices using this license
 * @returns Validation result
 */
export const validateSecurityRestrictions = (
	license: License,
	clientInfo?: ClientInfo,
	currentDeviceCount?: number
): SecurityValidationResult => {
	try {
		// If license is blacklisted, return invalid
		if (license.blacklisted) {
			return {
				valid: false,
				errors: [`License is blacklisted${license.blacklistReason ? `: ${license.blacklistReason}` : ''}`]
			};
		}

		// Verify license fingerprint
		if (!verifyLicenseFingerprint(license)) {
			return {
				valid: false,
				errors: ['License fingerprint verification failed, possible tampering detected']
			};
		}

		// If no security restrictions, return valid
		if (!license.securityRestrictions) {
			return { valid: true, errors: [] };
		}

		// Validate hardware binding
		const hardwareResult = validateHardwareBinding(license, clientInfo?.hardwareInfo);
		if (!hardwareResult.valid) {
			return hardwareResult;
		}

		// Validate IP restrictions
		const ipResult = validateIpRestrictions(license, clientInfo);
		if (!ipResult.valid) {
			return ipResult;
		}

		// Validate device limit
		const deviceResult = validateDeviceLimit(license, clientInfo?.deviceId, currentDeviceCount);
		if (!deviceResult.valid) {
			return deviceResult;
		}

		return { valid: true, errors: [] };
	} catch (error) {
		logger.error('Error validating security restrictions:', {error});
		return {
			valid: false,
			errors: [`Security validation error: ${(error as Error).message}`]
		};
	}
};