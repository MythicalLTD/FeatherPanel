# Events: MailTemplates

7 events in this category.

### `featherpanel:admin:mail_templates:template:created`

- **Method:** `onMailTemplateCreated`
- **Emitted:** yes
- **Callback docs:** array template data.
- **Data keys:** `created_by`, `template_data`, `template_id`

**Source files**

- `backend/app/Controllers/Admin/MailTemplatesController.php`

### `featherpanel:admin:mail_templates:template:deleted`

- **Method:** `onMailTemplateDeleted`
- **Emitted:** yes
- **Callback docs:** int template id, array template data.
- **Data keys:** `deleted_by`, `template`

**Source files**

- `backend/app/Controllers/Admin/MailTemplatesController.php`

### `featherpanel:admin:mail_templates:template:not:found`

- **Method:** `onMailTemplateNotFound`
- **Emitted:** no (defined only)
- **Callback docs:** int template id, string error message.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:mail_templates:template:retrieved`

- **Method:** `onMailTemplateRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** int template id, array template data.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:mail_templates:error`

- **Method:** `onMailTemplatesError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:mail_templates:retrieved`

- **Method:** `onMailTemplatesRetrieved`
- **Emitted:** no (defined only)
- **Callback docs:** array templates list.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:mail_templates:template:updated`

- **Method:** `onMailTemplateUpdated`
- **Emitted:** yes
- **Callback docs:** int template id, array old data, array new data.
- **Data keys:** `template`, `updated_by`, `updated_data`

**Source files**

- `backend/app/Controllers/Admin/MailTemplatesController.php`

