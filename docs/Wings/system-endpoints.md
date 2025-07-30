# System Endpoints

This document covers all system-related API endpoints for retrieving system information, managing Docker resources, and monitoring system utilization.

## 📊 System Information

### Get System Information
**GET** `/api/system`

Returns basic system information including architecture, CPU count, kernel version, OS, and Wings version.

#### Query Parameters
- `v=2` - Returns detailed system information including Docker details

#### Example Request
```bash
curl -X GET "http://localhost:8080/api/system" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response (v1 - Default)
```json
{
  "architecture": "x86_64",
  "cpu_count": 8,
  "kernel_version": "5.15.0-91-generic",
  "os": "Ubuntu 22.04.3 LTS",
  "version": "1.11.0"
}
```

#### Response (v2 - Detailed)
```json
{
  "version": "1.11.0",
  "docker": {
    "version": "24.0.7",
    "cgroups": {
      "driver": "systemd",
      "version": "2"
    },
    "containers": {
      "total": 5,
      "running": 3,
      "paused": 0,
      "stopped": 2
    },
    "storage": {
      "driver": "overlay2",
      "filesystem": "extfs"
    },
    "runc": {
      "version": "1.1.8"
    }
  },
  "system": {
    "architecture": "x86_64",
    "cpu_threads": 8,
    "memory_bytes": 17179869184,
    "kernel_version": "5.15.0-91-generic",
    "os": "Ubuntu 22.04.3 LTS",
    "os_type": "linux"
  }
}
```

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Failed to retrieve system information

---

### Get System IP Addresses
**GET** `/api/system/ips`

Returns all IP addresses associated with the system, including both detected interfaces and manually configured IPs.

#### Example Request
```bash
curl -X GET "http://localhost:8080/api/system/ips" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response
```json
{
  "ip_addresses": [
    "192.168.1.100",
    "10.0.0.50",
    "172.17.0.1"
  ]
}
```

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Failed to retrieve IP addresses

---

### Get System Utilization
**GET** `/api/system/utilization`

Returns detailed system resource utilization including memory, CPU, disk usage, and load averages.

#### Example Request
```bash
curl -X GET "http://localhost:8080/api/system/utilization" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response
```json
{
  "memory_total": 17179869184,
  "memory_used": 8589934592,
  "swap_total": 2147483648,
  "swap_used": 0,
  "load_average1": 0.5,
  "load_average5": 0.3,
  "load_average15": 0.2,
  "cpu_percent": 15.5,
  "disk_total": 107374182400,
  "disk_used": 53687091200,
  "disk_details": [
    {
      "device": "/dev/sda1",
      "mountpoint": "/",
      "total_space": 107374182400,
      "used_space": 53687091200,
      "tags": ["root", "system"]
    },
    {
      "device": "/dev/sdb1",
      "mountpoint": "/var/lib/docker",
      "total_space": 536870912000,
      "used_space": 107374182400,
      "tags": ["docker", "data"]
    }
  ]
}
```

#### Response Fields
- `memory_total`: Total system memory in bytes
- `memory_used`: Used system memory in bytes
- `swap_total`: Total swap space in bytes
- `swap_used`: Used swap space in bytes
- `load_average1`: 1-minute load average
- `load_average5`: 5-minute load average
- `load_average15`: 15-minute load average
- `cpu_percent`: CPU usage percentage
- `disk_total`: Total disk space in bytes
- `disk_used`: Used disk space in bytes
- `disk_details`: Array of disk partition information

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Failed to retrieve system utilization

---

## 🐳 Docker Management

### Get Docker Disk Usage
**GET** `/api/system/docker/disk`

Returns Docker disk usage information including container sizes, image counts, and build cache size.

#### Example Request
```bash
curl -X GET "http://localhost:8080/api/system/docker/disk" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response
```json
{
  "containers_size": 2147483648,
  "images_total": 25,
  "images_active": 15,
  "images_size": 5368709120,
  "build_cache_size": 1073741824
}
```

#### Response Fields
- `containers_size`: Total size of all containers in bytes
- `images_total`: Total number of Docker images
- `images_active`: Number of actively used images
- `images_size`: Total size of all images in bytes
- `build_cache_size`: Size of Docker build cache in bytes

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **400 Bad Request**: Docker not available
- **500 Internal Server Error**: Failed to retrieve Docker disk usage

---

### Prune Docker Images
**DELETE** `/api/system/docker/image/prune`

Removes unused Docker images to free up disk space. This operation is irreversible.

#### Example Request
```bash
curl -X DELETE "http://localhost:8080/api/system/docker/image/prune" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response
```json
{
  "ImagesDeleted": [
    {
      "Deleted": "sha256:abc123def4567890abcdef1234567890abcdef1234567890abcdef1234567890",
      "Untagged": "nginx:latest"
    },
    {
      "Deleted": "sha256:def456abc7890123def456abc7890123def456abc7890123def456abc7890123",
      "Untagged": "ubuntu:20.04"
    }
  ],
  "SpaceReclaimed": 1073741824
}
```

#### Response Fields
- `ImagesDeleted`: Array of deleted image information
  - `Deleted`: SHA256 hash of deleted image
  - `Untagged`: Tag of deleted image
- `SpaceReclaimed`: Total space reclaimed in bytes

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **400 Bad Request**: Docker not available
- **500 Internal Server Error**: Failed to prune Docker images

---

## ⚙️ Configuration Management

### Update Configuration
**POST** `/api/update`

Updates the Wings daemon configuration dynamically. This endpoint accepts a JSON payload with the new configuration.

#### Request Body
```json
{
  "api": {
    "host": "0.0.0.0",
    "port": 8080,
    "ssl": {
      "enabled": false,
      "certificate_file": "/path/to/cert.pem",
      "key_file": "/path/to/key.pem"
    },
    "trusted_proxies": [
      "10.0.0.0/8",
      "172.16.0.0/12"
    ]
  },
  "system": {
    "data": "/var/lib/pterodactyl",
    "log_directory": "/var/log/pterodactyl",
    "tmp_directory": "/tmp/pterodactyl",
    "archive_directory": "/var/lib/pterodactyl/archives",
    "backup_directory": "/var/lib/pterodactyl/backups"
  },
  "docker": {
    "socket": "/var/run/docker.sock",
    "system_ips": [
      "192.168.1.100",
      "10.0.0.50"
    ]
  },
  "remote": {
    "base_url": "https://panel.example.com",
    "token": "panel-api-token"
  }
}
```

#### Example Request
```bash
curl -X POST "http://localhost:8080/api/update" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api": {
      "host": "0.0.0.0",
      "port": 8080,
      "ssl": {
        "enabled": false
      }
    },
    "system": {
      "data": "/var/lib/pterodactyl",
      "log_directory": "/var/log/pterodactyl"
    }
  }'
```

#### Response
```json
{
  "applied": true
}
```

#### Response Fields
- `applied`: Boolean indicating if configuration was applied successfully

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **400 Bad Request**: Invalid configuration format
- **422 Unprocessable Entity**: Configuration validation failed
- **500 Internal Server Error**: Failed to write configuration to disk

#### Configuration Notes
- SSL certificate paths are preserved if they match Let's Encrypt defaults
- Configuration is validated before being applied
- Changes take effect immediately
- Invalid configurations are rejected without affecting current settings

---

## 📈 System Monitoring

### System Metrics

The system endpoints provide comprehensive monitoring capabilities:

#### Memory Monitoring
- Total and used memory
- Swap space utilization
- Memory usage trends

#### CPU Monitoring
- CPU usage percentage
- Load averages (1, 5, 15 minute)
- CPU thread count

#### Disk Monitoring
- Total and used disk space
- Per-partition breakdown
- Disk usage by mount point

#### Docker Monitoring
- Container count and status
- Image usage and sizes
- Build cache utilization

### Monitoring Best Practices

#### Regular Health Checks
```bash
# Check system health every 5 minutes
*/5 * * * * curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/system/utilization > /dev/null
```

#### Alert Thresholds
- **Memory usage**: Alert if > 90%
- **Disk usage**: Alert if > 85%
- **Load average**: Alert if > 2.0 per CPU core
- **Docker images**: Alert if > 100 images

#### Logging
```bash
# Log system metrics
curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/system/utilization | \
  jq -r '.cpu_percent, .memory_used, .disk_used' >> /var/log/system-metrics.log
```

---

## 🔧 Troubleshooting

### Common Issues

#### Docker Not Available
**Error**: `Docker is not available on this system`
**Solution**: 
1. Check Docker service status: `systemctl status docker`
2. Verify Docker socket permissions
3. Ensure Docker daemon is running

#### Permission Denied
**Error**: `Permission denied accessing system information`
**Solution**:
1. Check Wings user permissions
2. Verify file system access
3. Check SELinux/AppArmor settings

#### Configuration Write Failed
**Error**: `Failed to write configuration to disk`
**Solution**:
1. Check file permissions on config directory
2. Verify disk space availability
3. Check file system integrity

### Debug Commands

#### Check System Status
```bash
# Verify Wings can access system information
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/system

# Check Docker connectivity
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/system/docker/disk
```

#### Monitor System Resources
```bash
# Real-time system monitoring
watch -n 1 'curl -s -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/system/utilization | jq'
```

#### Check Configuration
```bash
# Validate current configuration
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/system | jq '.version'
```

---

## 📚 Related Documentation

- **[Error Handling](error-handling.md)** - Complete error reference
- **[Authentication](authentication.md)** - Authentication methods
- **[Security](security.md)** - Security considerations and best practices

---

**Next**: [Server Management](server-management.md) - Server creation and management endpoints 