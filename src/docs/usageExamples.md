# License Management System API Usage Examples

This document provides practical examples of how to use the License Management System API.

## Authentication

Most endpoints require authentication using a JWT token.

```javascript
// Example of setting the Authorization header
const headers = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer YOUR_JWT_TOKEN'
};
```

## License Management

### Generate a New License

```javascript
// Request
fetch('https://api.example.com/api/licenses', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    schoolId: '12345',
    schoolName: 'Example School',
    duration: 365, // days
    features: [
      { name: 'attendance', enabled: true },
      { name: 'gradebook', enabled: true },
      { name: 'reports', enabled: true, restrictions: { maxReports: 100 } }
    ],
    metadata: {
      contactEmail: 'admin@example.com',
      contactPhone: '123-456-7890'
    }
  })
});

// Response
{
  "status": "success",
  "data": {
    "license": {
      "_id": "60d21b4667d0d8992e610c85",
      "schoolId": "12345",
      "schoolName": "Example School",
      "licenseKey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "features": [
        { "name": "attendance", "enabled": true },
        { "name": "gradebook", "enabled": true },
        { "name": "reports", "enabled": true, "restrictions": { "maxReports": 100 } }
      ],
      "issuedAt": "2025-07-21T10:00:00.000Z",
      "expiresAt": "2026-07-21T10:00:00.000Z",
      "status": "active",
      // other fields...
    }
  }
}
```

### Validate a License

```javascript
// Request
fetch('https://api.example.com/api/licenses/validate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    licenseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
    schoolId: '12345'
  })
});

// Response (valid license)
{
  "status": "success",
  "data": {
    "valid": true,
    "expiresIn": 365,
    "features": ["attendance", "gradebook", "reports"]
  }
}

// Response (invalid license)
{
  "status": "error",
  "data": {
    "valid": false,
    "errors": ["License has expired"]
  }
}
```

### Get All Licenses

```javascript
// Request
fetch('https://api.example.com/api/licenses?status=active', {
  method: 'GET',
  headers: headers
});

// Response
{
  "status": "success",
  "results": 2,
  "data": {
    "licenses": [
      {
        "_id": "60d21b4667d0d8992e610c85",
        "schoolId": "12345",
        "schoolName": "Example School",
        // other fields...
      },
      {
        "_id": "60d21b4667d0d8992e610c86",
        "schoolId": "67890",
        "schoolName": "Another School",
        // other fields...
      }
    ]
  }
}
```

### Update a License

```javascript
// Request
fetch('https://api.example.com/api/licenses/60d21b4667d0d8992e610c85', {
  method: 'PUT',
  headers: headers,
  body: JSON.stringify({
    duration: 730, // extend to 2 years
    features: [
      { name: 'attendance', enabled: true },
      { name: 'gradebook', enabled: true },
      { name: 'reports', enabled: true },
      { name: 'advanced_analytics', enabled: true } // add new feature
    ]
  })
});

// Response
{
  "status": "success",
  "data": {
    "license": {
      "_id": "60d21b4667d0d8992e610c85",
      "expiresAt": "2027-07-21T10:00:00.000Z", // updated expiration
      "features": [
        // updated features list
      ],
      // other fields...
    }
  }
}
```

### Revoke a License

```javascript
// Request
fetch('https://api.example.com/api/licenses/60d21b4667d0d8992e610c85', {
  method: 'DELETE',
  headers: headers
});

// Response
{
  "status": "success",
  "message": "License revoked successfully"
}
```

## Feature Management

### Check if a License Has a Feature

```javascript
// Request
fetch('https://api.example.com/api/features/60d21b4667d0d8992e610c85/reports', {
  method: 'GET',
  headers: headers
});

// Response
{
  "status": "success",
  "data": {
    "hasFeature": true,
    "feature": {
      "name": "reports",
      "enabled": true,
      "restrictions": {
        "maxReports": 100
      }
    }
  }
}
```

### Validate a Feature Against Restrictions

```javascript
// Request
fetch('https://api.example.com/api/features/60d21b4667d0d8992e610c85/reports/validate', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    currentReportCount: 50
  })
});

// Response
{
  "status": "success",
  "data": {
    "valid": true,
    "message": "Feature is valid for use"
  }
}
```

## Security Features

### Register Hardware Fingerprint

```javascript
// Request
fetch('https://api.example.com/api/licenses/60d21b4667d0d8992e610c85/hardware-binding', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    fingerprint: 'a1b2c3d4e5f6g7h8i9j0',
    deviceName: 'Main Server',
    deviceType: 'server'
  })
});

// Response
{
  "status": "success",
  "data": {
    "message": "Hardware fingerprint registered successfully"
  }
}
```

### Update IP Restrictions

```javascript
// Request
fetch('https://api.example.com/api/licenses/60d21b4667d0d8992e610c85/ip-restrictions', {
  method: 'PUT',
  headers: headers,
  body: JSON.stringify({
    allowedIps: ['192.168.1.0/24', '10.0.0.5'],
    restrictionEnabled: true
  })
});

// Response
{
  "status": "success",
  "data": {
    "message": "IP restrictions updated successfully"
  }
}
```

## Analytics

### Track Feature Usage

```javascript
// Request
fetch('https://api.example.com/api/analytics/feature-usage', {
  method: 'POST',
  headers: headers,
  body: JSON.stringify({
    licenseId: '60d21b4667d0d8992e610c85',
    featureName: 'reports',
    usageData: {
      reportType: 'attendance',
      generatedBy: 'user123'
    }
  })
});

// Response
{
  "status": "success",
  "data": {
    "message": "Feature usage tracked successfully"
  }
}
```

### Get Usage Report

```javascript
// Request
fetch('https://api.example.com/api/analytics/reports/60d21b4667d0d8992e610c85?startDate=2025-01-01&endDate=2025-07-21', {
  method: 'GET',
  headers: headers
});

// Response
{
  "status": "success",
  "data": {
    "report": {
      "totalUsage": 1250,
      "featureBreakdown": {
        "attendance": 450,
        "gradebook": 350,
        "reports": 450
      },
      "dailyUsage": [
        // daily usage data
      ]
    }
  }
}
```

## Error Handling

```javascript
// Example error response
{
  "status": "error",
  "code": "LICENSE_EXPIRED",
  "message": "The license has expired"
}
```

For a complete list of error codes and their meanings, refer to the [Error Codes Documentation](./errorCodes.md).