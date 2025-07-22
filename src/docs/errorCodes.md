# License Management System Error Codes

This document provides detailed information about error codes and responses used in the License Management System API.

## Error Response Format

All API errors follow a consistent format:

```json
{
  "status": "error",
  "code": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

## License Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `LICENSE_NOT_FOUND` | 404 | The requested license could not be found |
| `LICENSE_EXPIRED` | 403 | The license has expired |
| `LICENSE_REVOKED` | 403 | The license has been revoked |
| `LICENSE_INVALID` | 401 | The license is invalid or tampered with |
| `LICENSE_SCHOOL_MISMATCH` | 403 | The license does not match the provided school ID |
| `LICENSE_FEATURE_DISABLED` | 403 | The requested feature is not enabled in this license |
| `LICENSE_BLACKLISTED` | 403 | The license has been blacklisted |

## Security Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `HARDWARE_BINDING_FAILED` | 400 | Failed to bind license to hardware |
| `HARDWARE_BINDING_LIMIT` | 403 | Maximum number of hardware bindings reached |
| `IP_RESTRICTION_VIOLATION` | 403 | Access from unauthorized IP address |
| `DEVICE_LIMIT_EXCEEDED` | 403 | Maximum number of devices reached |

## Authentication Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Authentication required |
| `INVALID_TOKEN` | 401 | Invalid or expired authentication token |
| `INSUFFICIENT_PERMISSIONS` | 403 | User does not have required permissions |

## Validation Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `INVALID_LICENSE_DATA` | 400 | Invalid license data provided |
| `MISSING_REQUIRED_FIELD` | 400 | Required field is missing |

## Rate Limiting Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests, please try again later |
| `VALIDATION_LIMIT_EXCEEDED` | 429 | Too many validation attempts |

## Server Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `INTERNAL_SERVER_ERROR` | 500 | An unexpected error occurred |
| `DATABASE_ERROR` | 500 | Database operation failed |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

## HTTP Status Codes

| Status Code | Description |
|-------------|-------------|
| 200 | OK - The request was successful |
| 201 | Created - A new resource was successfully created |
| 400 | Bad Request - The request was invalid or cannot be served |
| 401 | Unauthorized - Authentication is required and has failed or not been provided |
| 403 | Forbidden - The request was valid, but the server is refusing action |
| 404 | Not Found - The requested resource could not be found |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error - An unexpected condition was encountered |
| 503 | Service Unavailable - The server is currently unavailable |