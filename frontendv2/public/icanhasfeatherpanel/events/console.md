# Events: Console

3 events in this category.

### `featherpanel:admin:console:command:executed`

- **Method:** `onCommandExecuted`
- **Emitted:** yes
- **Callback docs:** string command, array execution data.
- **Data keys:** `command`, `executed_by`, `execution_time`, `return_code`, `working_directory`

**Source files**

- `backend/app/Controllers/Admin/ConsoleController.php`

### `featherpanel:admin:console:error`

- **Method:** `onConsoleError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:console:system_info:retrieved`

- **Method:** `onSystemInfoRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array system info.
- **Data keys:** _none_

**Source files**

- _none_

