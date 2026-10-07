# Events: VdsNode

10 events in this category.

### `featherpanel:vds:node:create`

- **Method:** `onVdsNodeCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vm node id, array node payload, array context.
- **Data keys:** `context`, `source`, `user_uuid`, `vm_node`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:node:delete`

- **Method:** `onVdsNodeDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vm node id, array node payload, array context.
- **Data keys:** `context`, `source`, `user_uuid`, `vm_node`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:node:ip:create`

- **Method:** `onVdsNodeIpCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vm node id, int ip id, array ip payload, array context.
- **Data keys:** `context`, `ip`, `ip_id`, `source`, `user_uuid`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:node:ip:delete`

- **Method:** `onVdsNodeIpDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vm node id, int ip id, array ip payload, array context.
- **Data keys:** `context`, `ip`, `ip_id`, `source`, `user_uuid`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:node:ip:primary`

- **Method:** `onVdsNodeIpPrimarySet`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vm node id, int ip id, array ip payload, array context.
- **Data keys:** `context`, `ip`, `ip_id`, `source`, `user_uuid`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:node:ip:update`

- **Method:** `onVdsNodeIpUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vm node id, int ip id, array ip payload, array changed fields, array context.
- **Data keys:** `changed_fields`, `context`, `ip`, `ip_id`, `source`, `user_uuid`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:node:update`

- **Method:** `onVdsNodeUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int vm node id, array node payload, array changed fields, array context.
- **Data keys:** `changed_fields`, `context`, `source`, `user_uuid`, `vm_node`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:template:create`

- **Method:** `onVdsTemplateCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int template id, int vm node id, array template payload, array context.
- **Data keys:** `context`, `source`, `template`, `template_id`, `user_uuid`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:template:delete`

- **Method:** `onVdsTemplateDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int template id, int vm node id, array template payload, array context.
- **Data keys:** `context`, `source`, `template`, `template_id`, `user_uuid`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

### `featherpanel:vds:template:update`

- **Method:** `onVdsTemplateUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, int template id, int vm node id, array template payload, array changed fields, array context.
- **Data keys:** `changed_fields`, `context`, `source`, `template`, `template_id`, `user_uuid`, `vm_node_id`

**Source files**

- `backend/app/Controllers/Admin/VmNodesController.php`

