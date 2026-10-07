# Events: FeatherZeroTrust

7 events in this category.

### `featherpanel:admin:featherzerotrust:config:retrieved`

- **Method:** `onFeatherZeroTrustConfigRetrieved`
- **Emitted:** yes
- **Callback docs:** array config data.
- **Data keys:** `config`

**Source files**

- `backend/app/Controllers/Admin/FeatherZeroTrustController.php`

### `featherpanel:admin:featherzerotrust:config:updated`

- **Method:** `onFeatherZeroTrustConfigUpdated`
- **Emitted:** yes
- **Callback docs:** array old config, array new config.
- **Data keys:** `new_config`, `old_config`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/FeatherZeroTrustController.php`

### `featherpanel:admin:featherzerotrust:error`

- **Method:** `onFeatherZeroTrustError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:featherzerotrust:logs:retrieved`

- **Method:** `onFeatherZeroTrustLogsRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array logs data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:featherzerotrust:scan:completed`

- **Method:** `onFeatherZeroTrustScanCompleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, array scan results.
- **Data keys:** `detections_count`, `scan_results`, `server_uuid`

**Source files**

- `backend/app/Controllers/Admin/FeatherZeroTrustController.php`

### `featherpanel:admin:featherzerotrust:scan:error`

- **Method:** `onFeatherZeroTrustScanError`
- **Emitted:** no (defined only)
- **Callback docs:** string server uuid, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:featherzerotrust:scan:started`

- **Method:** `onFeatherZeroTrustScanStarted`
- **Emitted:** yes
- **Callback docs:** string server uuid, array scan data.
- **Data keys:** `directory`, `max_depth`, `server_uuid`, `started_by`

**Source files**

- `backend/app/Controllers/Admin/FeatherZeroTrustController.php`

