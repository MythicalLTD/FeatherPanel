# Events: ServerAllocation

3 events in this category.

### `featherpanel:user:server:allocation:deleted`

- **Method:** `onServerAllocationDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, int allocation id.
- **Data keys:** `allocation_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerAllocationController.php`
- `backend/app/Services/Chatbot/Tools/DeleteAllocationTool.php`

### `featherpanel:user:server:allocation:error`

- **Method:** `onServerAllocationError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:allocation:set_primary`

- **Method:** `onServerAllocationSetPrimary`
- **Emitted:** yes
- **Callback docs:** string server uuid, int allocation id, bool is_primary.
- **Data keys:** `allocation_id`, `is_primary`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerAllocationController.php`
- `backend/app/Services/Chatbot/Tools/SetPrimaryAllocationTool.php`

