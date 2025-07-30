# School Licensing System API Documentation

## Overview
This document provides API documentation for school ERP systems to integrate with the licensing system.

## Base URL
```
https://license.padhaa.com/api
```

## Authentication
All endpoints are public and do not require authentication.

## Rate Limiting
- **Activation**: 10 requests per minute per IP
- **Hex Validation**: 60 requests per minute per IP

## Endpoints

### 1. Activate License

**Endpoint**: `POST /licenses/activate`

**Purpose**: Activate a license key and receive a license hex for storage.

**Request Body**:
```json
{
  "licenseKey": "ABC123-XYZ789",
  "schoolId": "school_12345"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "licenseHex": "a1b2c3d4e5f6...",
    "expiresAt": "2024-12-31T23:59:59Z",
    "features": ["attendance", "gradebook"],
    "message": "License activated successfully"
  }
}
```

**Error Responses**:
```json
{
  "status": "error",
  "message": "Invalid license key",
  "code": "INVALID_LICENSE_KEY"
}
```

**Possible Error Codes**:
- `INVALID_LICENSE_KEY`: License key not found
- `LICENSE_ALREADY_ACTIVATED`: License already activated
- `LICENSE_EXPIRED`: License has expired
- `SCHOOL_ID_MISMATCH`: School ID does not match license
- `RATE_LIMIT_EXCEEDED`: Too many activation attempts

### 2. Validate License Hex

**Endpoint**: `POST /licenses/validate-hex`

**Purpose**: Validate stored license hex (called daily by ERP systems).

**Request Body**:
```json
{
  "licenseHex": "a1b2c3d4e5f6...",
  "schoolId": "school_12345"
}
```

**Response**:
```json
{
  "status": "success",
  "data": {
    "valid": true,
    "expiresIn": 30,
    "features": ["attendance", "gradebook"],
    "message": "License is valid"
  }
}
```

**Error Response**:
```json
{
  "status": "success",
  "data": {
    "valid": false,
    "message": "License has expired"
  }
}
```

**Possible Messages**:
- `"License is valid"`: License is active and valid
- `"Invalid license hex"`: Hex not found in system
- `"License not activated"`: License exists but not activated
- `"School ID does not match"`: School ID mismatch
- `"License has expired"`: License has expired
- `"Invalid license hex format"`: Hex format is invalid

## Implementation Guide

### Step 1: License Activation
1. School administrator enters license key in ERP system
2. ERP system calls `/licenses/activate` with license key and school ID
3. Store the returned `licenseHex` in ERP database
4. Display activation success message

### Step 2: Daily Validation
1. Set up cron job to run at 12 AM daily
2. Retrieve stored `licenseHex` from ERP database
3. Call `/licenses/validate-hex` with hex and school ID
4. Based on response:
   - If `valid: true`: Continue normal operation
   - If `valid: false`: Log out users and disable services

### Example Implementation (Node.js)

```javascript
const axios = require('axios');

class LicenseManager {
  constructor(baseUrl, schoolId) {
    this.baseUrl = baseUrl;
    this.schoolId = schoolId;
  }

  async activateLicense(licenseKey) {
    try {
      const response = await axios.post(`${this.baseUrl}/licenses/activate`, {
        licenseKey,
        schoolId: this.schoolId
      });
      
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Activation failed');
    }
  }

  async validateLicense(licenseHex) {
    try {
      const response = await axios.post(`${this.baseUrl}/licenses/validate-hex`, {
        licenseHex,
        schoolId: this.schoolId
      });
      
      return response.data.data;
    } catch (error) {
      throw new Error(error.response?.data?.message || 'Validation failed');
    }
  }

  async performDailyValidation() {
    // Get stored hex from database
    const licenseHex = await this.getStoredLicenseHex();
    
    if (!licenseHex) {
      console.log('No license hex found, disabling services');
      await this.disableServices();
      return;
    }

    try {
      const result = await this.validateLicense(licenseHex);
      
      if (result.valid) {
        console.log('License is valid, continuing normal operation');
        await this.enableServices();
      } else {
        console.log('License is invalid:', result.message);
        await this.disableServices();
      }
    } catch (error) {
      console.error('Validation failed:', error.message);
      await this.disableServices();
    }
  }

  async disableServices() {
    // Implement service disable logic
    // - Log out all users
    // - Disable feature access
    // - Show license expired message
  }

  async enableServices() {
    // Implement service enable logic
    // - Enable feature access
    // - Clear any expired warnings
  }

  async getStoredLicenseHex() {
    // Implement database retrieval
    // Return stored license hex from ERP database
  }
}

// Usage example
const licenseManager = new LicenseManager('https://license.padhaa.com/api', 'school_12345');

// Daily validation cron job
setInterval(() => {
  const now = new Date();
  if (now.getHours() === 0 && now.getMinutes() === 0) {
    licenseManager.performDailyValidation();
  }
}, 60000); // Check every minute
```

## Error Handling

### Network Errors
- Implement retry logic with exponential backoff
- Log errors for debugging
- Graceful degradation when licensing server is unavailable

### Rate Limiting
- Respect rate limits to avoid being blocked
- Implement backoff when receiving 429 responses
- Consider caching validation results for short periods

### Security Considerations
- Store license hex securely in database
- Use HTTPS for all API calls
- Validate all responses before processing
- Log all licensing activities for audit

## Testing

### Test License Keys
Use these test keys for development:
- `TEST123-ABC456` (valid)
- `EXPIRED-XYZ789` (expired)
- `INVALID-123456` (invalid)

### Test Scenarios
1. **Successful Activation**: Use valid license key
2. **Already Activated**: Try activating same key twice
3. **Expired License**: Use expired license key
4. **Invalid Key**: Use non-existent key
5. **School ID Mismatch**: Use wrong school ID
6. **Rate Limiting**: Make too many requests quickly

## Support

For technical support or questions about the API:
- Email: support@padhaa.com
- Documentation: https://docs.padhaa.com
- Status Page: https://status.padhaa.com 