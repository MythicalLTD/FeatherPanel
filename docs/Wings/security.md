# Security & Rate Limiting

This document covers security considerations, rate limiting, and best practices for the Wings API.

## 🛡️ Security Overview

The Wings API implements multiple layers of security to protect against unauthorized access and abuse.

### Security Layers
1. **Authentication**: Bearer tokens and JWT validation
2. **Authorization**: Permission-based access control
3. **Rate Limiting**: Request throttling to prevent abuse
4. **Input Validation**: Request payload validation
5. **Network Security**: IP restrictions and SSL/TLS

## 🔒 Authentication Security

### Token Security

#### Bearer Token Requirements
- **Length**: Minimum 32 characters
- **Complexity**: Mix of letters, numbers, and symbols
- **Rotation**: Regular token rotation recommended
- **Storage**: Secure storage in configuration files

#### JWT Token Security
- **Expiration**: 15-minute default expiration
- **Signature**: HMAC-SHA256 signing
- **One-time Use**: Most tokens are single-use
- **Denylist**: Revoked tokens are tracked

### Token Best Practices

#### Secure Token Generation
```bash
# Generate secure token
openssl rand -base64 32

# Generate UUID for server
uuidgen
```

#### Token Storage
```yaml
# Secure configuration example
api:
  token: "your-very-long-and-complex-token-here"
  ssl:
    enabled: true
    certificate_file: "/etc/ssl/certs/wings.crt"
    key_file: "/etc/ssl/private/wings.key"
```

#### Token Rotation
```bash
# Rotate authentication token
curl -X POST "http://localhost:8080/api/update" \
  -H "Authorization: Bearer OLD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api": {
      "token": "NEW_SECURE_TOKEN_HERE"
    }
  }'
```

## 🚦 Rate Limiting

### Rate Limit Configuration

#### Default Limits
- **General API**: 100 requests per minute
- **File Operations**: 50 requests per minute
- **Server Operations**: 30 requests per minute
- **System Operations**: 20 requests per minute

#### Custom Limits
```yaml
# Custom rate limiting configuration
api:
  rate_limit:
    general: 100
    files: 50
    servers: 30
    system: 20
    window: 60  # seconds
```

### Rate Limit Headers

#### Response Headers
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1640995200
Retry-After: 60
```

#### Rate Limit Exceeded
```json
{
  "error": "Rate limit exceeded. Please try again later.",
  "retry_after": 60
}
```

### Rate Limit Categories

#### General API
- System information endpoints
- Configuration endpoints
- Health check endpoints

#### File Operations
- File upload/download
- File management operations
- Directory operations

#### Server Operations
- Server power management
- Server commands
- Server logs

#### System Operations
- Docker operations
- Backup operations
- Transfer operations

## 🌐 Network Security

### IP Restrictions

#### Internal Network Blocking
The API blocks requests to internal networks:
- `127.0.0.0/8` (Loopback)
- `10.0.0.0/8` (Private)
- `172.16.0.0/12` (Private)
- `192.168.0.0/16` (Private)
- `169.254.0.0/16` (Link-local)
- `::1/128` (IPv6 loopback)
- `fe80::/10` (IPv6 link-local)
- `fc00::/7` (IPv6 unique local)

#### Trusted Proxies
```yaml
# Configure trusted proxies
api:
  trusted_proxies:
    - "10.0.0.0/8"
    - "172.16.0.0/12"
    - "192.168.1.0/24"
```

### SSL/TLS Configuration

#### SSL Requirements
- **Production**: HTTPS required
- **Certificates**: Valid SSL certificates
- **Cipher Suites**: Modern cipher suites only
- **HSTS**: HTTP Strict Transport Security

#### SSL Configuration
```yaml
api:
  ssl:
    enabled: true
    certificate_file: "/etc/ssl/certs/wings.crt"
    key_file: "/etc/ssl/private/wings.key"
    minimum_version: "TLSv1.2"
```

## 🔐 Input Validation

### Request Validation

#### JSON Validation
- **Content-Type**: `application/json` required
- **Size Limits**: Maximum 10MB per request
- **Schema Validation**: All requests validated against schemas

#### Field Validation
```json
{
  "uuid": "must-be-valid-uuid",
  "name": "1-200 characters",
  "memory": "32-16384 MB",
  "disk": "100-1000000 MB",
  "cpu": "0-100%"
}
```

### File Upload Security

#### File Type Restrictions
- **Allowed Types**: Specific file types only
- **Size Limits**: Configurable file size limits
- **Path Validation**: Prevents directory traversal
- **Virus Scanning**: Optional virus scanning

#### Upload Security
```yaml
# File upload security configuration
files:
  max_size: 104857600  # 100MB
  allowed_types:
    - ".jar"
    - ".zip"
    - ".tar.gz"
    - ".txt"
    - ".properties"
  virus_scan: true
```

## 🚨 Security Headers

### Automatic Headers
```
X-Request-Id: request-uuid
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Custom Headers
```
User-Agent: Pelican Wings/v1.11.0 (id:token-id)
X-Powered-By: Pelican Wings
```

## 🔍 Security Monitoring

### Logging

#### Security Events
```json
{
  "level": "warn",
  "message": "Authentication failed",
  "request_id": "uuid-here",
  "client_ip": "192.168.1.100",
  "user_agent": "curl/7.68.0",
  "endpoint": "/api/system"
}
```

#### Rate Limit Events
```json
{
  "level": "warn",
  "message": "Rate limit exceeded",
  "request_id": "uuid-here",
  "client_ip": "192.168.1.100",
  "endpoint": "/api/servers",
  "limit": 100,
  "window": 60
}
```

### Monitoring Commands

#### Check Authentication Failures
```bash
# Monitor authentication failures
tail -f /var/log/wings/daemon.log | grep -i "auth.*fail"

# Check rate limit violations
tail -f /var/log/wings/daemon.log | grep -i "rate.*limit"
```

#### Monitor Suspicious Activity
```bash
# Check for repeated failures
grep "Authentication failed" /var/log/wings/daemon.log | \
  awk '{print $8}' | sort | uniq -c | sort -nr

# Monitor IP addresses
grep "client_ip" /var/log/wings/daemon.log | \
  awk '{print $8}' | sort | uniq -c | sort -nr
```

## 🛠️ Security Best Practices

### Server Hardening

#### System Security
```bash
# Update system regularly
apt update && apt upgrade -y

# Configure firewall
ufw allow 8080/tcp
ufw enable

# Secure SSH
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd
```

#### Docker Security
```bash
# Run Wings in non-root container
docker run --user 1000:1000 wings

# Limit container capabilities
docker run --cap-drop=ALL wings

# Use read-only root filesystem
docker run --read-only wings
```

### Configuration Security

#### Secure Configuration
```yaml
# Minimum secure configuration
api:
  token: "your-very-long-and-complex-token"
  ssl:
    enabled: true
    certificate_file: "/etc/ssl/certs/wings.crt"
    key_file: "/etc/ssl/private/wings.key"
  trusted_proxies:
    - "10.0.0.0/8"
  rate_limit:
    general: 100
    files: 50
    servers: 30
    system: 20

system:
  data: "/var/lib/pterodactyl"
  log_directory: "/var/log/pterodactyl"
  tmp_directory: "/tmp/pterodactyl"

docker:
  socket: "/var/run/docker.sock"
  system_ips:
    - "192.168.1.100"
```

#### File Permissions
```bash
# Secure file permissions
chmod 600 /etc/wings/config.yml
chown wings:wings /etc/wings/config.yml
chmod 700 /var/lib/pterodactyl
chown wings:wings /var/lib/pterodactyl
```

### Network Security

#### Firewall Configuration
```bash
# Basic firewall rules
ufw default deny incoming
ufw default allow outgoing
ufw allow 8080/tcp
ufw allow from 10.0.0.0/8 to any port 8080
ufw enable
```

#### Reverse Proxy Security
```nginx
# Nginx reverse proxy configuration
server {
    listen 443 ssl http2;
    server_name wings.example.com;
    
    ssl_certificate /etc/ssl/certs/wings.crt;
    ssl_certificate_key /etc/ssl/private/wings.key;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚨 Incident Response

### Security Incidents

#### Unauthorized Access
1. **Immediate Actions**:
   - Block suspicious IP addresses
   - Rotate authentication tokens
   - Review access logs
   - Check for data compromise

2. **Investigation**:
   ```bash
   # Check recent authentication attempts
   grep "Authentication failed" /var/log/wings/daemon.log | tail -50
   
   # Monitor current connections
   netstat -tulpn | grep :8080
   
   # Check for suspicious files
   find /var/lib/pterodactyl -type f -mtime -1 -ls
   ```

#### Rate Limit Abuse
1. **Immediate Actions**:
   - Increase rate limits temporarily
   - Block abusive IP addresses
   - Monitor for patterns

2. **Investigation**:
   ```bash
   # Check rate limit violations
   grep "Rate limit exceeded" /var/log/wings/daemon.log
   
   # Analyze request patterns
   awk '{print $1}' /var/log/wings/daemon.log | sort | uniq -c | sort -nr
   ```

### Recovery Procedures

#### Token Compromise
```bash
# Generate new token
NEW_TOKEN=$(openssl rand -base64 32)

# Update configuration
curl -X POST "http://localhost:8080/api/update" \
  -H "Authorization: Bearer OLD_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"api\":{\"token\":\"$NEW_TOKEN\"}}"

# Update panel configuration
# Update all client applications
```

#### System Compromise
1. **Isolate**: Disconnect from network
2. **Assess**: Determine scope of compromise
3. **Clean**: Remove malicious files/code
4. **Restore**: Restore from clean backup
5. **Monitor**: Enhanced monitoring

## 📊 Security Metrics

### Key Metrics to Monitor

#### Authentication Metrics
- Failed authentication attempts
- Token usage patterns
- IP address distribution

#### Rate Limiting Metrics
- Rate limit violations
- Request patterns
- Endpoint usage

#### System Security Metrics
- File system changes
- Process anomalies
- Network connections

### Monitoring Dashboard
```bash
# Security monitoring script
#!/bin/bash

echo "=== Wings Security Report ==="
echo "Date: $(date)"
echo ""

echo "Authentication Failures (Last 24h):"
grep "Authentication failed" /var/log/wings/daemon.log | \
  grep "$(date -d '24 hours ago' '+%Y-%m-%d')" | wc -l

echo "Rate Limit Violations (Last 24h):"
grep "Rate limit exceeded" /var/log/wings/daemon.log | \
  grep "$(date -d '24 hours ago' '+%Y-%m-%d')" | wc -l

echo "Top IP Addresses:"
grep "client_ip" /var/log/wings/daemon.log | \
  awk '{print $8}' | sort | uniq -c | sort -nr | head -10

echo "Active Connections:"
netstat -tulpn | grep :8080 | wc -l
```

---

## 📚 Related Documentation

- **[Authentication](authentication.md)** - Authentication methods and tokens
- **[Error Handling](error-handling.md)** - Security-related error responses
- **[System Endpoints](system-endpoints.md)** - System monitoring and security

---

**Next**: [File Management](file-management.md) - Secure file operations and management 