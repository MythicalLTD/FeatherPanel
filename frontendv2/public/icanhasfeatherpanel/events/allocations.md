# Events: Allocations

7 events in this category.

### `featherpanel:admin:allocations:allocation:created`

- **Method:** `onAllocationCreated`
- **Emitted:** yes
- **Callback docs:** array allocation data.
- **Data keys:** `allocations`, `created_by`, `created_count`

**Source files**

- `backend/app/Controllers/Admin/AllocationsController.php`

### `featherpanel:admin:allocations:allocation:deleted`

- **Method:** `onAllocationDeleted`
- **Emitted:** yes
- **Callback docs:** int allocation id, array allocation data.
- **Data keys:** `allocation`, `deleted_by`, `deleted_count`, `ids`, `ip`, `node_id`, `skipped_count`

**Source files**

- `backend/app/Controllers/Admin/AllocationsController.php`

### `featherpanel:admin:allocations:allocation:not:found`

- **Method:** `onAllocationNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int allocation id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:allocations:allocation:retrieved`

- **Method:** `onAllocationRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int allocation id, array allocation data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:allocations:error`

- **Method:** `onAllocationsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:allocations:retrieved`

- **Method:** `onAllocationsRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array allocations list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:allocations:allocation:updated`

- **Method:** `onAllocationUpdated`
- **Emitted:** yes
- **Callback docs:** int allocation id, array old data, array new data.
- **Data keys:** `allocation`, `deleted_source_conflicts`, `deleted_target_conflicts`, `from_ip`, `ip_alias`, `matched_count`, `node_id`, `to_ip`, `updated_by`, `updated_count`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/AllocationsController.php`

