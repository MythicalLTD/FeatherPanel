# Events: User

10 events in this category.

### `featherpanel:user:api_client:created`

- **Method:** `onUserApiKeyCreated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string api key id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:api_client:deleted`

- **Method:** `onUserApiKeyDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string api key id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:api_client:updated`

- **Method:** `onUserApiKeyUpdated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string api key id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:created`

- **Method:** `onUserCreated`
- **Emitted:** yes
- **Callback docs:** array user data, int user id, array created by.
- **Data keys:** `created_by`, `user`, `user_id`, `uuid`

**Source files**

- `backend/app/Controllers/Admin/PterodactylImporterController.php`
- `backend/app/Controllers/Admin/UsersController.php`

### `featherpanel:user:deleted`

- **Method:** `onUserDeleted`
- **Emitted:** yes
- **Callback docs:** array user data, array deleted by.
- **Data keys:** `deleted_by`, `user`

**Source files**

- `backend/app/Services/User/UserDeletionService.php`

### `featherpanel:user:ssh_key:created`

- **Method:** `onUserSshKeyCreated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string ssh key id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:ssh_key:deleted`

- **Method:** `onUserSshKeyDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string ssh key id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:ssh_key:updated`

- **Method:** `onUserSshKeyUpdated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string ssh key id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:update`

- **Method:** `onUserUpdate`
- **Emitted:** yes
- **Callback docs:** string user uuid.
- **Data keys:** `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/SessionController.php`

### `featherpanel:user:updated`

- **Method:** `onUserUpdated`
- **Emitted:** yes
- **Callback docs:** array user data, array updated data, array updated by.
- **Data keys:** `ban_reason`, `mail_verify`, `updated_by`, `updated_data`, `user`

**Source files**

- `backend/app/Controllers/Admin/UsersController.php`

