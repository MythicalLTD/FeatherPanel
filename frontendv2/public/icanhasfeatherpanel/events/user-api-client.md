# Events: UserApiClient

4 events in this category.

### `featherpanel:user:api_client:created`

- **Method:** `onUserApiClientCreated`
- **Emitted:** yes
- **Callback docs:** array api_client data.
- **Data keys:** `api_client`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/ApiClientController.php`

### `featherpanel:user:api_client:deleted`

- **Method:** `onUserApiClientDeleted`
- **Emitted:** yes
- **Callback docs:** int api_client id, array api_client data.
- **Data keys:** `api_client`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/ApiClientController.php`

### `featherpanel:user:api_client:error`

- **Method:** `onUserApiClientError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:user:api_client:updated`

- **Method:** `onUserApiClientUpdated`
- **Emitted:** yes
- **Callback docs:** int api_client id, array updated data.
- **Data keys:** `action`, `api_client`, `updated_data`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/User/ApiClientController.php`

