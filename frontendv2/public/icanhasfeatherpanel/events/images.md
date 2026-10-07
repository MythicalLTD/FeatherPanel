# Events: Images

7 events in this category.

### `featherpanel:admin:images:image:created`

- **Method:** `onImageCreated`
- **Emitted:** yes
- **Callback docs:** array image data.
- **Data keys:** `created_by`, `image_data`, `image_id`

**Source files**

- `backend/app/Controllers/Admin/ImagesController.php`

### `featherpanel:admin:images:image:deleted`

- **Method:** `onImageDeleted`
- **Emitted:** yes
- **Callback docs:** int image id, array image data.
- **Data keys:** `deleted_by`, `image`

**Source files**

- `backend/app/Controllers/Admin/ImagesController.php`

### `featherpanel:admin:images:image:not:found`

- **Method:** `onImageNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int image id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:images:image:retrieved`

- **Method:** `onImageRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int image id, array image data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:images:error`

- **Method:** `onImagesError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:images:retrieved`

- **Method:** `onImagesRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array images list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:images:image:updated`

- **Method:** `onImageUpdated`
- **Emitted:** yes
- **Callback docs:** int image id, array old data, array new data.
- **Data keys:** `image`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/ImagesController.php`

