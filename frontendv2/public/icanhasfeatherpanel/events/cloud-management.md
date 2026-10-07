# Events: CloudManagement

5 events in this category.

### `featherpanel:admin:cloud:credentials:retrieved`

- **Method:** `onCloudCredentialsRetrieved`
- **Emitted:** yes
- **Callback docs:** array credentials data.
- **Data keys:** `credentials`

**Source files**

- `backend/app/Controllers/Admin/CloudManagementController.php`

### `featherpanel:admin:cloud:credentials:rotated`

- **Method:** `onCloudCredentialsRotated`
- **Emitted:** yes
- **Callback docs:** string credential type.
- **Data keys:** `credential_type`, `rotated_by`

**Source files**

- `backend/app/Controllers/Admin/CloudManagementController.php`

### `featherpanel:admin:cloud:cloud:credentials:stored`

- **Method:** `onCloudCredentialsStored`
- **Emitted:** yes
- **Callback docs:** array credentials data.
- **Data keys:** `credentials`, `last_rotated_at`, `mythic_user_id`, `private_key`, `public_key`, `source`, `stored_by`, `team_uuid`

**Source files**

- `backend/app/Controllers/Admin/CloudManagementController.php`

### `featherpanel:admin:cloud:error`

- **Method:** `onCloudManagementError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:cloud:panel:credentials:stored`

- **Method:** `onPanelCredentialsStored`
- **Emitted:** yes
- **Callback docs:** array credentials data.
- **Data keys:** `credentials`, `last_rotated_at`, `private_key`, `public_key`, `stored_by`

**Source files**

- `backend/app/Controllers/Admin/CloudManagementController.php`

