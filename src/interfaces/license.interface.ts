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
 * Feature interface for license features
 */
export interface Feature {
	name: string;
	enabled: boolean;
	restrictions?: Record<string, any>;
}

/**
 * Security restrictions interface for license
 */
export interface SecurityRestrictions {
	hardwareBinding?: {
		enabled: boolean;
		fingerprints: string[]; // List of allowed hardware fingerprints
	};
	ipRestrictions?: {
		enabled: boolean;
		allowedIps: string[]; // List of allowed IP addresses or CIDR ranges
		allowedCountries?: string[]; // List of allowed country codes
	};
	deviceLimit?: {
		enabled: boolean;
		maxDevices: number; // Maximum number of devices that can use this license
	};
}

/**
 * License interface representing a license document
 */
export interface License {
	_id: string;
	schoolId: string;
	schoolName: string;
	licenseKey: string; // JWT token
	licenseHash: string; // Additional hash for verification
	features: Feature[];
	issuedAt: Date;
	expiresAt: Date;
	lastChecked: Date;
	status: LicenseStatus;
	metadata: Record<string, any>;
	securityRestrictions?: SecurityRestrictions; // Security restrictions
	fingerprint?: string; // License fingerprint for tamper detection
	blacklisted?: boolean; // Whether the license is blacklisted
	blacklistReason?: string; // Reason for blacklisting
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
	securityRestrictions?: SecurityRestrictions; // Security restrictions
	createdBy?: string;
}

/**
 * License validation result interface
 */
export interface ValidationResult {
	valid: boolean;
	license?: License;
	errors?: string[];
	expiresIn?: number; // in days
}

/**
 * License check report interface
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
 * JWT payload interface
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
	securityInfo?: {
		hardwareBindingEnabled?: boolean;
		ipRestrictionsEnabled?: boolean;
		deviceLimitEnabled?: boolean;
		fingerprint?: string; // License fingerprint
	};
}