# Events: Settings

7 events in this category.

### `featherpanel:admin:settings:setting:retrieved`

- **Method:** `onSettingRetrieved`
- **Emitted:** yes
- **Callback docs:** string setting name, array setting data.
- **Data keys:** `setting_data`, `setting_name`

**Source files**

- `backend/app/Controllers/Admin/SettingsController.php`

### `featherpanel:admin:settings:category:retrieved`

- **Method:** `onSettingsByCategoryRetrieved`
- **Emitted:** yes
- **Callback docs:** string category, array settings.
- **Data keys:** `categories`, `category`, `category_config`, `settings`

**Source files**

- `backend/app/Controllers/Admin/SettingsController.php`

### `featherpanel:admin:settings:error`

- **Method:** `onSettingsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:settings:retrieved`

- **Method:** `onSettingsRetrieved`
- **Emitted:** yes
- **Callback docs:** array settings data.
- **Data keys:** `categories`, `organized_settings`, `settings`

**Source files**

- `backend/app/Controllers/Admin/SettingsController.php`

### `featherpanel:admin:settings:updated`

- **Method:** `onSettingsUpdated`
- **Emitted:** yes
- **Callback docs:** array updated settings, array old values.
- **Data keys:** `settings_data`, `updated_settings`, `user`

**Source files**

- `backend/app/Controllers/Admin/SettingsController.php`

### `featherpanel:admin:settings:setting:updated`

- **Method:** `onSettingUpdated`
- **Emitted:** no (defined only)
- **Callback docs:** string setting name, mixed old value, mixed new value.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:settings:validation:error`

- **Method:** `onSettingValidationError`
- **Emitted:** no (defined only)
- **Callback docs:** string setting name, string error message.
- **Data keys:** _none_

**Source files**

- _none_

