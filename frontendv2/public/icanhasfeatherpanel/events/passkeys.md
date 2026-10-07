# Events: Passkeys

5 events in this category.

### `featherpanel:auth:passkey:authentication:failed`

- **Method:** `onPasskeyAuthenticationFailed`
- **Emitted:** yes
- **Callback docs:** array context.
- **Data keys:** `error`, `message`

**Source files**

- `backend/app/Controllers/User/Auth/PasskeyController.php`

### `featherpanel:auth:passkey:authentication:success`

- **Method:** `onPasskeyAuthenticationSuccess`
- **Emitted:** yes
- **Callback docs:** array user.
- **Data keys:** `user`

**Source files**

- `backend/app/Controllers/User/Auth/PasskeyController.php`

### `featherpanel:auth:passkey:deleted`

- **Method:** `onPasskeyDeleted`
- **Emitted:** yes
- **Callback docs:** array user, int passkey id.
- **Data keys:** `passkey_id`, `user`

**Source files**

- `backend/app/Controllers/User/Auth/PasskeyController.php`

### `featherpanel:auth:passkey:registered`

- **Method:** `onPasskeyRegistered`
- **Emitted:** yes
- **Callback docs:** array user, array passkey.
- **Data keys:** `label`, `passkey_id`, `user`

**Source files**

- `backend/app/Controllers/User/Auth/PasskeyController.php`

### `featherpanel:auth:passkey:updated`

- **Method:** `onPasskeyUpdated`
- **Emitted:** yes
- **Callback docs:** array user, array passkey.
- **Data keys:** `label`, `passkey_id`, `user`

**Source files**

- `backend/app/Controllers/User/Auth/PasskeyController.php`

