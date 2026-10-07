# Events: PluginManager

5 events in this category.

### `featherpanel:admin:plugin_manager:plugin:created`

- **Method:** `onPluginCreated`
- **Emitted:** yes
- **Callback docs:** string identifier, array plugin data.
- **Data keys:** `created_by`, `identifier`, `plugin_data`

**Source files**

- `backend/app/Controllers/Admin/PluginManagerController.php`

### `featherpanel:admin:plugin_manager:file:created`

- **Method:** `onPluginFileCreated`
- **Emitted:** yes
- **Callback docs:** string identifier, string file type, array file data.
- **Data keys:** `created_by`, `file_data`, `file_type`, `identifier`, `widget_id`, `widgets`

**Source files**

- `backend/app/Controllers/Admin/PluginManagerController.php`

### `featherpanel:admin:plugin_manager:error`

- **Method:** `onPluginManagerError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:plugin_manager:settings:updated`

- **Method:** `onPluginSettingsUpdated`
- **Emitted:** yes
- **Callback docs:** string identifier, array settings data.
- **Data keys:** `identifier`, `settings`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/PluginManagerController.php`

### `featherpanel:admin:plugin_manager:plugin:updated`

- **Method:** `onPluginUpdated`
- **Emitted:** yes
- **Callback docs:** string identifier, array updated data.
- **Data keys:** `identifier`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/PluginManagerController.php`

