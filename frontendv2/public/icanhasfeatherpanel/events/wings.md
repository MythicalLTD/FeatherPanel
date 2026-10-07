# Events: Wings

22 events in this category.

### `featherpanel:wings:activity:logged`

- **Method:** `onWingsActivityLogged`
- **Emitted:** yes
- **Callback docs:** array activity data.
- **Data keys:** `activities`, `error_count`, `errors`, `node`, `processed_count`

**Source files**

- `backend/app/Controllers/Wings/Activity/WingsActivityController.php`

### `featherpanel:wings:backup:completion:reported`

- **Method:** `onWingsBackupCompletionReported`
- **Emitted:** yes
- **Callback docs:** string backup uuid, array completion data.
- **Data keys:** `backup`, `backup_uuid`, `completion_data`, `node`, `server`

**Source files**

- `backend/app/Controllers/Wings/Backup/WingsBackupController.php`

### `featherpanel:wings:backup:restoration:reported`

- **Method:** `onWingsBackupRestorationReported`
- **Emitted:** yes
- **Callback docs:** string backup uuid, array restoration data.
- **Data keys:** `backup`, `backup_uuid`, `node`, `restoration_data`, `server`

**Source files**

- `backend/app/Controllers/Wings/Backup/WingsBackupController.php`

### `featherpanel:wings:backup:upload:info:retrieved`

- **Method:** `onWingsBackupUploadInfoRetrieved`
- **Emitted:** yes
- **Callback docs:** string backup uuid, array upload info.
- **Data keys:** `backup`, `backup_uuid`, `node`, `part_size`, `parts`, `server`, `total_size`, `upload_info`

**Source files**

- `backend/app/Controllers/Wings/Backup/WingsBackupController.php`

### `featherpanel:wings:docker:disk:usage:retrieved`

- **Method:** `onWingsDockerDiskUsageRetrieved`
- **Emitted:** yes
- **Callback docs:** int node id, array disk usage data.
- **Data keys:** `docker_disk_usage`, `node`, `node_id`

**Source files**

- `backend/app/Controllers/Wings/WingsAdminController.php`

### `featherpanel:wings:docker:prune:completed`

- **Method:** `onWingsDockerPruneCompleted`
- **Emitted:** yes
- **Callback docs:** int node id, array prune results.
- **Data keys:** `docker_prune`, `node`, `node_id`

**Source files**

- `backend/app/Controllers/Wings/WingsAdminController.php`

### `featherpanel:wings:error`

- **Method:** `onWingsError`
- **Emitted:** yes
- **Callback docs:** string error message, array context.
- **Data keys:** `error`, `message`, `server_uuid`, `token_id`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerInfoController.php`
- `backend/app/Middleware/WingsMiddleware.php`

### `featherpanel:wings:node:connection:status`

- **Method:** `onWingsNodeConnectionStatus`
- **Emitted:** yes
- **Callback docs:** int node id, string status.
- **Data keys:** `node_id`, `status`, `token_id`

**Source files**

- `backend/app/Controllers/Wings/WingsHealthController.php`
- `backend/app/Middleware/WingsMiddleware.php`

### `featherpanel:wings:node:error`

- **Method:** `onWingsNodeError`
- **Emitted:** yes
- **Callback docs:** int node id, string error message.
- **Data keys:** `error`, `node_id`

**Source files**

- `backend/app/Controllers/Wings/WingsHealthController.php`

### `featherpanel:wings:node:ips:retrieved`

- **Method:** `onWingsNodeIpsRetrieved`
- **Emitted:** yes
- **Callback docs:** int node id, array ip addresses.
- **Data keys:** `ips`, `node`, `node_id`

**Source files**

- `backend/app/Controllers/Wings/WingsAdminController.php`

### `featherpanel:wings:node:system:info:retrieved`

- **Method:** `onWingsNodeSystemInfoRetrieved`
- **Emitted:** yes
- **Callback docs:** int node id, array system info.
- **Data keys:** `node`, `node_id`, `system_info`

**Source files**

- `backend/app/Controllers/Wings/WingsAdminController.php`

### `featherpanel:wings:node:utilization:retrieved`

- **Method:** `onWingsNodeUtilizationRetrieved`
- **Emitted:** yes
- **Callback docs:** int node id, array utilization data.
- **Data keys:** `node`, `node_id`, `utilization`

**Source files**

- `backend/app/Controllers/Wings/WingsAdminController.php`

### `featherpanel:wings:servers:remote:retrieved`

- **Method:** `onWingsRemoteServersRetrieved`
- **Emitted:** yes
- **Callback docs:** array servers list.
- **Data keys:** `node`, `pagination`, `servers`, `total`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerListController.php`

### `featherpanel:wings:server:connection:status`

- **Method:** `onWingsServerConnectionStatus`
- **Emitted:** yes
- **Callback docs:** string server uuid, string status.
- **Data keys:** `node_id`, `server_uuid`, `status`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerStatusController.php`

### `featherpanel:wings:server:error`

- **Method:** `onWingsServerError`
- **Emitted:** yes
- **Callback docs:** string server uuid, string error message.
- **Data keys:** `error`, `server_uuid`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerInfoController.php`

### `featherpanel:wings:server:info:retrieved`

- **Method:** `onWingsServerInfoRetrieved`
- **Emitted:** yes
- **Callback docs:** string server uuid, array server info.
- **Data keys:** `allocation`, `node`, `realm`, `server`, `server_uuid`, `spell`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerInfoController.php`

### `featherpanel:wings:server:install:completed`

- **Method:** `onWingsServerInstallCompleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, array install results.
- **Data keys:** `installed_at`, `node`, `reinstall`, `server`, `server_uuid`, `status`, `successful`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerInstallController.php`

### `featherpanel:wings:server:install:retrieved`

- **Method:** `onWingsServerInstallRetrieved`
- **Emitted:** yes
- **Callback docs:** string server uuid, array install data.
- **Data keys:** `install_config`, `node`, `server`, `server_uuid`, `spell`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerInstallController.php`

### `featherpanel:wings:servers:reset:completed`

- **Method:** `onWingsServersResetCompleted`
- **Emitted:** yes
- **Callback docs:** array reset results.
- **Data keys:** `node`, `queued_auto_starts`, `reset_result`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServersResetController.php`

### `featherpanel:wings:server:status:retrieved`

- **Method:** `onWingsServerStatusRetrieved`
- **Emitted:** yes
- **Callback docs:** string server uuid, array status data.
- **Data keys:** `node`, `server`, `server_uuid`, `state`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerStatusController.php`

### `featherpanel:wings:server:status:updated`

- **Method:** `onWingsServerStatusUpdated`
- **Emitted:** yes
- **Callback docs:** string server uuid, array status data.
- **Data keys:** `new_state`, `node`, `old_state`, `server`, `server_uuid`, `update_data`

**Source files**

- `backend/app/Controllers/Wings/Server/WingsServerStatusController.php`

### `featherpanel:wings:sftp:authentication`

- **Method:** `onWingsSftpAuthentication`
- **Emitted:** yes
- **Callback docs:** array auth data.
- **Data keys:** `auth_type`, `client_version`, `ip`, `permissions`, `server`, `session_id`, `user`

**Source files**

- `backend/app/Controllers/Wings/Sftp/SftpAuthController.php`

