# Events: Mounts

3 events in this category.

### `featherpanel:admin:mounts:mount:created`

- **Method:** `onMountCreated`
- **Emitted:** yes
- **Callback docs:** array mount data.
- **Data keys:** `created_by`, `mount`, `mount_id`

**Source files**

- `backend/app/Controllers/Admin/MountsController.php`

### `featherpanel:admin:mounts:mount:deleted`

- **Method:** `onMountDeleted`
- **Emitted:** yes
- **Callback docs:** int mount id, array mount data.
- **Data keys:** `deleted_by`, `mount_id`

**Source files**

- `backend/app/Controllers/Admin/MountsController.php`

### `featherpanel:admin:mounts:mount:updated`

- **Method:** `onMountUpdated`
- **Emitted:** yes
- **Callback docs:** int mount id, array mount data.
- **Data keys:** `mount`, `mount_id`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/MountsController.php`

