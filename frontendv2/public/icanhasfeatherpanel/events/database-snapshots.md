# Events: DatabaseSnapshots

4 events in this category.

### `featherpanel:database:snapshot:created`

- **Method:** `onSnapshotCreated`
- **Emitted:** yes
- **Callback docs:** string filename, int size, string user uuid.
- **Data keys:** `filename`, `size`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/DatabaseSnapshotsController.php`

### `featherpanel:database:snapshot:deleted`

- **Method:** `onSnapshotDeleted`
- **Emitted:** yes
- **Callback docs:** string filename, string user uuid.
- **Data keys:** `filename`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/DatabaseSnapshotsController.php`

### `featherpanel:database:snapshot:downloaded`

- **Method:** `onSnapshotDownloaded`
- **Emitted:** yes
- **Callback docs:** string filename, string user uuid.
- **Data keys:** `filename`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/DatabaseSnapshotsController.php`

### `featherpanel:database:snapshot:restored`

- **Method:** `onSnapshotRestored`
- **Emitted:** yes
- **Callback docs:** string filename, string user uuid.
- **Data keys:** `filename`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/DatabaseSnapshotsController.php`

