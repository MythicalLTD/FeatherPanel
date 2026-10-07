# Events: Roles

7 events in this category.

### `featherpanel:admin:roles:role:created`

- **Method:** `onRoleCreated`
- **Emitted:** yes
- **Callback docs:** array role data.
- **Data keys:** `created_by`, `role`

**Source files**

- `backend/app/Controllers/Admin/RolesController.php`

### `featherpanel:admin:roles:role:deleted`

- **Method:** `onRoleDeleted`
- **Emitted:** yes
- **Callback docs:** int role id, array role data.
- **Data keys:** `deleted_by`, `role`

**Source files**

- `backend/app/Controllers/Admin/RolesController.php`

### `featherpanel:admin:roles:role:not:found`

- **Method:** `onRoleNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int role id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:roles:role:retrieved`

- **Method:** `onRoleRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int role id, array role data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:roles:error`

- **Method:** `onRolesError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:roles:retrieved`

- **Method:** `onRolesRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array roles list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:roles:role:updated`

- **Method:** `onRoleUpdated`
- **Emitted:** yes
- **Callback docs:** int role id, array old data, array new data.
- **Data keys:** `role`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/RolesController.php`

