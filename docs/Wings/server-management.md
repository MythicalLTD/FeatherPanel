# Server Management

This document covers server management endpoints including server creation, listing, and deletion operations.

## 📋 Server Listing

### Get All Servers
**GET** `/api/servers`

Returns all servers registered on this Wings instance with their current status and configuration.

#### Example Request
```bash
curl -X GET "http://localhost:8080/api/servers" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response
```json
[
  {
    "id": "server-uuid",
    "uuid": "server-uuid",
    "name": "My Minecraft Server",
    "node": "node-id",
    "description": "A Minecraft server for my community",
    "status": "running",
    "suspended": false,
    "limits": {
      "memory": 1024,
      "swap": 0,
      "disk": 10000,
      "io": 500,
      "cpu": 100
    },
    "feature_limits": {
      "databases": 5,
      "backups": 2,
      "allocations": 1
    },
    "container": {
      "startup_command": "java -Xms128M -Xmx1024M -jar server.jar",
      "image": "quay.io/pterodactyl/core:java",
      "installed": 1,
      "environment": {
        "SERVER_JARFILE": "server.jar",
        "VANILLA_VERSION": "latest"
      }
    },
    "updated_at": "2023-12-01T10:00:00Z",
    "created_at": "2023-11-01T10:00:00Z"
  },
  {
    "id": "another-server-uuid",
    "uuid": "another-server-uuid",
    "name": "My Discord Bot",
    "node": "node-id",
    "description": "Discord bot server",
    "status": "offline",
    "suspended": false,
    "limits": {
      "memory": 512,
      "swap": 0,
      "disk": 5000,
      "io": 250,
      "cpu": 50
    },
    "feature_limits": {
      "databases": 2,
      "backups": 1,
      "allocations": 1
    },
    "container": {
      "startup_command": "node index.js",
      "image": "quay.io/pterodactyl/core:nodejs",
      "installed": 1,
      "environment": {
        "NODE_VERSION": "18"
      }
    },
    "updated_at": "2023-12-01T09:00:00Z",
    "created_at": "2023-11-15T10:00:00Z"
  }
]
```

#### Response Fields
- `id`: Server UUID
- `uuid`: Server UUID (same as id)
- `name`: Server display name
- `node`: Node identifier
- `description`: Server description
- `status`: Current server status (`running`, `offline`, `starting`, `stopping`)
- `suspended`: Whether server is suspended
- `limits`: Resource limits
  - `memory`: Memory limit in MB
  - `swap`: Swap limit in MB
  - `disk`: Disk limit in MB
  - `io`: IO limit
  - `cpu`: CPU limit percentage
- `feature_limits`: Feature limits
  - `databases`: Maximum databases
  - `backups`: Maximum backups
  - `allocations`: Maximum allocations
- `container`: Container configuration
  - `startup_command`: Server startup command
  - `image`: Docker image
  - `installed`: Installation status (1 = installed)
  - `environment`: Environment variables
- `updated_at`: Last update timestamp
- `created_at`: Creation timestamp

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **500 Internal Server Error**: Failed to retrieve server list

---

## ➕ Server Creation

### Create Server
**POST** `/api/servers`

Creates a new server and begins the installation process. This is an asynchronous operation.

#### Request Body
```json
{
  "uuid": "server-uuid",
  "name": "My Server",
  "description": "A game server",
  "limits": {
    "memory": 1024,
    "swap": 0,
    "disk": 10000,
    "io": 500,
    "cpu": 100
  },
  "feature_limits": {
    "databases": 5,
    "backups": 2,
    "allocations": 1
  },
  "container": {
    "startup_command": "java -Xms128M -Xmx1024M -jar server.jar",
    "image": "quay.io/pterodactyl/core:java",
    "environment": {
      "SERVER_JARFILE": "server.jar",
      "VANILLA_VERSION": "latest"
    }
  },
  "start_on_completion": true,
  "external_id": "external-server-id"
}
```

#### Required Fields
- `uuid`: Unique server identifier
- `name`: Server display name
- `limits`: Resource limits
- `container`: Container configuration

#### Optional Fields
- `description`: Server description
- `feature_limits`: Feature limits
- `start_on_completion`: Whether to start server after installation
- `external_id`: External system identifier

#### Example Request
```bash
curl -X POST "http://localhost:8080/api/servers" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "uuid": "minecraft-server-001",
    "name": "My Minecraft Server",
    "description": "A Minecraft server for my community",
    "limits": {
      "memory": 1024,
      "swap": 0,
      "disk": 10000,
      "io": 500,
      "cpu": 100
    },
    "feature_limits": {
      "databases": 5,
      "backups": 2,
      "allocations": 1
    },
    "container": {
      "startup_command": "java -Xms128M -Xmx1024M -jar server.jar",
      "image": "quay.io/pterodactyl/core:java",
      "environment": {
        "SERVER_JARFILE": "server.jar",
        "VANILLA_VERSION": "latest"
      }
    },
    "start_on_completion": true
  }'
```

#### Response
```
202 Accepted
```

#### Installation Process
1. **Validation**: Server configuration is validated
2. **Environment Creation**: Server environment is created
3. **Installation**: Server files are installed
4. **Startup** (if enabled): Server is started automatically

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **422 Unprocessable Entity**: Invalid server configuration
- **409 Conflict**: Server UUID already exists
- **500 Internal Server Error**: Installation failed

#### Validation Rules
- **UUID**: Must be unique, valid UUID format
- **Name**: Must be 1-200 characters
- **Memory**: Must be 32-16384 MB
- **Disk**: Must be 100-1000000 MB
- **CPU**: Must be 0-100%
- **Image**: Must be a valid Docker image

---

## 🗑️ Server Deletion

### Delete Server
**DELETE** `/api/servers/{server}`

Deletes a server and all its associated data. This operation is irreversible.

#### Example Request
```bash
curl -X DELETE "http://localhost:8080/api/servers/server-uuid" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response
```
200 OK
```

#### Deletion Process
1. **Stop Server**: Server is stopped if running
2. **Remove Container**: Docker container is removed
3. **Delete Files**: All server files are deleted
4. **Remove Backups**: All backups are deleted
5. **Cleanup**: System resources are cleaned up

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Server not found
- **409 Conflict**: Server is currently transferring
- **500 Internal Server Error**: Deletion failed

---

## 📊 Server Information

### Get Server Information
**GET** `/api/servers/{server}`

Returns detailed information about a specific server.

#### Example Request
```bash
curl -X GET "http://localhost:8080/api/servers/server-uuid" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

#### Response
```json
{
  "id": "server-uuid",
  "uuid": "server-uuid",
  "name": "My Minecraft Server",
  "node": "node-id",
  "description": "A Minecraft server for my community",
  "status": "running",
  "suspended": false,
  "limits": {
    "memory": 1024,
    "swap": 0,
    "disk": 10000,
    "io": 500,
    "cpu": 100
  },
  "feature_limits": {
    "databases": 5,
    "backups": 2,
    "allocations": 1
  },
  "container": {
    "startup_command": "java -Xms128M -Xmx1024M -jar server.jar",
    "image": "quay.io/pterodactyl/core:java",
    "installed": 1,
    "environment": {
      "SERVER_JARFILE": "server.jar",
      "VANILLA_VERSION": "latest"
    }
  },
  "updated_at": "2023-12-01T10:00:00Z",
  "created_at": "2023-11-01T10:00:00Z"
}
```

#### Error Responses
- **401 Unauthorized**: Missing or invalid authentication token
- **404 Not Found**: Server not found

---

## 🔧 Server Configuration

### Server Limits

#### Memory Limits
- **Minimum**: 32 MB
- **Maximum**: 16384 MB (16 GB)
- **Default**: 1024 MB

#### Disk Limits
- **Minimum**: 100 MB
- **Maximum**: 1000000 MB (1 TB)
- **Default**: 10000 MB

#### CPU Limits
- **Minimum**: 0%
- **Maximum**: 100%
- **Default**: 100%

#### IO Limits
- **Minimum**: 10
- **Maximum**: 1000
- **Default**: 500

### Feature Limits

#### Databases
- **Maximum**: 10
- **Default**: 5

#### Backups
- **Maximum**: 10
- **Default**: 2

#### Allocations
- **Maximum**: 5
- **Default**: 1

---

## 📈 Server States

### Available States
- **`offline`**: Server is stopped
- **`starting`**: Server is starting up
- **`running`**: Server is running
- **`stopping`**: Server is shutting down
- **`installing`**: Server is being installed
- **`transferring`**: Server is being transferred

### State Transitions
```
offline → starting → running
running → stopping → offline
offline → installing → offline
offline → transferring → offline
```

---

## 🚨 Common Issues

### Server Creation Issues

#### Invalid Configuration
**Error**: `The data provided in the request could not be validated.`
**Solution**:
1. Check all required fields are present
2. Verify field values are within limits
3. Ensure UUID is unique

#### Docker Image Not Found
**Error**: `Failed to pull Docker image`
**Solution**:
1. Verify image name is correct
2. Check Docker daemon is running
3. Ensure network connectivity

#### Insufficient Resources
**Error**: `Insufficient system resources`
**Solution**:
1. Check available memory
2. Verify disk space
3. Reduce resource limits

### Server Deletion Issues

#### Server Running
**Error**: `Cannot delete running server`
**Solution**:
1. Stop server first
2. Wait for stop to complete
3. Then delete server

#### Transfer in Progress
**Error**: `Server is currently being transferred`
**Solution**:
1. Cancel transfer first
2. Wait for transfer to complete
3. Then delete server

#### Permission Denied
**Error**: `Permission denied deleting server files`
**Solution**:
1. Check Wings user permissions
2. Verify file system access
3. Check SELinux/AppArmor settings

---

## 🔍 Monitoring

### Server Health Checks
```bash
# Check all servers status
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/servers | jq '.[].status'

# Monitor specific server
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/servers/server-uuid | jq '.status'
```

### Resource Monitoring
```bash
# Check server resource usage
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/servers/server-uuid | \
  jq '.limits, .container'
```

### Installation Monitoring
```bash
# Check installation logs
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:8080/api/servers/server-uuid/install-logs
```

---

## 📚 Related Documentation

- **[Server Operations](server-operations.md)** - Server power management and commands
- **[File Management](file-management.md)** - Server file operations
- **[Backup Management](backup-management.md)** - Server backup operations
- **[Error Handling](error-handling.md)** - Complete error reference

---

**Next**: [Server Operations](server-operations.md) - Server power management and control endpoints 