# Events: Server

51 events in this category.

### `featherpanel:server:allocation:create`

- **Method:** `onServerAllocationCreated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int allocation id.
- **Data keys:** `allocation_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerAllocationController.php`
- `backend/app/Services/Chatbot/Tools/AutoAllocateTool.php`

### `featherpanel:user:server:allocation:deleted`

- **Method:** `onServerAllocationDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, int allocation id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:allocation:update`

- **Method:** `onServerAllocationUpdated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, int allocation id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:backup:created`

- **Method:** `onServerBackupCreated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string backup uuid.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:backup:deleted`

- **Method:** `onServerBackupDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string backup uuid.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:backup:lock`

- **Method:** `onServerBackupLocked`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string backup uuid.
- **Data keys:** `backup_uuid`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerBackupController.php`

### `featherpanel:user:server:backup:restored`

- **Method:** `onServerBackupRestored`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string backup uuid.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:backup:unlock`

- **Method:** `onServerBackupUnlocked`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string backup uuid.
- **Data keys:** `backup_uuid`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerBackupController.php`

### `featherpanel:server:created`

- **Method:** `onServerCreated`
- **Emitted:** yes
- **Callback docs:** int server id, array server data, array created by.
- **Data keys:** `created_by`, `server_data`, `server_id`

**Source files**

- `backend/app/Controllers/Admin/PterodactylImporterController.php`
- `backend/app/Controllers/Admin/ServersController.php`

### `featherpanel:user:server:database:created`

- **Method:** `onServerDatabaseCreated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int database id.
- **Data keys:** `database_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/CreateDatabaseTool.php`

### `featherpanel:user:server:database:deleted`

- **Method:** `onServerDatabaseDeleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int database id.
- **Data keys:** `database_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/DeleteDatabaseTool.php`

### `featherpanel:user:server:database:updated`

- **Method:** `onServerDatabaseUpdated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int database id.
- **Data keys:** `database_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/UpdateDatabaseTool.php`

### `featherpanel:server:delete`

- **Method:** `onServerDeleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid.
- **Data keys:** `deleted_by`, `hard_delete`, `server`

**Source files**

- `backend/app/Controllers/Admin/ServersController.php`
- `backend/app/Controllers/User/Server/ServerUserController.php`

### `featherpanel:user:server:directory:created`

- **Method:** `onServerDirectoryCreated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string directory path.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:file:compress`

- **Method:** `onServerFileCompressed`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string file path.
- **Data keys:** `file_path`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`
- `backend/app/Services/Chatbot/Tools/CompressFilesTool.php`

### `featherpanel:server:file:decompress`

- **Method:** `onServerFileDecompressed`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string file path.
- **Data keys:** `file_path`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`
- `backend/app/Services/Chatbot/Tools/DecompressArchiveTool.php`

### `featherpanel:server:file:permissions`

- **Method:** `onServerFilePermissionsChanged`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string file path, string permissions.
- **Data keys:** `file_path`, `permissions`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`

### `featherpanel:user:server:file:renamed`

- **Method:** `onServerFileRenamed`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string old path, string new path.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:files:copy`

- **Method:** `onServerFilesCopied`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, array file paths.
- **Data keys:** `file_paths`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Files/ServerFilesController.php`
- `backend/app/Services/Chatbot/Tools/CopyFilesTool.php`

### `featherpanel:user:server:files:deleted`

- **Method:** `onServerFilesDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:file:uploaded`

- **Method:** `onServerFileUploaded`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string file path.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:file:saved`

- **Method:** `onServerFileWritten`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string file path.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:lifecycle-hook:completed`

- **Method:** `onServerLifecycleHookCompleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string power action, int hook id, string hook type.
- **Data keys:** _none_

**Source files**

- `backend/app/Services/Server/LifecycleHookExecutorService.php`

### `featherpanel:server:lifecycle-hook:failed`

- **Method:** `onServerLifecycleHookFailed`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string power action, int hook id, string hook type, string error.
- **Data keys:** _none_

**Source files**

- `backend/app/Services/Server/LifecycleHookExecutorService.php`

### `featherpanel:server:lifecycle-hook:started`

- **Method:** `onServerLifecycleHookStarted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string power action, int hook id, string hook type.
- **Data keys:** _none_

**Source files**

- `backend/app/Services/Server/LifecycleHookExecutorService.php`

### `featherpanel:server:lifecycle-hook:step:completed`

- **Method:** `onServerLifecycleHookStepCompleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string power action, int hook id, int step id, string task type.
- **Data keys:** _none_

**Source files**

- `backend/app/Services/Server/LifecycleHookExecutorService.php`

### `featherpanel:server:lifecycle-hook:step:failed`

- **Method:** `onServerLifecycleHookStepFailed`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string power action, int hook id, int step id, string task type, string error.
- **Data keys:** _none_

**Source files**

- `backend/app/Services/Server/LifecycleHookExecutorService.php`

### `featherpanel:server:lifecycle-hook:step:started`

- **Method:** `onServerLifecycleHookStepStarted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string power action, int hook id, int step id, string task type.
- **Data keys:** _none_

**Source files**

- `backend/app/Services/Server/LifecycleHookExecutorService.php`

### `featherpanel:server:power:action`

- **Method:** `onServerPowerAction`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, string action.
- **Data keys:** `action`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/Power/ServerPowerController.php`
- `backend/app/Services/Chatbot/Tools/ServerPowerActionTool.php`

### `featherpanel:user:server:pull:deleted`

- **Method:** `onServerPullProcessDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, string pull id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:reinstall`

- **Method:** `onServerReinstalled`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid.
- **Data keys:** `server`, `server_uuid`, `updated_by`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/ServersController.php`
- `backend/app/Controllers/User/Server/ServerUserController.php`

### `featherpanel:user:server:schedule:created`

- **Method:** `onServerScheduleCreated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id.
- **Data keys:** `schedule_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/CreateScheduleTool.php`

### `featherpanel:user:server:schedule:deleted`

- **Method:** `onServerScheduleDeleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id.
- **Data keys:** `schedule_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/DeleteScheduleTool.php`

### `featherpanel:server:schedule:status:toggle`

- **Method:** `onServerScheduleStatusToggled`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id.
- **Data keys:** `schedule_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerScheduleController.php`

### `featherpanel:user:server:schedule:updated`

- **Method:** `onServerScheduleUpdated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id.
- **Data keys:** `schedule_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/UpdateScheduleTool.php`

### `featherpanel:user:server:subuser:created`

- **Method:** `onServerSubuserCreated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, int subuser id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:subuser:deleted`

- **Method:** `onServerSubuserDeleted`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, int subuser id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:server:subuser:updated`

- **Method:** `onServerSubuserUpdated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, int subuser id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:suspended`

- **Method:** `onServerSuspended`
- **Emitted:** yes
- **Callback docs:** array server data, array suspended by.
- **Data keys:** `email`, `server`, `suspended_by`, `username`, `uuid`

**Source files**

- `backend/app/Controllers/Admin/ServersController.php`
- `backend/app/Services/FeatherZeroTrust/SuspensionService.php`

### `featherpanel:user:server:task:created`

- **Method:** `onServerTaskCreated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id, int task id.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/CreateTaskTool.php`

### `featherpanel:user:server:task:deleted`

- **Method:** `onServerTaskDeleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id, int task id.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/DeleteTaskTool.php`

### `featherpanel:user:server:task:sequence:updated`

- **Method:** `onServerTaskSequenceUpdated`
- **Emitted:** no (defined only)
- **Callback docs:** string user uuid, string server uuid, int schedule id, int task id.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:task:status:toggle`

- **Method:** `onServerTaskStatusToggled`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id, int task id.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/TaskController.php`

### `featherpanel:user:server:task:updated`

- **Method:** `onServerTaskUpdated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int schedule id, int task id.
- **Data keys:** `schedule_id`, `server_uuid`, `task_id`, `user_uuid`

**Source files**

- `backend/app/Services/Chatbot/Tools/UpdateTaskTool.php`

### `featherpanel:server:transfer:cancelled`

- **Method:** `onServerTransferCancelled`
- **Emitted:** yes
- **Callback docs:** array server data, array cancelled_by.
- **Data keys:** `cancelled_by`, `server`

**Source files**

- `backend/app/Controllers/Admin/ServersController.php`

### `featherpanel:server:transfer:completed`

- **Method:** `onServerTransferCompleted`
- **Emitted:** yes
- **Callback docs:** array server data, bool successful, int|null destination_node_id.
- **Data keys:** `destination_node_id`, `old_node_id`, `server`, `successful`

**Source files**

- `backend/app/Controllers/Wings/Transfer/WingsTransferStatusController.php`

### `featherpanel:server:transfer:failed`

- **Method:** `onServerTransferFailed`
- **Emitted:** yes
- **Callback docs:** array server data, bool successful, string|null error.
- **Data keys:** `error`, `server`, `source_node_id`, `successful`

**Source files**

- `backend/app/Controllers/Wings/Transfer/WingsTransferStatusController.php`

### `featherpanel:server:transfer:initiated`

- **Method:** `onServerTransferInitiated`
- **Emitted:** yes
- **Callback docs:** array server data, array source_node, array destination_node, array initiated_by.
- **Data keys:** `destination_node`, `initiated_by`, `server`, `source_node`

**Source files**

- `backend/app/Services/Servers/ServerTransferInitiator.php`

### `featherpanel:server:transferred`

- **Method:** `onServerTransferred`
- **Emitted:** no (defined only)
- **Callback docs:** array server data, array transferred by.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:server:unsuspended`

- **Method:** `onServerUnsuspended`
- **Emitted:** yes
- **Callback docs:** array server data, array unsuspended by.
- **Data keys:** `server`, `unsuspended_by`

**Source files**

- `backend/app/Controllers/Admin/ServersController.php`

### `featherpanel:server:update`

- **Method:** `onServerUpdated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid.
- **Data keys:** `action`, `hook_type`, `import_id`, `sequence_id`, `server`, `server_uuid`, `step_id`, `updated_by`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/ServersController.php`
- `backend/app/Controllers/User/Server/ServerFirewallController.php`
- `backend/app/Controllers/User/Server/ServerImportController.php`
- `backend/app/Controllers/User/Server/ServerLifecycleHookController.php`
- `backend/app/Services/Chatbot/Tools/UpdateServerTool.php`

