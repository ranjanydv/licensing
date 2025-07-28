# Hashed License Validation System

This document describes the new hashed license validation system designed for School ERP systems that want to store license keys as hashes instead of plain text for enhanced security.

## Overview

The hashed license validation system allows School ERP systems to:
1. Store license keys as secure hashes in their database
2. Validate licenses without exposing plain license keys
3. Generate hashes for license keys before storing them
4. Retrieve license information securely

## Security Benefits

- **No Plain Text Storage**: License keys are never stored in plain text in School ERP databases
- **HMAC-SHA256 Hashing**: Uses cryptographically secure HMAC-SHA256 for hash generation
- **Timing-Safe Comparison**: Prevents timing attacks during hash comparison
- **Rate Limiting**: Built-in rate limiting to prevent abuse
- **Audit Logging**: All validation attempts are logged for security monitoring

## API Endpoints

### 1. Validate License with Hash

**Endpoint**: `POST /api/hashed-licenses/validate`

**Description**: Validates a license using a hashed license key instead of plain text.

**Request Body**:
```json
{
  "hashedLicenseKey": "a1b2c3d4e5f6...",
  "schoolId": "school123",
  "checkRevocation": true
}
```

**Response (Success)**:
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "license": {
      "schoolId": "school123",
      "schoolName": "Example School",
      "status": "ACTIVE",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "expiresIn": 45,
      "features": ["student_management", "attendance_tracking"],
      "issuedAt": "2024-01-01T00:00:00.000Z",
      "metadata": {}
    }
  }
}
```

**Response (Error)**:
```json
{
  "status": "error",
  "data": {
    "valid": false,
    "errors": ["Invalid license key hash"]
  }
}
```

### 2. Generate License Key Hash

**Endpoint**: `POST /api/hashed-licenses/generate-hash`

**Description**: Generates a hash for a license key that can be stored in School ERP database.

**Request Body**:
```json
{
  "licenseKey": "ABC123-DEF456-GHI789"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "hashedLicenseKey": "a1b2c3d4e5f6...",
    "message": "Use this hash to store in your School ERP database"
  }
}
```

### 3. Get License by School ID

**Endpoint**: `GET /api/hashed-licenses/school/:schoolId`

**Description**: Retrieves license information for a school without requiring the license key.

**Response**:
```json
{
  "status": "success",
  "data": {
    "license": {
      "schoolId": "school123",
      "schoolName": "Example School",
      "status": "ACTIVE",
      "expiresAt": "2024-12-31T23:59:59.000Z",
      "issuedAt": "2024-01-01T00:00:00.000Z",
      "features": ["student_management", "attendance_tracking"],
      "metadata": {},
      "lastChecked": "2024-01-15T10:30:00.000Z"
    }
  }
}
```

## Implementation Guide for School ERP Systems

### Step 1: Generate Hash for License Key

When you receive a license key from the licensing system:

1. Call the hash generation endpoint:
```bash
curl -X POST http://your-license-server/api/hashed-licenses/generate-hash \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"licenseKey": "ABC123-DEF456-GHI789"}'
```

2. Store the returned hash in your database:
```sql
INSERT INTO school_licenses (school_id, hashed_license_key, created_at) 
VALUES ('school123', 'a1b2c3d4e5f6...', NOW());
```

### Step 2: Validate License During Application Startup

In your School ERP application:

```javascript
async function validateLicense(schoolId, hashedLicenseKey) {
  try {
    const response = await fetch('http://your-license-server/api/hashed-licenses/validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        hashedLicenseKey: hashedLicenseKey,
        schoolId: schoolId,
        checkRevocation: true
      })
    });

    const result = await response.json();
    
    if (result.status === 'success' && result.data.valid) {
      // License is valid, proceed with application
      return result.data.license;
    } else {
      // License is invalid, show error or disable features
      throw new Error(result.data.errors.join(', '));
    }
  } catch (error) {
    console.error('License validation failed:', error);
    // Handle validation failure
  }
}
```

### Step 3: Periodic Validation

Implement periodic license validation:

```javascript
// Validate license every hour
setInterval(async () => {
  const license = await validateLicense(schoolId, hashedLicenseKey);
  if (!license) {
    // Handle invalid license
    showLicenseWarning();
  }
}, 60 * 60 * 1000);
```

## Environment Variables

The system uses the following environment variables:

- `LICENSE_KEY_HASH_SECRET`: Secret key for hashing license keys (recommended)
- `JWT_SECRET`: Fallback secret if `LICENSE_KEY_HASH_SECRET` is not set

## Rate Limiting

- **Validation Endpoint**: 100 requests per 15 minutes per IP
- **Hash Generation**: 50 requests per hour per IP

## Error Handling

Common error scenarios and their meanings:

- `Invalid license key hash`: The provided hash doesn't match any valid license
- `License not found for this school`: No active license exists for the school
- `License has expired`: The license has passed its expiration date
- `License is blacklisted`: The license has been revoked or blacklisted
- `License token has expired`: The JWT token has expired (internal error)

## Security Considerations

1. **Hash Secret**: Keep the `LICENSE_KEY_HASH_SECRET` secure and rotate it periodically
2. **HTTPS**: Always use HTTPS for API communication
3. **Rate Limiting**: Respect rate limits to avoid being blocked
4. **Error Handling**: Don't expose sensitive information in error messages
5. **Audit Logging**: Monitor validation attempts for suspicious activity

## Migration from Plain Text

If you're migrating from storing plain license keys:

1. Generate hashes for all existing license keys
2. Update your database schema to store hashes instead of plain keys
3. Update your application code to use the new validation endpoints
4. Test thoroughly before deploying to production
5. Keep the old validation method as a fallback during transition

## Example Database Schema

```sql
CREATE TABLE school_licenses (
  id SERIAL PRIMARY KEY,
  school_id VARCHAR(255) NOT NULL UNIQUE,
  hashed_license_key VARCHAR(255) NOT NULL,
  license_status VARCHAR(50) DEFAULT 'ACTIVE',
  last_validated TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_school_licenses_school_id ON school_licenses(school_id);
CREATE INDEX idx_school_licenses_status ON school_licenses(license_status);
```

## Support

For questions or issues with the hashed license validation system, please contact the licensing system administrator. 