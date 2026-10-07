# Events: ServerTask

5 events in this category.

### `featherpanel:user:server:task:created`

- **Method:** `onServerTaskCreated`
- **Emitted:** yes
- **Callback docs:** string server uuid, int schedule id, array task data.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/TaskController.php`

### `featherpanel:user:server:task:deleted`

- **Method:** `onServerTaskDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, int schedule id, int task id.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/TaskController.php`

### `featherpanel:user:server:task:error`

- **Method:** `onServerTaskError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:task:sequence:updated`

- **Method:** `onServerTaskSequenceUpdated`
- **Emitted:** yes
- **Callback docs:** string server uuid, int schedule id, int task id, array new sequence.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/TaskController.php`

### `featherpanel:user:server:task:updated`

- **Method:** `onServerTaskUpdated`
- **Emitted:** yes
- **Callback docs:** string server uuid, int schedule id, int task id, array updated data.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/TaskController.php`

