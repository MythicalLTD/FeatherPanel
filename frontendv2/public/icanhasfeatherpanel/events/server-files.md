# Events: ServerFiles

7 events in this category.

### `featherpanel:user:server:directory:created`

- **Method:** `onServerDirectoryCreated`
- **Emitted:** yes
- **Callback docs:** string server uuid, string directory path.
- **Data keys:** `directory_path`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`
- `backend/app/Services/Chatbot/Tools/CreateDirectoryTool.php`

### `featherpanel:user:server:file:renamed`

- **Method:** `onServerFileRenamed`
- **Emitted:** yes
- **Callback docs:** string server uuid, string file path.
- **Data keys:** `file_path`, `files`, `new_path`, `root`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`
- `backend/app/Services/Chatbot/Tools/RenameFileTool.php`

### `featherpanel:user:server:file:saved`

- **Method:** `onServerFileSaved`
- **Emitted:** yes
- **Callback docs:** string server uuid, string file path, int size.
- **Data keys:** `file_path`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`
- `backend/app/Services/Chatbot/Tools/WriteFileTool.php`

### `featherpanel:user:server:files:deleted`

- **Method:** `onServerFilesDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, array files deleted.
- **Data keys:** `files`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`
- `backend/app/Services/Chatbot/Tools/DeleteFilesTool.php`

### `featherpanel:user:server:files:error`

- **Method:** `onServerFilesError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:file:uploaded`

- **Method:** `onServerFileUploaded`
- **Emitted:** yes
- **Callback docs:** string server uuid, array file data.
- **Data keys:** `file_path`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`

### `featherpanel:user:server:pull:deleted`

- **Method:** `onServerPullProcessDeleted`
- **Emitted:** yes
- **Callback docs:** string server uuid, string pull id.
- **Data keys:** `pull_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`

