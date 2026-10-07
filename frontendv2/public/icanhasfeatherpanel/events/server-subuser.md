# Events: ServerSubuser

4 events in this category.

### `featherpanel:user:server:subuser:created`

- **Method:** `onServerSubuserCreated`
- **Emitted:** yes
- **Callback docs:** string server uuid, array subuser data.
- **Data keys:** `server_uuid`, `subuser_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/SubuserController.php`

### `featherpanel:user:server:subuser:deleted`

- **Method:** `onServerSubuserDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, int subuser id.
- **Data keys:** `server_uuid`, `subuser_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/SubuserController.php`

### `featherpanel:user:server:subuser:error`

- **Method:** `onServerSubuserError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:subuser:updated`

- **Method:** `onServerSubuserUpdated`
- **Emitted:** yes
- **Callback docs:** string server uuid, int subuser id, array updated data.
- **Data keys:** `server_uuid`, `subuser_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/SubuserController.php`

