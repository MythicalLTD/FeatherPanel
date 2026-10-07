# Events: ServerBackup

5 events in this category.

### `featherpanel:user:server:backup:created`

- **Method:** `onServerBackupCreated`
- **Emitted:** yes
- **Callback docs:** string server uuid, array backup data.
- **Data keys:** `backup_data`, `backup_uuid`, `id`, `name`, `server_uuid`, `type`, `user_uuid`, `uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerBackupController.php`
- `backend/app/Services/Chatbot/Tools/CreateBackupTool.php`

### `featherpanel:user:server:backup:deleted`

- **Method:** `onServerBackupDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, string backup uuid.
- **Data keys:** `backup_uuid`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerBackupController.php`
- `backend/app/Services/Chatbot/Tools/DeleteBackupTool.php`

### `featherpanel:user:server:backup:downloaded`

- **Method:** `onServerBackupDownloaded`
- **Emitted:** no (defined only)
- **Callback docs:** string server uuid, string backup uuid, string download url.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:backup:error`

- **Method:** `onServerBackupError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:backup:restored`

- **Method:** `onServerBackupRestored`
- **Emitted:** yes
- **Callback docs:** string server uuid, string backup uuid.
- **Data keys:** `backup_uuid`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerBackupController.php`

