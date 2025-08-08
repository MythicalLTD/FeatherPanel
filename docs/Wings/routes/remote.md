# Detailed Wings → Panel API Endpoint Analysis

This document provides a comprehensive analysis of each Panel API endpoint that Wings calls, including their location in the codebase, purpose, timing, and implementation details.

## 1. Node Configuration (Setup)

### GET `/api/application/nodes/{node_id}/configuration`

**📍 Location in Wings:**

- File: `cmd/configure.go`
- Function: `getRequest()` (lines 170-186)
- Called during: Wings initial configuration

**🎯 What it does:**

- Fetches the complete Wings configuration from the Panel
- Includes API settings, system paths, Docker configuration, and authentication tokens
- Used to bootstrap Wings with its initial configuration

**⏰ When it's called:**

- During Wings setup/configuration process
- When running `wings configure` command
- Only called once during initial Wings setup

**🔧 How it works:**

```go
// From cmd/configure.go
func getRequest() (*http.Request, error) {
    u, err := url.Parse(configureArgs.PanelURL)
    u.Path = path.Join(u.Path, fmt.Sprintf("api/application/nodes/%s/configuration", configureArgs.Node))

    r, err := http.NewRequest(http.MethodGet, u.String(), nil)
    r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", configureArgs.Token))
    return r, nil
}
```

**📋 Response Structure:**

```json
{
  "debug": false,
  "uuid": "550e8400-e29b-41d4-a716-446655440000",
  "token_id": "QUu9fJGVmiIoFQ35",
  "token": "Z4vDo2PRoZ8f0aahXjr1313Re1BqXEdDK3niky6gDBxSGioG1goE7AKGyuMFpHul",
  "api": {
    "host": "0.0.0.0",
    "port": 8080,
    "ssl": { "enabled": false }
  },
  "system": {
    "data": "/var/lib/pelican",
    "sftp": {
      "bind_address": "0.0.0.0",
      "bind_port": 2022
    }
  },
  "docker": {
    "network": { "interface": "172.18.0.1" }
  }
}
```

---

## 2. Server Management

### GET `/api/remote/servers`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `GetServers()` (lines 18-50)
- Called by: Server manager during startup

**🎯 What it does:**

- Retrieves all servers assigned to this Wings node
- Supports pagination for large server lists
- Fetches basic server data for initialization

**⏰ When it's called:**

- During Wings startup
- When server manager initializes
- Periodically for server synchronization

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) GetServers(ctx context.Context, limit int) ([]RawServerData, error) {
    servers, meta, err := c.getServersPaged(ctx, 0, limit)
    // Handles pagination automatically
    if meta.LastPage > 1 {
        // Makes parallel requests for additional pages
    }
    return servers, nil
}
```

**📋 Response Structure:**

```json
{
  "data": [
    {
      "uuid": "550e8400-e29b-41d4-a716-446655440000",
      "settings": {
        /* server settings */
      },
      "process_configuration": {
        /* process config */
      }
    }
  ],
  "meta": {
    "current_page": 1,
    "last_page": 1,
    "per_page": 50,
    "total": 1
  }
}
```

### GET `/api/remote/servers/{uuid}`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `GetServerConfiguration()` (lines 72-81)
- Called by: Server instance creation and updates

**🎯 What it does:**

- Fetches complete configuration for a specific server
- Includes all server settings, environment variables, and process configuration
- Used to create or update server instances

**⏰ When it's called:**

- When creating a new server instance
- When updating server configuration
- During server reinstallation
- When Wings needs fresh server data

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) GetServerConfiguration(ctx context.Context, uuid string) (ServerConfigurationResponse, error) {
    var config ServerConfigurationResponse
    res, err := c.Get(ctx, fmt.Sprintf("/servers/%s", uuid), nil)
    err = res.BindJSON(&config)
    return config, err
}
```

**📋 Response Structure:**

```json
{
  "settings": {
    "uuid": "550e8400-e29b-41d4-a716-446655440000",
    "meta": {
      "name": "My Server",
      "description": "Server description"
    },
    "suspended": false,
    "invocation": "java -Xms128M -Xmx{{SERVER_MEMORY}}M -jar {{SERVER_JARFILE}}",
    "environment": {
      "SERVER_JARFILE": "server.jar",
      "SERVER_MEMORY": "1024"
    },
    "allocations": {
      "default": {
        "ip": "192.168.1.100",
        "port": 25565
      }
    },
    "build": {
      "memory_limit": 1024,
      "cpu_limit": 200,
      "disk_space": 10240
    }
  },
  "process_configuration": {
    "startup": {
      "done": ["Done ("],
      "user_interaction": [],
      "strip_ansi": true
    },
    "stop": {
      "type": "command",
      "value": "stop"
    }
  }
}
```

### GET `/api/remote/servers/{uuid}/install`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `GetInstallationScript()` (lines 83-92)
- Called by: Server installation process

**🎯 What it does:**

- Retrieves installation script and container configuration
- Provides Docker image, entrypoint, and installation commands
- Used during server installation/reinstallation

**⏰ When it's called:**

- During server installation
- When reinstalling a server
- When updating server configuration requires reinstall

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) GetInstallationScript(ctx context.Context, uuid string) (InstallationScript, error) {
    res, err := c.Get(ctx, fmt.Sprintf("/servers/%s/install", uuid), nil)
    var config InstallationScript
    err = res.BindJSON(&config)
    return config, err
}
```

**📋 Response Structure:**

```json
{
  "container_image": "ghcr.io/pterodactyl/games:java",
  "entrypoint": "/bin/bash",
  "script": "#!/bin/bash\n# Installation script content\nwget -O server.jar https://example.com/server.jar"
}
```

### POST `/api/remote/servers/{uuid}/install`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `SetInstallationStatus()` (lines 95-103)
- Called by: Server installation completion

**🎯 What it does:**

- Reports installation success/failure to Panel
- Updates server installation status
- Triggers post-installation processes

**⏰ When it's called:**

- After installation script completes
- When installation fails
- During reinstallation process

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) SetInstallationStatus(ctx context.Context, uuid string, data InstallStatusRequest) error {
    resp, err := c.Post(ctx, fmt.Sprintf("/servers/%s/install", uuid), data)
    return err
}
```

**📋 Request Structure:**

```json
{
  "successful": true,
  "reinstall": false
}
```

### POST `/api/remote/servers/{uuid}/container/status`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `PushServerStateChange()` (lines 216-223)
- Called by: Server state monitoring

**🎯 What it does:**

- Reports real-time server state changes
- Includes resource usage (CPU, memory, network)
- Updates server status in Panel

**⏰ When it's called:**

- Every few seconds during server monitoring
- When server state changes (start/stop/crash)
- During resource usage tracking

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) PushServerStateChange(ctx context.Context, sid string, sc ServerStateChange) error {
    resp, err := c.Post(ctx, fmt.Sprintf("/servers/%s/container/status", sid), d{"data": sc})
    return err
}
```

**📋 Request Structure:**

```json
{
  "data": {
    "state": "running",
    "memory_bytes": 512000000,
    "cpu_absolute": 25.5,
    "network": {
      "rx_bytes": 1024000,
      "tx_bytes": 2048000
    },
    "uptime": 3600000
  }
}
```

### POST `/api/remote/servers/reset`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `ResetServersState()` (lines 62-70)
- Called by: Wings startup process

**🎯 What it does:**

- Resets server states on Panel after Wings restart
- Clears "installing" or "restoring" states
- Prevents stuck states after Wings crashes

**⏰ When it's called:**

- During Wings startup
- After all servers are loaded
- To clean up inconsistent states

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) ResetServersState(ctx context.Context) error {
    res, err := c.Post(ctx, "/servers/reset", nil)
    return err
}
```

---

## 3. Backup Management

### GET `/api/remote/backups/{backup_id}`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `GetBackupRemoteUploadURLs()` (lines 150-160)
- Called by: Backup creation process

**🎯 What it does:**

- Gets pre-signed URLs for backup upload
- Supports multipart uploads for large backups
- Provides upload endpoints for backup storage

**⏰ When it's called:**

- When creating a new backup
- Before uploading backup data
- During backup initialization

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) GetBackupRemoteUploadURLs(ctx context.Context, backup string, size int64) (BackupRemoteUploadResponse, error) {
    res, err := c.Get(ctx, fmt.Sprintf("/backups/%s", backup), q{"size": strconv.FormatInt(size, 10)})
    var data BackupRemoteUploadResponse
    err = res.BindJSON(&data)
    return data, err
}
```

**📋 Response Structure:**

```json
{
  "parts": [
    "https://s3.amazonaws.com/bucket/backup-part-1",
    "https://s3.amazonaws.com/bucket/backup-part-2"
  ],
  "part_size": 524288000
}
```

### POST `/api/remote/backups/{backup_id}`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `SetBackupStatus()` (lines 162-170)
- Called by: Backup completion

**🎯 What it does:**

- Reports backup completion status
- Includes checksums and file information
- Updates backup metadata in Panel

**⏰ When it's called:**

- After backup upload completes
- When backup fails
- During backup verification

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) SetBackupStatus(ctx context.Context, backup string, data BackupRequest) error {
    resp, err := c.Post(ctx, fmt.Sprintf("/backups/%s", backup), data)
    return err
}
```

**📋 Request Structure:**

```json
{
  "checksum": "sha256:abc123...",
  "checksum_type": "sha256",
  "size": 1073741824,
  "successful": true,
  "parts": [
    {
      "etag": "abc123...",
      "part_number": 1
    }
  ]
}
```

### POST `/api/remote/backups/{backup_id}/restore`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `SendRestorationStatus()` (lines 174-182)
- Called by: Backup restoration completion

**🎯 What it does:**

- Reports backup restoration completion
- Updates server state after restoration
- Activates server after successful restore

**⏰ When it's called:**

- After backup restoration completes
- When restoration fails
- During server reactivation

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) SendRestorationStatus(ctx context.Context, backup string, successful bool) error {
    resp, err := c.Post(ctx, fmt.Sprintf("/backups/%s/restore", backup), d{"successful": successful})
    return err
}
```

---

## 4. Transfer Management

### POST `/api/remote/servers/{uuid}/archive`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `SetArchiveStatus()` (lines 104-112)
- Called by: Server transfer process

**🎯 What it does:**

- Reports archive creation status for transfers
- Updates transfer progress
- Handles server data archiving

**⏰ When it's called:**

- During server transfer preparation
- When archiving server data
- After archive creation completes

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) SetArchiveStatus(ctx context.Context, uuid string, successful bool) error {
    resp, err := c.Post(ctx, fmt.Sprintf("/servers/%s/archive", uuid), d{"successful": successful})
    return err
}
```

### POST `/api/remote/servers/{uuid}/transfer/{status}`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `SetTransferStatus()` (lines 117-125)
- Called by: Server transfer completion

**🎯 What it does:**

- Reports server transfer completion status
- Updates transfer state in Panel
- Handles transfer success/failure

**⏰ When it's called:**

- After server transfer completes
- When transfer fails
- During transfer state updates

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) SetTransferStatus(ctx context.Context, uuid string, successful bool) error {
    state := "failure"
    if successful {
        state = "success"
    }
    resp, err := c.Post(ctx, fmt.Sprintf("/servers/%s/transfer/%s", uuid, state), nil)
    return err
}
```

---

## 5. SFTP Authentication

### POST `/api/remote/sftp/auth`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `ValidateSftpCredentials()` (lines 132-148)
- Called by: SFTP connection attempts

**🎯 What it does:**

- Validates SFTP user credentials
- Returns server access permissions
- Handles SFTP authentication security

**⏰ When it's called:**

- On every SFTP connection attempt
- When users try to access server files
- During SFTP session establishment

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) ValidateSftpCredentials(ctx context.Context, request SftpAuthRequest) (SftpAuthResponse, error) {
    var auth SftpAuthResponse
    res, err := c.Post(ctx, "/sftp/auth", request)
    err = res.BindJSON(&auth)
    return auth, err
}
```

**📋 Request Structure:**

```json
{
  "type": "password",
  "username": "user123",
  "password": "password123",
  "ip": "192.168.1.100",
  "session_id": "session-uuid",
  "client_version": "SSH-2.0-OpenSSH_8.2p1"
}
```

**📋 Response Structure:**

```json
{
  "server": "550e8400-e29b-41d4-a716-446655440000",
  "user": "user-uuid",
  "permissions": ["sftp.read", "sftp.write"]
}
```

---

## 6. Activity Logging

### POST `/api/remote/activity`

**📍 Location in Wings:**

- File: `remote/servers.go`
- Function: `SendActivityLogs()` (lines 184-190)
- Called by: Activity logging system

**🎯 What it does:**

- Sends activity logs to Panel
- Tracks user actions and system events
- Provides audit trail for server operations

**⏰ When it's called:**

- After user actions (start/stop/restart)
- On system events (crashes, installations)
- Periodically for activity tracking

**🔧 How it works:**

```go
// From remote/servers.go
func (c *client) SendActivityLogs(ctx context.Context, activity []models.Activity) error {
    resp, err := c.Post(ctx, "/activity", d{"data": activity})
    return err
}
```

**📋 Request Structure:**

```json
{
  "data": [
    {
      "server": "550e8400-e29b-41d4-a716-446655440000",
      "event": "server:power.start",
      "metadata": {
        "user": "user-uuid",
        "ip": "192.168.1.100"
      },
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

---

## Implementation Priority

### 🔴 Critical (Must Implement)

1. `GET /api/application/nodes/{id}/configuration` - Wings setup
2. `GET /api/remote/servers/{uuid}` - Server configuration
3. `POST /api/remote/servers/{uuid}/container/status` - State updates
4. `POST /api/remote/sftp/auth` - SFTP authentication

### 🟡 Important (Should Implement)

5. `GET /api/remote/servers` - Server listing
6. `GET /api/remote/servers/{uuid}/install` - Installation
7. `POST /api/remote/servers/{uuid}/install` - Install status
8. `POST /api/remote/servers/reset` - State reset

### 🟢 Optional (Nice to Have)

9. Backup management endpoints
10. Transfer management endpoints
11. Activity logging endpoint

---

## Error Handling

All endpoints should return errors in this standardized format:

```json
{
  "errors": [
    {
      "code": "HttpNotFoundException",
      "status": "404",
      "detail": "The requested resource does not exist."
    }
  ]
}
```

Wings will automatically retry failed requests with exponential backoff, except for 4XX errors which indicate client mistakes.
