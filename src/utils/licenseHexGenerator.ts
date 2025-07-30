import crypto from 'crypto';
import { License } from '../interfaces/license.interface';
import { AppError } from './errors';

/**
 * Generate a secure license hex for a license
 * @param license The license to generate hex for
 * @returns Generated license hex
 */
export function generateLicenseHex(license: License): string {
	const licenseSecret = process.env.LICENSE_SECRET || 'default-secret-key';
	if (licenseSecret === 'default-secret-key') {
		throw new AppError(
			'License secret key is not set. Please set the LICENSE_SECRET environment variable.',
			500
		);
	}

	const data = {
		licenseId: license._id.toString(),
		schoolId: license.schoolId,
		issuedAt: license.issuedAt.getTime(),
		expiresAt: license.expiresAt.getTime(),
		features: license.features.map(f => f.name),
		timestamp: Date.now()
	};

	const jsonData = JSON.stringify(data);
	const hash = crypto.createHash('sha256').update(jsonData + licenseSecret).digest('hex');

	// Format: full-hash(64) + licenseId(8) + timestamp(8) + random(8)
	const licenseIdShort = license._id.toString().substring(0, 8);
	const timestamp = Date.now().toString(36);
	const random = crypto.randomBytes(4).toString('hex');

	return `${hash}-${licenseIdShort}-${timestamp}-${random}`;
}

/**
 * Validate a license hex
 * @param hex The hex to validate
 * @param license The license to validate against
 * @returns Validation result
 */
export function validateLicenseHex(hex: string, license: License): boolean {
	try {
		const parts = hex.split('-');
		if (parts.length !== 4) {
			return false;
		}

		const [hash, licenseIdShort, timestamp, random] = parts;

		// Check license ID (handle both old and new formats)
		const licenseIdStr = license._id.toString();
		const expectedLicenseId = licenseIdStr.length >= 8 ? licenseIdStr.substring(0, 8) : licenseIdStr;
		if (licenseIdShort !== expectedLicenseId) {
			return false;
		}

		// Check timestamp (should be within reasonable range)
		const hexTimestamp = parseInt(timestamp, 36);
		const now = Date.now();
		const timeDiff = Math.abs(now - hexTimestamp);

		// Allow 24 hours of clock skew
		if (timeDiff > 24 * 60 * 60 * 1000) {
			return false;
		}

		// Verify hash (handle both old 32-char and new 64-char formats)
		const data = {
			licenseId: license._id.toString(),
			schoolId: license.schoolId,
			issuedAt: license.issuedAt.getTime(),
			expiresAt: license.expiresAt.getTime(),
			features: license.features.map(f => f.name),
			timestamp: hexTimestamp
		};

		const jsonData = JSON.stringify(data);
		const secret = process.env.LICENSE_SECRET || 'default-secret-key';
		const expectedHash = crypto.createHash('sha256').update(jsonData + secret).digest('hex');

		// Handle both old (32-char) and new (64-char) hash formats
		if (hash.length === 32) {
			// Old format: compare first 32 characters
			return hash === expectedHash.substring(0, 32);
		} else if (hash.length === 64) {
			// New format: compare full hash
			return hash === expectedHash;
		}

		return false;
	} catch (error) {
		return false;
	}
}

/**
 * Extract license ID from hex
 * @param hex The license hex
 * @returns License ID or null if invalid
 */
export function extractLicenseIdFromHex(hex: string): string | null {
	try {
		const parts = hex.split('-');
		if (parts.length !== 4) {
			return null;
		}

		const [, licenseIdShort] = parts;
		return licenseIdShort;
	} catch (error) {
		return null;
	}
}

/**
 * Generate a secure license key
 * @returns Generated license key
 */
export function generateSecureLicenseKey(): string {
	// Generate a random license key with format: XXXX-XXXX-XXXX
	const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
	let result = '';

	for (let i = 0; i < 12; i++) {
		if (i > 0 && i % 4 === 0) {
			result += '-';
		}
		result += chars.charAt(Math.floor(Math.random() * chars.length));
	}

	return result;
} 