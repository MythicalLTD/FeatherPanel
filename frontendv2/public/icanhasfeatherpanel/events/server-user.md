# Events: ServerUser

3 events in this category.

### `featherpanel:user:server:deleted`

- **Method:** `onServerUserDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string server uuid.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:error`

- **Method:** `onServerUserError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:updated`

- **Method:** `onServerUserUpdated`
- **Emitted:** yes
- **Callback docs:** string server uuid, array updated data.
- **Data keys:** `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerUserController.php`

