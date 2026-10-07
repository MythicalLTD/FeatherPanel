# Events: LdapProviders

3 events in this category.

### `featherpanel:ldap:provider:create`

- **Method:** `onLdapProviderCreated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, array provider.
- **Data keys:** `provider`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/LdapProvidersController.php`

### `featherpanel:ldap:provider:delete`

- **Method:** `onLdapProviderDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, array provider.
- **Data keys:** `provider`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/LdapProvidersController.php`

### `featherpanel:ldap:provider:update`

- **Method:** `onLdapProviderUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, array provider, array changed fields.
- **Data keys:** `provider`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/LdapProvidersController.php`

