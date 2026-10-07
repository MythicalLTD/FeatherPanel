# Events: Quilld

8 events in this category.

### `featherpanel:quilld:activity:logged`

- **Method:** `onQuilldActivityLogged`
- **Emitted:** yes
- **Callback docs:** array activity.
- **Data keys:** `processed_count`

**Source files**

- `backend/app/Controllers/Quilld/QuilldActivityController.php`

### `featherpanel:quilld:config:retrieved`

- **Method:** `onQuilldConfigRetrieved`
- **Emitted:** yes
- **Callback docs:** array config.
- **Data keys:** `panel_url`, `web_node_id`

**Source files**

- `backend/app/Controllers/Quilld/FeatherQuilldConfigController.php`

### `featherpanel:quilld:install:completed`

- **Method:** `onQuilldInstallCompleted`
- **Emitted:** yes
- **Callback docs:** array webspace.
- **Data keys:** `reinstall`, `status`, `successful`, `webspace`

**Source files**

- `backend/app/Controllers/Quilld/FeatherQuilldWebSpaceController.php`

### `featherpanel:quilld:install:retrieved`

- **Method:** `onQuilldInstallRetrieved`
- **Emitted:** yes
- **Callback docs:** array webspace, array install.
- **Data keys:** `install`, `webspace`

**Source files**

- `backend/app/Controllers/Quilld/FeatherQuilldWebSpaceController.php`

### `featherpanel:quilld:sftp:authenticated`

- **Method:** `onQuilldSftpAuthenticated`
- **Emitted:** yes
- **Callback docs:** array auth context.
- **Data keys:** `permissions`, `user_uuid`, `webspace_uuid`

**Source files**

- `backend/app/Controllers/Quilld/Sftp/SftpAuthController.php`

### `featherpanel:quilld:transfer:status`

- **Method:** `onQuilldTransferStatusReported`
- **Emitted:** yes
- **Callback docs:** array transfer.
- **Data keys:** `error`, `successful`, `webspace_uuid`

**Source files**

- `backend/app/Controllers/Quilld/FeatherQuilldTransferController.php`

### `featherpanel:quilld:webspace:retrieved`

- **Method:** `onQuilldWebSpaceRetrieved`
- **Emitted:** yes
- **Callback docs:** array webspace.
- **Data keys:** `webspace`

**Source files**

- `backend/app/Controllers/Quilld/FeatherQuilldWebSpaceController.php`

### `featherpanel:quilld:webspace:updated`

- **Method:** `onQuilldWebSpaceUpdated`
- **Emitted:** yes
- **Callback docs:** array webspace.
- **Data keys:** `webspace`

**Source files**

- `backend/app/Controllers/Quilld/FeatherQuilldWebSpaceController.php`

