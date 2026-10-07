# Events: Locations

7 events in this category.

### `featherpanel:admin:locations:location:created`

- **Method:** `onLocationCreated`
- **Emitted:** yes
- **Callback docs:** array location data.
- **Data keys:** `created_by`, `location`

**Source files**

- `backend/app/Controllers/Admin/LocationsController.php`

### `featherpanel:admin:locations:location:deleted`

- **Method:** `onLocationDeleted`
- **Emitted:** yes
- **Callback docs:** int location id, array location data.
- **Data keys:** `deleted_by`, `location`

**Source files**

- `backend/app/Controllers/Admin/LocationsController.php`

### `featherpanel:admin:locations:location:not:found`

- **Method:** `onLocationNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int location id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:locations:location:retrieved`

- **Method:** `onLocationRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int location id, array location data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:locations:error`

- **Method:** `onLocationsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:locations:retrieved`

- **Method:** `onLocationsRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array locations list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:locations:location:updated`

- **Method:** `onLocationUpdated`
- **Emitted:** yes
- **Callback docs:** int location id, array old data, array new data.
- **Data keys:** `location`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/LocationsController.php`

