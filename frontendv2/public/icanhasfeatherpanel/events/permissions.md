# Events: Permissions

7 events in this category.

### `featherpanel:admin:permissions:permission:created`

- **Method:** `onPermissionCreated`
- **Emitted:** yes
- **Callback docs:** array permission data.
- **Data keys:** `created_by`, `permission`

**Source files**

- `backend/app/Controllers/Admin/PermissionsController.php`

### `featherpanel:admin:permissions:permission:deleted`

- **Method:** `onPermissionDeleted`
- **Emitted:** yes
- **Callback docs:** int permission id, array permission data.
- **Data keys:** `deleted_by`, `permission`

**Source files**

- `backend/app/Controllers/Admin/PermissionsController.php`

### `featherpanel:admin:permissions:permission:not:found`

- **Method:** `onPermissionNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int permission id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:permissions:permission:retrieved`

- **Method:** `onPermissionRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int permission id, array permission data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:permissions:error`

- **Method:** `onPermissionsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:permissions:retrieved`

- **Method:** `onPermissionsRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array permissions list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:permissions:permission:updated`

- **Method:** `onPermissionUpdated`
- **Emitted:** yes
- **Callback docs:** int permission id, array old data, array new data.
- **Data keys:** `permission`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/PermissionsController.php`

