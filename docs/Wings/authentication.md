# Authentication & Setup

This document covers all authentication methods used by the Wings API, including Bearer tokens, JWT tokens, and signed URLs.

## 🔐 Authentication Methods

### 1. Bearer Token Authentication

**Used for**: Most API endpoints  
**Header**: `Authorization: Bearer YOUR_AUTH_TOKEN`

This is the primary authentication method for protected endpoints. The token must match the authentication token configured in the Wings configuration file.

#### Example
```bash
curl -X GET "http://localhost:8080/api/system" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Configuration
The token is configured in the Wings configuration file:
```yaml
api:
  token: "your-authentication-token-here"
```

### 2. JWT Token Authentication

**Used for**: WebSocket connections, signed URLs  
**Format**: JWT tokens with specific payloads

JWT tokens are used for temporary authentication and signed URLs. Each token type has specific payload requirements.

#### Token Types

##### Backup Download Token
```json
{
  "server_uuid": "server-uuid",
  "backup_uuid": "backup-uuid", 
  "unique_id": "unique-request-id"
}
```

##### File Download Token
```json
{
  "file_path": "/path/to/file",
  "server_uuid": "server-uuid",
  "unique_id": "unique-request-id"
}
```

##### File Upload Token
```json
{
  "server_uuid": "server-uuid",
  "user_uuid": "user-uuid",
  "unique_id": "unique-request-id"
}
```

##### Transfer Token
```json
{
  "subject": "server-uuid"
}
```

##### WebSocket Token
```json
{
  "user_uuid": "user-uuid",
  "server_uuid": "server-uuid",
  "permissions": ["console", "files", "admin"]
}
```

### 3. Signed URL Authentication

**Used for**: File downloads, backups, uploads  
**Format**: URLs with JWT tokens as query parameters

Signed URLs allow secure access to resources without exposing authentication tokens.

#### Backup Download URL
```
GET /download/backup?token=JWT_TOKEN&server=server-uuid&backup=backup-uuid
```

#### File Download URL
```
GET /download/file?token=JWT_TOKEN&server=server-uuid&file=path/to/file
```

#### File Upload URL
```
POST /upload/file?token=JWT_TOKEN&server=server-uuid
```

## 🔑 Token Security

### One-Time Token Usage
Most JWT tokens are designed for single-use to prevent replay attacks:

- **Backup tokens**: One-time use, cached for 60 minutes
- **File tokens**: One-time use, cached for 60 minutes  
- **Upload tokens**: One-time use, cached for 60 minutes

### Token Expiration
All JWT tokens have expiration times:
- **Default**: 15 minutes from issuance
- **WebSocket tokens**: Configurable, typically 15-30 minutes
- **Transfer tokens**: Short-lived, typically 5-10 minutes

### Token Validation
Tokens are validated for:
- **Expiration time**: Must not be expired
- **Issuance time**: Must be issued after Wings boot time
- **JTI (JWT ID)**: Must not be in denylist
- **Signature**: Must be signed with correct secret

## 🚫 Token Denylist

Wings maintains a denylist of revoked JWT tokens:

### Denylist Features
- **Automatic cleanup**: Denied tokens are automatically removed
- **Bulk revocation**: Panel can revoke all tokens for a user/server
- **Boot-time validation**: Tokens issued before Wings boot are invalid

### Adding to Denylist
```bash
# Deny WebSocket tokens for a server
curl -X POST "http://localhost:8080/api/servers/server-uuid/ws/deny" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## 🔄 Token Store

Wings uses an in-memory token store to track one-time token usage:

### Features
- **60-minute cache**: Tokens are cached for 60 minutes
- **5-minute cleanup**: Expired tokens are cleaned up every 5 minutes
- **Thread-safe**: Concurrent access is handled safely

### Token Validation Flow
1. Token is parsed and validated
2. Unique ID is checked against token store
3. If not seen before, token is added to store
4. If already seen, request is rejected

## 🛡️ Security Considerations

### Best Practices
1. **Use HTTPS**: Always use HTTPS in production
2. **Rotate tokens**: Regularly rotate authentication tokens
3. **Monitor usage**: Log and monitor token usage
4. **Limit permissions**: Use minimal required permissions
5. **Validate inputs**: Always validate token payloads

### Security Headers
Wings automatically sets security headers:
```
X-Request-Id: request-uuid
User-Agent: Pelican Wings/v1.11.0 (id:token-id)
```

### IP Restrictions
- **Internal networks**: Blocked by default
- **Loopback addresses**: Blocked by default
- **Private ranges**: Blocked by default

## 🔧 Configuration

### Wings Configuration
```yaml
api:
  token: "your-secret-token"
  ssl:
    enabled: true
    certificate_file: "/path/to/cert.pem"
    key_file: "/path/to/key.pem"
  trusted_proxies:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
```

### JWT Configuration
```yaml
jwt:
  algorithm: "HS256"
  secret: "your-jwt-secret"
  expiration: 900  # 15 minutes
```

## 🚨 Error Responses

### Authentication Errors

#### 401 Unauthorized
```json
{
  "error": "The required authorization heads were not present in the request."
}
```

#### 403 Forbidden
```json
{
  "error": "You are not authorized to access this endpoint."
}
```

#### 401 Invalid Token
```json
{
  "error": "The provided token is invalid or has expired."
}
```

#### 403 Token Denied
```json
{
  "error": "The provided token has been revoked."
}
```

## 📝 Examples

### Bearer Token Authentication
```bash
# Get system information
curl -X GET "http://localhost:8080/api/system" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"

# Create a server
curl -X POST "http://localhost:8080/api/servers" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "server-uuid",
    "name": "My Server"
  }'
```

### JWT Token Authentication
```bash
# Download a file using signed URL
curl -X GET "http://localhost:8080/download/file?token=JWT_TOKEN&server=server-uuid&file=config.txt"

# Upload a file using signed URL
curl -X POST "http://localhost:8080/upload/file?token=JWT_TOKEN&server=server-uuid" \
  -F "file=@local-file.txt"
```

### WebSocket Authentication
```javascript
// Connect to WebSocket with JWT token
const ws = new WebSocket('wss://localhost:8080/api/servers/server-uuid/ws?token=JWT_TOKEN');

// Send authentication event
ws.send(JSON.stringify({
  event: 'auth',
  args: ['JWT_TOKEN']
}));
```

## 🔍 Troubleshooting

### Common Issues

#### Token Expired
**Error**: `The provided token is invalid or has expired.`
**Solution**: Request a new token from the panel

#### Invalid Token Format
**Error**: `The required authorization heads were not present in the request.`
**Solution**: Ensure token is in `Bearer TOKEN` format

#### Token Already Used
**Error**: `Token has already been used.`
**Solution**: Request a new one-time token

#### Server Not Found
**Error**: `The requested resource was not found on this server.`
**Solution**: Verify server UUID and token permissions

### Debugging

#### Enable Debug Logging
```bash
# Check Wings logs for authentication issues
tail -f /var/log/wings/daemon.log | grep -i auth
```

#### Validate Token
```bash
# Test token validity
curl -X GET "http://localhost:8080/api/system" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -v
```

#### Check Token Store
```bash
# Monitor token store (if debug enabled)
grep -i "token store" /var/log/wings/daemon.log
```

---

**Next**: [Error Handling](error-handling.md) - Complete error codes and responses 