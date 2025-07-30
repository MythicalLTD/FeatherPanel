# Error Handling

This document provides a comprehensive reference for all error responses, status codes, and troubleshooting information for the Wings API.

## 📊 HTTP Status Codes

### Success Codes
- **200 OK**: Request completed successfully
- **202 Accepted**: Request accepted for processing (asynchronous operations)

### Client Error Codes
- **400 Bad Request**: Invalid request format or parameters
- **401 Unauthorized**: Authentication required or failed
- **403 Forbidden**: Authentication successful but insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource conflict (e.g., server already transferring)
- **422 Unprocessable Entity**: Request validation failed
- **429 Too Many Requests**: Rate limit exceeded

### Server Error Codes
- **500 Internal Server Error**: Unexpected server error
- **502 Bad Gateway**: Upstream service unavailable
- **503 Service Unavailable**: Service temporarily unavailable

## 🚨 Error Response Format

All error responses follow this standard format:

```json
{
  "error": "Human-readable error message",
  "request_id": "uuid-here"
}
```

### Headers
```
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
Content-Type: application/json
```

## 🔐 Authentication Errors

### 401 Unauthorized

#### Missing Authorization Header
```json
{
  "error": "The required authorization heads were not present in the request."
}
```

#### Invalid Token Format
```json
{
  "error": "The required authorization heads were not present in the request."
}
```

#### Expired JWT Token
```json
{
  "error": "The provided token is invalid or has expired."
}
```

#### Invalid JWT Signature
```json
{
  "error": "The provided token is invalid or has expired."
}
```

### 403 Forbidden

#### Invalid Bearer Token
```json
{
  "error": "You are not authorized to access this endpoint."
}
```

#### Token Denied/Revoked
```json
{
  "error": "The provided token has been revoked."
}
```

#### Insufficient Permissions
```json
{
  "error": "You do not have permission to perform this action."
}
```

## 📁 File System Errors

### 400 Bad Request

#### File is Directory
```json
{
  "error": "Cannot perform that action: file is a directory.",
  "request_id": "uuid-here"
}
```

#### Invalid File Type
```json
{
  "error": "Cannot open files of this type."
}
```

#### File Too Large
```json
{
  "error": "The file size exceeds the maximum allowed limit."
}
```

#### Invalid File Path
```json
{
  "error": "The provided file path is invalid."
}
```

### 404 Not Found

#### File Not Found
```json
{
  "error": "The requested resources was not found on the system.",
  "request_id": "uuid-here"
}
```

#### Directory Not Found
```json
{
  "error": "The requested directory was not found on the system.",
  "request_id": "uuid-here"
}
```

#### Backup Not Found
```json
{
  "error": "The requested backup was not found on this server."
}
```

### 422 Unprocessable Entity

#### File Operation Failed
```json
{
  "error": "Failed to perform the requested file operation."
}
```

#### Compression Failed
```json
{
  "error": "Failed to compress the specified files."
}
```

#### Decompression Failed
```json
{
  "error": "Failed to decompress the specified archive."
}
```

## 🖥️ Server Management Errors

### 400 Bad Request

#### Invalid Power Action
```json
{
  "error": "The provided power action is not valid."
}
```

#### Invalid Server State
```json
{
  "error": "The server is in an invalid state for this operation."
}
```

### 404 Not Found

#### Server Not Found
```json
{
  "error": "The requested resource does not exist on this instance."
}
```

#### Server Not Running
```json
{
  "error": "The server is not currently running."
}
```

### 409 Conflict

#### Server Already Transferring
```json
{
  "error": "A transfer is already in progress for this server."
}
```

#### Server Not Transferring
```json
{
  "error": "Server is not currently being transferred."
}
```

#### Server Already Running
```json
{
  "error": "The server is already running."
}
```

#### Server Already Stopped
```json
{
  "error": "The server is already stopped."
}
```

### 422 Unprocessable Entity

#### Invalid Server Configuration
```json
{
  "error": "The data provided in the request could not be validated."
}
```

#### Installation Failed
```json
{
  "error": "Failed to install the server with the provided configuration."
}
```

## 🔄 Transfer Errors

### 400 Bad Request

#### Invalid Transfer URL
```json
{
  "error": "The provided transfer URL is invalid."
}
```

#### Missing Transfer Token
```json
{
  "error": "A valid transfer token is required."
}
```

#### Invalid Content Type
```json
{
  "error": "Invalid content type \"application/json\", expected \"multipart/form-data\""
}
```

### 409 Conflict

#### Transfer Already in Progress
```json
{
  "error": "A transfer is already in progress for this server."
}
```

#### No Active Transfer
```json
{
  "error": "Server is not currently being transferred."
}
```

### 422 Unprocessable Entity

#### Transfer Validation Failed
```json
{
  "error": "The transfer data could not be validated."
}
```

#### Checksum Mismatch
```json
{
  "error": "checksums don't match"
}
```

#### Missing Archive or Checksum
```json
{
  "error": "missing archive or checksum"
}
```

## 💾 Backup Errors

### 400 Bad Request

#### Invalid Backup Adapter
```json
{
  "error": "The provided backup adapter is not valid."
}
```

#### Missing Backup UUID
```json
{
  "error": "A valid backup UUID is required."
}
```

### 404 Not Found

#### Backup Not Found
```json
{
  "error": "The requested backup was not found on this server."
}
```

### 422 Unprocessable Entity

#### Backup Creation Failed
```json
{
  "error": "Failed to create the backup."
}
```

#### Backup Restoration Failed
```json
{
  "error": "Failed to restore the backup."
}
```

## 🔍 Search Errors

### 400 Bad Request

#### Pattern Too Short
```json
{
  "error": "Pattern must be at least 3 characters long"
}
```

#### Invalid Search Pattern
```json
{
  "error": "The provided search pattern is invalid."
}
```

## 🌐 WebSocket Errors

### 400 Bad Request

#### Invalid WebSocket Token
```json
{
  "error": "The provided WebSocket token is invalid."
}
```

#### Missing Authentication
```json
{
  "error": "Authentication is required for WebSocket connections."
}
```

### 403 Forbidden

#### Insufficient WebSocket Permissions
```json
{
  "error": "You do not have permission to access this WebSocket."
}
```

## ⚙️ System Errors

### 400 Bad Request

#### Invalid Configuration
```json
{
  "error": "The provided configuration is invalid."
}
```

#### Docker Not Available
```json
{
  "error": "Docker is not available on this system."
}
```

### 500 Internal Server Error

#### System Information Error
```json
{
  "error": "Failed to retrieve system information.",
  "request_id": "uuid-here"
}
```

#### Docker Operation Failed
```json
{
  "error": "Failed to perform Docker operation.",
  "request_id": "uuid-here"
}
```

#### File System Error
```json
{
  "error": "An error occurred while processing this request.",
  "request_id": "uuid-here"
}
```

## 📊 Rate Limiting Errors

### 429 Too Many Requests

#### Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retry_after": 60
}
```

#### Too Many Concurrent Requests
```json
{
  "error": "Too many concurrent requests. Please try again later."
}
```

## 🔧 Configuration Errors

### 400 Bad Request

#### Invalid SSL Configuration
```json
{
  "error": "The SSL configuration is invalid."
}
```

#### Invalid Trusted Proxies
```json
{
  "error": "The trusted proxies configuration is invalid."
}
```

### 500 Internal Server Error

#### Configuration Write Failed
```json
{
  "error": "Failed to write configuration to disk.",
  "request_id": "uuid-here"
}
```

## 📝 Validation Errors

### 422 Unprocessable Entity

#### Invalid JSON
```json
{
  "error": "The data passed in the request was not in a parsable format. Please try again."
}
```

#### Missing Required Fields
```json
{
  "error": "The data provided in the request could not be validated."
}
```

#### Invalid Field Values
```json
{
  "error": "One or more fields contain invalid values."
}
```

## 🚨 Common Error Scenarios

### File Operations

#### File Permission Denied
```json
{
  "error": "Permission denied: cannot access the specified file."
}
```

#### Disk Space Full
```json
{
  "error": "Insufficient disk space to complete the operation."
}
```

#### File Locked
```json
{
  "error": "The file is currently locked by another process."
}
```

### Server Operations

#### Server Busy
```json
{
  "error": "The server is currently busy and cannot process the request."
}
```

#### Installation in Progress
```json
{
  "error": "Server installation is already in progress."
}
```

#### Backup in Progress
```json
{
  "error": "A backup is currently in progress for this server."
}
```

### Network Errors

#### Connection Timeout
```json
{
  "error": "The request timed out while waiting for a response."
}
```

#### Network Unavailable
```json
{
  "error": "Network is currently unavailable."
}
```

## 🔍 Debugging Information

### Request ID
Every error response includes a request ID for debugging:
```
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
```

### Error Logging
Errors are logged with additional context:
```json
{
  "level": "error",
  "message": "API request failed",
  "request_id": "uuid-here",
  "error": "detailed error message",
  "stack_trace": "error stack trace"
}
```

### Debug Headers
Additional debug headers may be included:
```
X-Error-Code: VALIDATION_FAILED
X-Error-Details: field_name:invalid_value
```

## 🛠️ Troubleshooting

### Common Solutions

#### 401 Unauthorized
1. Check if Authorization header is present
2. Verify token format: `Bearer TOKEN`
3. Ensure token is valid and not expired
4. Check token permissions

#### 404 Not Found
1. Verify resource exists
2. Check server UUID is correct
3. Ensure file path is valid
4. Verify backup UUID is correct

#### 409 Conflict
1. Check server state before operation
2. Wait for current operation to complete
3. Cancel conflicting operations first

#### 422 Unprocessable Entity
1. Validate request payload
2. Check required fields are present
3. Verify field formats and values
4. Review API documentation

#### 500 Internal Server Error
1. Check Wings logs for details
2. Verify system resources
3. Check Docker availability
4. Review configuration

### Log Analysis

#### Check Wings Logs
```bash
# View recent errors
tail -f /var/log/wings/daemon.log | grep -i error

# Search for specific request ID
grep "request-id" /var/log/wings/daemon.log

# Check authentication errors
grep -i "auth\|token" /var/log/wings/daemon.log
```

#### Check System Resources
```bash
# Check disk space
df -h

# Check memory usage
free -h

# Check Docker status
docker info
```

## 📞 Support

When reporting errors, include:
1. **Request ID** from the error response
2. **Full error message** and status code
3. **Request details** (endpoint, payload, headers)
4. **Wings logs** around the time of the error
5. **System information** (OS, Wings version, Docker version)

---

**Next**: [System Endpoints](system-endpoints.md) - System information and management endpoints 