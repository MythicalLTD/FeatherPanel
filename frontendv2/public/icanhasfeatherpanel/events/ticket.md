# Events: Ticket

21 events in this category.

### `featherpanel:ticket:attachment:created`

- **Method:** `onTicketAttachmentCreated`
- **Emitted:** yes
- **Callback docs:** array ticket data, array attachment data, int attachment id, string user uuid.
- **Data keys:** `attachment`, `attachment_id`, `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketAttachmentsController.php`

### `featherpanel:ticket:attachment:deleted`

- **Method:** `onTicketAttachmentDeleted`
- **Emitted:** yes
- **Callback docs:** array ticket data, int attachment id, string user uuid.
- **Data keys:** `attachment_id`, `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketAttachmentsController.php`

### `featherpanel:ticket:attachment:updated`

- **Method:** `onTicketAttachmentUpdated`
- **Emitted:** no (defined only)
- **Callback docs:** array ticket data, array attachment data, array updated data, int attachment id, string user uuid.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:ticket:category:created`

- **Method:** `onTicketCategoryCreated`
- **Emitted:** yes
- **Callback docs:** array category data, int category id, string user uuid.
- **Data keys:** `category`, `category_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketCategoriesController.php`

### `featherpanel:ticket:category:deleted`

- **Method:** `onTicketCategoryDeleted`
- **Emitted:** yes
- **Callback docs:** array category data, int category id, string user uuid.
- **Data keys:** `category`, `category_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketCategoriesController.php`

### `featherpanel:ticket:category:updated`

- **Method:** `onTicketCategoryUpdated`
- **Emitted:** yes
- **Callback docs:** array category data, array updated data, int category id, string user uuid.
- **Data keys:** `category`, `category_id`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketCategoriesController.php`

### `featherpanel:ticket:closed`

- **Method:** `onTicketClosed`
- **Emitted:** yes
- **Callback docs:** array ticket data, string user uuid.
- **Data keys:** `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketsController.php`

### `featherpanel:ticket:created`

- **Method:** `onTicketCreated`
- **Emitted:** yes
- **Callback docs:** array ticket data, int ticket id, string user uuid.
- **Data keys:** `ticket`, `ticket_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketsController.php`
- `backend/app/Controllers/User/TicketsController.php`
- `backend/app/Controllers/User/User/SessionController.php`

### `featherpanel:ticket:deleted`

- **Method:** `onTicketDeleted`
- **Emitted:** yes
- **Callback docs:** array ticket data, string user uuid.
- **Data keys:** `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketsController.php`
- `backend/app/Controllers/User/TicketsController.php`

### `featherpanel:ticket:message:created`

- **Method:** `onTicketMessageCreated`
- **Emitted:** yes
- **Callback docs:** array ticket data, array message data, int message id, string user uuid.
- **Data keys:** `message`, `message_id`, `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketMessagesController.php`
- `backend/app/Controllers/Admin/TicketsController.php`
- `backend/app/Controllers/User/TicketsController.php`

### `featherpanel:ticket:message:deleted`

- **Method:** `onTicketMessageDeleted`
- **Emitted:** yes
- **Callback docs:** array ticket data, int message id, string user uuid.
- **Data keys:** `message_id`, `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketMessagesController.php`
- `backend/app/Controllers/User/TicketsController.php`

### `featherpanel:ticket:message:updated`

- **Method:** `onTicketMessageUpdated`
- **Emitted:** yes
- **Callback docs:** array ticket data, array message data, array updated data, int message id, string user uuid.
- **Data keys:** `message`, `message_id`, `ticket`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketMessagesController.php`

### `featherpanel:ticket:priority:created`

- **Method:** `onTicketPriorityCreated`
- **Emitted:** yes
- **Callback docs:** array priority data, int priority id, string user uuid.
- **Data keys:** `priority`, `priority_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketPrioritiesController.php`

### `featherpanel:ticket:priority:deleted`

- **Method:** `onTicketPriorityDeleted`
- **Emitted:** yes
- **Callback docs:** array priority data, int priority id, string user uuid.
- **Data keys:** `priority`, `priority_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketPrioritiesController.php`

### `featherpanel:ticket:priority:updated`

- **Method:** `onTicketPriorityUpdated`
- **Emitted:** yes
- **Callback docs:** array priority data, array updated data, int priority id, string user uuid.
- **Data keys:** `priority`, `priority_id`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketPrioritiesController.php`

### `featherpanel:ticket:reopened`

- **Method:** `onTicketReopened`
- **Emitted:** yes
- **Callback docs:** array ticket data, string user uuid.
- **Data keys:** `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketsController.php`

### `featherpanel:ticket:status:changed`

- **Method:** `onTicketStatusChanged`
- **Emitted:** yes
- **Callback docs:** array ticket data, string old status, string new status, string user uuid.
- **Data keys:** `new_status`, `old_status`, `ticket`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketsController.php`

### `featherpanel:ticket:status:created`

- **Method:** `onTicketStatusCreated`
- **Emitted:** yes
- **Callback docs:** array status data, int status id, string user uuid.
- **Data keys:** `status`, `status_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketStatusesController.php`

### `featherpanel:ticket:status:deleted`

- **Method:** `onTicketStatusDeleted`
- **Emitted:** yes
- **Callback docs:** array status data, int status id, string user uuid.
- **Data keys:** `status`, `status_id`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketStatusesController.php`

### `featherpanel:ticket:status:updated`

- **Method:** `onTicketStatusUpdated`
- **Emitted:** yes
- **Callback docs:** array status data, array updated data, int status id, string user uuid.
- **Data keys:** `status`, `status_id`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketStatusesController.php`

### `featherpanel:ticket:updated`

- **Method:** `onTicketUpdated`
- **Emitted:** yes
- **Callback docs:** array ticket data, array updated data, string user uuid.
- **Data keys:** `ticket`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/TicketsController.php`

