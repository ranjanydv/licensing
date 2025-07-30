/**
 * License status enum
 */
export enum LicenseStatus {
	ACTIVE = 'active',
	EXPIRED = 'expired',
	REVOKED = 'revoked',
	PENDING = 'pending'
}

/**
 * License activation status enum
 */
export enum ActivationStatus {
	PENDING = 'pending',
	ACTIVATED = 'activated',
	EXPIRED = 'expired'
}

/**
 * Feature interface for license features
 */
export interface Feature {
	name: string;
	enabled: boolean;
	restrictions?: Record<string, any>;
}

/**
 * License activation request interface
 */
export interface ActivationRequest {
	licenseKey: string;
	schoolId: string;
}

/**
 * License activation response interface
 */
export interface ActivationResponse {
	licenseHex: string;
	expiresAt: Date;
	features: string[];
	message: string;
}

/**
 * License hex validation request interface
 */
export interface HexValidationRequest {
	licenseHex: string;
	schoolId: string;
}

/**
 * License hex validation response interface
 */
export interface HexValidationResponse {
	valid: boolean;
	expiresIn?: number; // days until expiration
	features?: string[];
	message: string;
}

/**
 * License interface representing a license document
 */
export interface License {
	_id: string;
	schoolId: string;
	schoolName: string;
	licenseKey: string; // Short, random, public-facing license key
	licenseHex?: string; // Generated hex for ERP storage
	features: Feature[];
	issuedAt: Date;
	expiresAt: Date;
	activatedAt?: Date; // Activation timestamp
	lastVerificationAt?: Date; // Last hex validation timestamp
	activationStatus: ActivationStatus; // New field
	activationAttempts: number; // Track failed attempts
	status: LicenseStatus;
	metadata: Record<string, any>;
	createdBy: string;
	updatedBy: string;
	createdAt: Date;
	updatedAt: Date;
}

/**
 * License request interface for creating a new license
 */
export interface LicenseRequest {
	schoolId: string;
	schoolName: string;
	duration: number; // in days
	features: Feature[];
	metadata?: Record<string, any>;
	createdBy?: string;
}

/**
 * License validation result interface (for backward compatibility)
 */
export interface ValidationResult {
	valid: boolean;
	license?: License;
	errors?: string[];
	expiresIn?: number; // in days
}

/**
 * License check report interface (for backward compatibility)
 */
export interface LicenseCheckReport {
	totalChecked: number;
	active: number;
	expired: number;
	revoked: number;
	failed: number;
	details: Array<{
		licenseId: string;
		schoolName: string;
		status: LicenseStatus;
		message?: string;
	}>;
}

/**
 * JWT payload interface (kept for backward compatibility)
 */
export interface JWTPayload {
	sub: string; // Subject (schoolId)
	iss: string; // Issuer (your system)
	iat: number; // Issued at (timestamp)
	exp: number; // Expiration (timestamp)
	schoolName: string;
	features: string[]; // Feature names only
	licenseId: string;
	metadata: Record<string, any>;
}