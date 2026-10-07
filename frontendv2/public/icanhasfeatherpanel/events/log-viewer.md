# Events: LogViewer

4 events in this category.

### `featherpanel:admin:log_viewer:cleared`

- **Method:** `onLogCleared`
- **Emitted:** yes
- **Callback docs:** string log type, string file name.
- **Data keys:** `cleared_by`, `log_file`, `log_type`

**Source files**

- `backend/app/Controllers/Admin/LogViewerController.php`

### `featherpanel:admin:log_viewer:uploaded`

- **Method:** `onLogsUploaded`
- **Emitted:** yes
- **Callback docs:** array upload results.
- **Data keys:** `results`, `uploaded_by`

**Source files**

- `backend/app/Controllers/Admin/LogViewerController.php`

### `featherpanel:admin:log_viewer:viewed`

- **Method:** `onLogViewed`
- **Emitted:** no (defined only)
- **Callback docs:** string log type, string file name.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:log_viewer:error`

- **Method:** `onLogViewerError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

