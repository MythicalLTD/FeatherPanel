# Events: FileManager

6 events in this category.

### `featherpanel:admin:file_manager:directory:browsed`

- **Method:** `onDirectoryBrowsed`
- **Emitted:** no (defined only)
- **Callback docs:** string path, array items.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:file_manager:file:created`

- **Method:** `onFileCreated`
- **Emitted:** yes
- **Callback docs:** string path, bool is_directory.
- **Data keys:** `created_by`, `is_directory`, `path`

**Source files**

- `backend/app/Controllers/Admin/FileManagerController.php`

### `featherpanel:admin:file_manager:file:deleted`

- **Method:** `onFileDeleted`
- **Emitted:** yes
- **Callback docs:** string path, bool was_directory.
- **Data keys:** `deleted_by`, `path`, `was_directory`

**Source files**

- `backend/app/Controllers/Admin/FileManagerController.php`

### `featherpanel:admin:file_manager:error`

- **Method:** `onFileManagerError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:file_manager:file:read`

- **Method:** `onFileRead`
- **Emitted:** no (defined only)
- **Callback docs:** string path, array file data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:file_manager:file:saved`

- **Method:** `onFileSaved`
- **Emitted:** yes
- **Callback docs:** string path, int size.
- **Data keys:** `path`, `saved_by`, `size`

**Source files**

- `backend/app/Controllers/Admin/FileManagerController.php`

