# Events: WebSpace

33 events in this category.

### `featherpanel:webspace:app:installed`

- **Method:** `onWebSpaceAppInstalled`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, string app, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceAppsController.php`

### `featherpanel:webspace:app:updated`

- **Method:** `onWebSpaceAppUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, string app, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceAppsController.php`

### `featherpanel:webspace:backup:create`

- **Method:** `onWebSpaceBackupCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, string|null backup uuid, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`

### `featherpanel:webspace:backup:delete`

- **Method:** `onWebSpaceBackupDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, string backup uuid, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`

### `featherpanel:webspace:backup:restore`

- **Method:** `onWebSpaceBackupRestored`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, string backup uuid, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`

### `featherpanel:webspace:console:access`

- **Method:** `onWebSpaceConsoleAccessed`
- **Emitted:** no (defined only)
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:webspace:created`

- **Method:** `onWebSpaceCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array webspace, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`

### `featherpanel:webspace:database:create`

- **Method:** `onWebSpaceDatabaseCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int database id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceDatabaseController.php`

### `featherpanel:webspace:database:delete`

- **Method:** `onWebSpaceDatabaseDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int database id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceDatabaseController.php`

### `featherpanel:webspace:deleted`

- **Method:** `onWebSpaceDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`

### `featherpanel:webspace:directory:create`

- **Method:** `onWebSpaceDirectoryCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, string path, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceFilesController.php`

### `featherpanel:webspace:dns:record:created`

- **Method:** `onWebSpaceDnsRecordCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array record.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpaceDnsController.php`

### `featherpanel:webspace:dns:record:deleted`

- **Method:** `onWebSpaceDnsRecordDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, string record id.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpaceDnsController.php`

### `featherpanel:webspace:dns:record:updated`

- **Method:** `onWebSpaceDnsRecordUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array record.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpaceDnsController.php`

### `featherpanel:webspace:dns:zone:linked`

- **Method:** `onWebSpaceDnsZoneLinked`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array zone.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpaceDnsController.php`

### `featherpanel:webspace:dns:zone:unlinked`

- **Method:** `onWebSpaceDnsZoneUnlinked`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int zone id.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpaceDnsController.php`

### `featherpanel:webspace:files:delete`

- **Method:** `onWebSpaceFilesDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array paths, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceFilesController.php`

### `featherpanel:webspace:mailbox:create`

- **Method:** `onWebSpaceMailboxCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int mailbox id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceMailboxController.php`

### `featherpanel:webspace:mailbox:delete`

- **Method:** `onWebSpaceMailboxDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int mailbox id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceMailboxController.php`

### `featherpanel:webspace:reinstall`

- **Method:** `onWebSpaceReinstalled`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpacesController.php`

### `featherpanel:webspace:schedule:create`

- **Method:** `onWebSpaceScheduleCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int schedule id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceScheduleController.php`

### `featherpanel:webspace:schedule:delete`

- **Method:** `onWebSpaceScheduleDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int schedule id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceScheduleController.php`

### `featherpanel:webspace:schedule:update`

- **Method:** `onWebSpaceScheduleUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int schedule id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceScheduleController.php`

### `featherpanel:webspace:sftp:account:created`

- **Method:** `onWebSpaceSftpAccountCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array account.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceSftpAccountController.php`

### `featherpanel:webspace:sftp:account:deleted`

- **Method:** `onWebSpaceSftpAccountDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int account id.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceSftpAccountController.php`

### `featherpanel:webspace:sftp:account:updated`

- **Method:** `onWebSpaceSftpAccountUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array account.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceSftpAccountController.php`

### `featherpanel:webspace:sftp:password:reset`

- **Method:** `onWebSpaceSftpPasswordReset`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int account id.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceSftpAccountController.php`

### `featherpanel:webspace:subuser:create`

- **Method:** `onWebSpaceSubuserCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int subuser id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceSubuserController.php`

### `featherpanel:webspace:subuser:delete`

- **Method:** `onWebSpaceSubuserDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int subuser id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceSubuserController.php`

### `featherpanel:webspace:subuser:update`

- **Method:** `onWebSpaceSubuserUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, int subuser id, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/User/WebSpaces/WebSpaceSubuserController.php`

### `featherpanel:webspace:suspended`

- **Method:** `onWebSpaceSuspended`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`

### `featherpanel:webspace:unsuspended`

- **Method:** `onWebSpaceUnsuspended`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`

### `featherpanel:webspace:updated`

- **Method:** `onWebSpaceUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string webspace uuid, string uuid_short, array changed fields, array context.
- **Data keys:** _none_

**Source files**

- `backend/app/Controllers/Admin/WebSpacesController.php`
- `backend/app/Controllers/User/WebSpaces/WebSpacesController.php`

