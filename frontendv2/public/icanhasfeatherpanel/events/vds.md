# Events: Vds

17 events in this category.

### `featherpanel:vds:backup:create`

- **Method:** `onVdsBackupCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, string backup id, array context.
- **Data keys:** `backup_id`, `context`, `source`, `storage`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`
- `backend/app/Controllers/User/Vds/VmUserBackupController.php`
- `backend/app/Services/Chatbot/Tools/Vds/CreateVdsBackupTool.php`

### `featherpanel:vds:backup:delete`

- **Method:** `onVdsBackupDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, string volid, array context.
- **Data keys:** `context`, `source`, `storage`, `user_uuid`, `vds_id`, `vmid`, `volid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`
- `backend/app/Controllers/User/Vds/VmUserBackupController.php`

### `featherpanel:vds:backup:restore`

- **Method:** `onVdsBackupRestored`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, string restore id, string volid, array context.
- **Data keys:** `context`, `restore_id`, `source`, `storage`, `user_uuid`, `vds_id`, `vmid`, `volid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`
- `backend/app/Controllers/User/Vds/VmUserBackupController.php`

### `featherpanel:vds:console:access`

- **Method:** `onVdsConsoleAccessed`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array context.
- **Data keys:** `context`, `source`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`
- `backend/app/Controllers/User/Vds/VmUserInstanceController.php`

### `featherpanel:vds:created`

- **Method:** `onVdsCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array context.
- **Data keys:** `context`, `creation_id`, `source`, `template_id`, `user_uuid`, `vds_id`, `vm_node_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`

### `featherpanel:vds:deleted`

- **Method:** `onVdsDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array context.
- **Data keys:** `context`, `hard_delete`, `queued`, `reason`, `source`, `task_id`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`

### `featherpanel:vds:iso:mount`

- **Method:** `onVdsIsoMounted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, string volid, array context.
- **Data keys:** `context`, `method`, `source`, `storage`, `task_id`, `user_uuid`, `vds_id`, `vmid`, `volid`

**Source files**

- `backend/app/Controllers/User/Vds/VmUserInstanceController.php`

### `featherpanel:vds:iso:unmount`

- **Method:** `onVdsIsoUnmounted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array context.
- **Data keys:** `context`, `source`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/User/Vds/VmUserInstanceController.php`

### `featherpanel:vds:network:update`

- **Method:** `onVdsNetworkUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array dns/network payload, array context.
- **Data keys:** `changes`, `context`, `nameserver`, `searchdomain`, `source`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/User/Vds/VmUserInstanceController.php`

### `featherpanel:vds:power:action`

- **Method:** `onVdsPowerAction`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, string action, string task id, array context.
- **Data keys:** `action`, `context`, `source`, `task_id`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`
- `backend/app/Controllers/User/Vds/VmUserInstanceController.php`
- `backend/app/Services/Chatbot/Tools/Vds/VdsPowerActionTool.php`

### `featherpanel:vds:qemu:hardware:update`

- **Method:** `onVdsQemuHardwareUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array qemu payload, array context.
- **Data keys:** `bios`, `changes`, `context`, `efi_enabled`, `serial0_enabled`, `source`, `tpm_enabled`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/User/Vds/VmUserInstanceController.php`

### `featherpanel:vds:reinstall`

- **Method:** `onVdsReinstalled`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, string reinstall id, array context.
- **Data keys:** `context`, `reinstall_id`, `source`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`
- `backend/app/Controllers/User/Vds/VmUserInstanceController.php`

### `featherpanel:vds:subuser:create`

- **Method:** `onVdsSubuserCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, int subuser id, array context.
- **Data keys:** `context`, `source`, `subuser_id`, `target_user_id`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/User/Vds/VmUserSubuserController.php`

### `featherpanel:vds:subuser:delete`

- **Method:** `onVdsSubuserDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, int subuser id, array context.
- **Data keys:** `context`, `source`, `subuser_id`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/User/Vds/VmUserSubuserController.php`

### `featherpanel:vds:suspended`

- **Method:** `onVdsSuspended`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array context.
- **Data keys:** `context`, `source`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`

### `featherpanel:vds:unsuspended`

- **Method:** `onVdsUnsuspended`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array context.
- **Data keys:** `context`, `source`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`

### `featherpanel:vds:updated`

- **Method:** `onVdsUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vds instance id, int vmid, array changed fields, array context.
- **Data keys:** `changed_fields`, `context`, `source`, `user_uuid`, `vds_id`, `vmid`

**Source files**

- `backend/app/Controllers/Admin/VmInstancesController.php`

