# Events: BackupPolicy

5 events in this category.

### `featherpanel:admin:backup_policy:created`

- **Method:** `onBackupPolicyCreated`
- **Emitted:** yes
- **Callback docs:** No parameters
- **Data keys:** `created_by`, `policy`

**Source files**

- `backend/app/Controllers/Admin/BackupSchedulesController.php`

### `featherpanel:admin:backup_policy:deleted`

- **Method:** `onBackupPolicyDeleted`
- **Emitted:** yes
- **Callback docs:** No parameters
- **Data keys:** `deleted_by`, `policy`

**Source files**

- `backend/app/Controllers/Admin/BackupSchedulesController.php`

### `featherpanel:admin:backup_policy:run:completed`

- **Method:** `onBackupPolicyRunCompleted`
- **Emitted:** yes
- **Callback docs:** No parameters
- **Data keys:** `manual`, `policy`, `result`

**Source files**

- `backend/app/Controllers/Admin/BackupSchedulesController.php`

### `featherpanel:admin:backup_policy:run:started`

- **Method:** `onBackupPolicyRunStarted`
- **Emitted:** yes
- **Callback docs:** No parameters
- **Data keys:** `manual`, `policy`, `triggered_by`

**Source files**

- `backend/app/Controllers/Admin/BackupSchedulesController.php`

### `featherpanel:admin:backup_policy:updated`

- **Method:** `onBackupPolicyUpdated`
- **Emitted:** yes
- **Callback docs:** No parameters
- **Data keys:** `policy`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/BackupSchedulesController.php`

