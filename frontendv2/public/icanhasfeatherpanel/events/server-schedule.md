# Events: ServerSchedule

5 events in this category.

### `featherpanel:user:server:schedule:created`

- **Method:** `onServerScheduleCreated`
- **Emitted:** yes
- **Callback docs:** string server uuid, array schedule data.
- **Data keys:** `schedule_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerScheduleController.php`

### `featherpanel:user:server:schedule:deleted`

- **Method:** `onServerScheduleDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, int schedule id.
- **Data keys:** `schedule_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerScheduleController.php`

### `featherpanel:user:server:schedule:error`

- **Method:** `onServerScheduleError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:schedule:triggered`

- **Method:** `onServerScheduleTriggered`
- **Emitted:** no (defined only)
- **Callback docs:** string server uuid, int schedule id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:schedule:updated`

- **Method:** `onServerScheduleUpdated`
- **Emitted:** yes
- **Callback docs:** string server uuid, int schedule id, array updated data.
- **Data keys:** `schedule_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerScheduleController.php`

