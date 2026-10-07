# Events: DatabaseManagement

3 events in this category.

### `featherpanel:admin:database_management:error`

- **Method:** `onDatabaseManagementError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:database_management:migrations:executed`

- **Method:** `onMigrationsExecuted`
- **Emitted:** yes
- **Callback docs:** array migration results.
- **Data keys:** `executed`, `executed_by`, `failed`, `skipped`, `total_time`

**Source files**

- `backend/app/Controllers/Admin/DatabaseManagmentController.php`

### `featherpanel:admin:database_management:status:retrieved`

- **Method:** `onStatusRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array status data.
- **Data keys:** _none_

**Source files**

- _none_

