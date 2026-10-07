# Events: OidcProviders

3 events in this category.

### `featherpanel:oidc:provider:create`

- **Method:** `onOidcProviderCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, array provider.
- **Data keys:** `provider`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/OidcProvidersController.php`

### `featherpanel:oidc:provider:delete`

- **Method:** `onOidcProviderDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, array provider.
- **Data keys:** `provider`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/OidcProvidersController.php`

### `featherpanel:oidc:provider:update`

- **Method:** `onOidcProviderUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, array provider, array changed fields.
- **Data keys:** `provider`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/OidcProvidersController.php`

