# Events: Realms

7 events in this category.

### `featherpanel:admin:realms:realm:created`

- **Method:** `onRealmCreated`
- **Emitted:** yes
- **Callback docs:** array realm data.
- **Data keys:** `created_by`, `realm`

**Source files**

- `backend/app/Controllers/Admin/RealmsController.php`

### `featherpanel:admin:realms:realm:deleted`

- **Method:** `onRealmDeleted`
- **Emitted:** yes
- **Callback docs:** int realm id, array realm data.
- **Data keys:** `deleted_by`, `realm`

**Source files**

- `backend/app/Controllers/Admin/RealmsController.php`

### `featherpanel:admin:realms:realm:not:found`

- **Method:** `onRealmNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int realm id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:realms:realm:retrieved`

- **Method:** `onRealmRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int realm id, array realm data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:realms:error`

- **Method:** `onRealmsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:realms:retrieved`

- **Method:** `onRealmsRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array realms list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:realms:realm:updated`

- **Method:** `onRealmUpdated`
- **Emitted:** yes
- **Callback docs:** int realm id, array old data, array new data.
- **Data keys:** `realm`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/RealmsController.php`

