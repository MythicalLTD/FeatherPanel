# Events: Notifications

8 events in this category.

### `featherpanel:admin:notifications:notification:created`

- **Method:** `onNotificationCreated`
- **Emitted:** yes
- **Callback docs:** array notification data.
- **Data keys:** `created_by`, `emailed`, `notification_data`, `notification_id`

**Source files**

- `backend/app/Controllers/Admin/NotificationsController.php`

### `featherpanel:admin:notifications:notification:deleted`

- **Method:** `onNotificationDeleted`
- **Emitted:** yes
- **Callback docs:** int notification id, array notification data.
- **Data keys:** `deleted_by`, `notification_data`, `notification_id`

**Source files**

- `backend/app/Controllers/Admin/NotificationsController.php`

### `featherpanel:user:notifications:notification:dismissed`

- **Method:** `onNotificationDismissed`
- **Emitted:** yes
- **Callback docs:** int notification id, int user id.
- **Data keys:** `notification_id`, `user`, `user_id`

**Source files**

- `backend/app/Controllers/User/NotificationController.php`

### `featherpanel:admin:notifications:notification:not:found`

- **Method:** `onNotificationNotFound`
- **Emitted:** yes
- **Callback docs:** int notification id, string error message.
- **Data keys:** `error_message`, `notification_id`

**Source files**

- `backend/app/Controllers/Admin/NotificationsController.php`

### `featherpanel:admin:notifications:notification:retrieved`

- **Method:** `onNotificationRetrieved`
- **Emitted:** yes
- **Callback docs:** int notification id, array notification data.
- **Data keys:** `notification_data`, `notification_id`

**Source files**

- `backend/app/Controllers/Admin/NotificationsController.php`

### `featherpanel:admin:notifications:error`

- **Method:** `onNotificationsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:notifications:retrieved`

- **Method:** `onNotificationsRetrieved`
- **Emitted:** yes
- **Callback docs:** array notifications list.
- **Data keys:** `filters`, `limit`, `notifications`, `page`, `pagination`, `search`, `total`, `type`

**Source files**

- `backend/app/Controllers/Admin/NotificationsController.php`

### `featherpanel:admin:notifications:notification:updated`

- **Method:** `onNotificationUpdated`
- **Emitted:** yes
- **Callback docs:** int notification id, array old data, array new data.
- **Data keys:** `new_data`, `notification_id`, `old_data`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/NotificationsController.php`

