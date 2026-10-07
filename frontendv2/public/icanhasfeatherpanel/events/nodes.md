# Events: Nodes

9 events in this category.

### `featherpanel:admin:nodes:node:connection:error`

- **Method:** `onNodeConnectionError`
- **Emitted:** no (defined only)
- **Callback docs:** int node id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:nodes:node:created`

- **Method:** `onNodeCreated`
- **Emitted:** yes
- **Callback docs:** array node data.
- **Data keys:** `created_by`, `node`

**Source files**

- `backend/app/Controllers/Admin/NodesController.php`
- `backend/app/Controllers/Admin/PterodactylImporterController.php`

### `featherpanel:admin:nodes:node:deleted`

- **Method:** `onNodeDeleted`
- **Emitted:** yes
- **Callback docs:** int node id, array node data.
- **Data keys:** `deleted_by`, `node`

**Source files**

- `backend/app/Controllers/Admin/NodesController.php`

### `featherpanel:admin:nodes:node:key:reset`

- **Method:** `onNodeKeyReset`
- **Emitted:** no (defined only)
- **Callback docs:** int node id, string new key.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:nodes:node:not:found`

- **Method:** `onNodeNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int node id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:nodes:node:retrieved`

- **Method:** `onNodeRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int node id, array node data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:nodes:error`

- **Method:** `onNodesError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:nodes:retrieved`

- **Method:** `onNodesRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array nodes list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:nodes:node:updated`

- **Method:** `onNodeUpdated`
- **Emitted:** yes
- **Callback docs:** int node id, array old data, array new data.
- **Data keys:** `node`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/NodesController.php`

