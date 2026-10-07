# Events: UserSshKey

4 events in this category.

### `featherpanel:user:ssh_key:created`

- **Method:** `onUserSshKeyCreated`
- **Emitted:** yes
- **Callback docs:** array ssh_key data.
- **Data keys:** `created_by`, `ssh_key`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/PterodactylImporterController.php`
- `backend/app/Controllers/User/User/UserSshKeyController.php`

### `featherpanel:user:ssh_key:deleted`

- **Method:** `onUserSshKeyDeleted`
- **Emitted:** yes
- **Callback docs:** int ssh_key id, array ssh_key data.
- **Data keys:** `action`, `ssh_key`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/UserSshKeyController.php`

### `featherpanel:user:ssh_key:error`

- **Method:** `onUserSshKeyError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:ssh_key:updated`

- **Method:** `onUserSshKeyUpdated`
- **Emitted:** yes
- **Callback docs:** int ssh_key id, array updated data.
- **Data keys:** `action`, `ssh_key`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/UserSshKeyController.php`

