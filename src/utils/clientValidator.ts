declare const window: any;

/**
 * Client-side license validator
 * This utility can be distributed to client applications for local license validation
 * It performs basic validation without requiring a server ping
 */

/**
 * JWT payload interface
 */
interface JWTPayload {
  sub: string; // Subject (schoolId)
  iss: string; // Issuer
  iat: number; // Issued at (timestamp)
  exp: number; // Expiration (timestamp)
  schoolName: string;
  features: string[]; // Feature names
  licenseId: string;
  metadata: Record<string, any>;
}

/**
 * Validation result interface
 */
interface ValidationResult {
  valid: boolean;
  errors?: string[];
  expiresIn?: number; // in days
  features?: string[];
}

/**
 * Decode a base64 string
 * @param str Base64 string
 * @returns Decoded string
 */
function base64Decode(str: string): string {
  // Replace non-url compatible chars with base64 standard chars
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  
  // Add padding if needed
  while (str.length % 4) {
    str += '=';
  }
  
  try {
    // In browser
    if (typeof window !== 'undefined') {
      return decodeURIComponent(
        Array.prototype.map
          .call(
            window.atob(str),
            (c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          )
          .join('')
      );
    }
    // In Node.js
    else {
      return Buffer.from(str, 'base64').toString('utf-8');
    }
  } catch (error) {
    return '';
  }
}

/**
 * Parse a JWT token
 * @param token JWT token
 * @returns Parsed payload or null if invalid
 */
function parseJwt(token: string): JWTPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    const payload = base64Decode(parts[1]);
    return JSON.parse(payload);
  } catch (error) {
    return null;
  }
}

/**
 * Validate a license locally
 * This performs basic validation without requiring a server ping
 * For full validation including revocation status, use the server API
 * 
 * @param licenseKey License key (JWT token)
 * @param schoolId School ID
 * @returns Validation result
 */
export function validateLicenseLocally(licenseKey: string, schoolId: string): ValidationResult {
  try {
    // Parse JWT token
    const payload = parseJwt(licenseKey);
    if (!payload) {
      return {
        valid: false,
        errors: ['Invalid license format']
      };
    }
    
    // Verify school ID matches
    if (payload.sub !== schoolId) {
      return {
        valid: false,
        errors: ['License does not match school ID']
      };
    }
    
    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return {
        valid: false,
        errors: ['License has expired']
      };
    }
    
    // Calculate days until expiration
    const daysUntilExpiration = Math.ceil((payload.exp - now) / (60 * 60 * 24));
    
    return {
      valid: true,
      expiresIn: daysUntilExpiration,
      features: payload.features
    };
  } catch (error) {
    return {
      valid: false,
      errors: [(error as Error).message]
    };
  }
}

/**
 * Check if a feature is enabled in the license
 * @param licenseKey License key (JWT token)
 * @param featureName Feature name to check
 * @returns Boolean indicating if feature is enabled
 */
export function isFeatureEnabled(licenseKey: string, featureName: string): boolean {
  try {
    const payload = parseJwt(licenseKey);
    if (!payload) {
      return false;
    }
    
    return payload.features.includes(featureName);
  } catch (error) {
    return false;
  }
}

/**
 * Get license metadata
 * @param licenseKey License key (JWT token)
 * @returns License metadata or null if invalid
 */
export function getLicenseMetadata(licenseKey: string): Record<string, any> | null {
  try {
    const payload = parseJwt(licenseKey);
    if (!payload) {
      return null;
    }
    
    return payload.metadata;
  } catch (error) {
    return null;
  }
}