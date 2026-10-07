# Events: Databases

11 events in this category.

### `featherpanel:admin:databases:database:connection:error`

- **Method:** `onDatabaseConnectionError`
- **Emitted:** no (defined only)
- **Callback docs:** int database id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:connection:tested`

- **Method:** `onDatabaseConnectionTested`
- **Emitted:** no (defined only)
- **Callback docs:** array connection data, array test results.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:database:created`

- **Method:** `onDatabaseCreated`
- **Emitted:** yes
- **Callback docs:** array database data.
- **Data keys:** `created_by`, `database_data`, `database_id`

**Source files**

- `backend/app/Controllers/Admin/DatabasesController.php`

### `featherpanel:admin:databases:database:deleted`

- **Method:** `onDatabaseDeleted`
- **Emitted:** yes
- **Callback docs:** int database id, array database data.
- **Data keys:** `database`, `deleted_by`

**Source files**

- `backend/app/Controllers/Admin/DatabasesController.php`

### `featherpanel:admin:databases:database:health:checked`

- **Method:** `onDatabaseHealthChecked`
- **Emitted:** no (defined only)
- **Callback docs:** int database id, array health data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:database:not:found`

- **Method:** `onDatabaseNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int database id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:database:retrieved`

- **Method:** `onDatabaseRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int database id, array database data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:by:node:retrieved`

- **Method:** `onDatabasesByNodeRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int node id, array databases.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:error`

- **Method:** `onDatabasesError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:retrieved`

- **Method:** `onDatabasesRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array databases list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:databases:database:updated`

- **Method:** `onDatabaseUpdated`
- **Emitted:** yes
- **Callback docs:** int database id, array old data, array new data.
- **Data keys:** `database`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/DatabasesController.php`

