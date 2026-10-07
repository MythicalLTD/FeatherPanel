# Events: ServerDatabase

4 events in this category.

### `featherpanel:user:server:database:created`

- **Method:** `onServerDatabaseCreated`
- **Emitted:** yes
- **Callback docs:** string server uuid, array database data.
- **Data keys:** `database_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerDatabaseController.php`

### `featherpanel:user:server:database:deleted`

- **Method:** `onServerDatabaseDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, int database id.
- **Data keys:** `bulk`, `database_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerDatabaseController.php`

### `featherpanel:user:server:database:error`

- **Method:** `onServerDatabaseError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:database:updated`

- **Method:** `onServerDatabaseUpdated`
- **Emitted:** yes
- **Callback docs:** string server uuid, int database id, array updated data.
- **Data keys:** `database_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerDatabaseController.php`

