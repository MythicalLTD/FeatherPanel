# Events: Subdomains

10 events in this category.

### `featherpanel:user:subdomain:created`

- **Method:** `onSubdomainCreated`
- **Emitted:** yes
- **Callback docs:** string subdomain uuid, array subdomain data, array server data.
- **Data keys:** `server_data`, `subdomain_data`, `subdomain_uuid`, `user`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/SubdomainController.php`
- `backend/app/Services/Chatbot/Tools/CreateSubdomainTool.php`

### `featherpanel:user:subdomain:deleted`

- **Method:** `onSubdomainDeleted`
- **Emitted:** yes
- **Callback docs:** string subdomain uuid, array subdomain data, array server data.
- **Data keys:** `server_data`, `subdomain_data`, `subdomain_uuid`, `user`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/SubdomainController.php`
- `backend/app/Services/Chatbot/Tools/DeleteSubdomainTool.php`

### `featherpanel:admin:subdomains:domain:created`

- **Method:** `onSubdomainDomainCreated`
- **Emitted:** yes
- **Callback docs:** array domain data.
- **Data keys:** `created_by`, `domain_data`

**Source files**

- `backend/app/Controllers/Admin/SubdomainsController.php`

### `featherpanel:admin:subdomains:domain:deleted`

- **Method:** `onSubdomainDomainDeleted`
- **Emitted:** yes
- **Callback docs:** string domain uuid, array domain data.
- **Data keys:** `deleted_by`, `domain_data`, `domain_uuid`

**Source files**

- `backend/app/Controllers/Admin/SubdomainsController.php`

### `featherpanel:admin:subdomains:domain:not:found`

- **Method:** `onSubdomainDomainNotFound`
- **Emitted:** yes
- **Callback docs:** string domain uuid, string error message.
- **Data keys:** `domain_uuid`, `error_message`

**Source files**

- `backend/app/Controllers/Admin/SubdomainsController.php`

### `featherpanel:admin:subdomains:domain:retrieved`

- **Method:** `onSubdomainDomainRetrieved`
- **Emitted:** yes
- **Callback docs:** string domain uuid, array domain data.
- **Data keys:** `domain_data`, `domain_uuid`

**Source files**

- `backend/app/Controllers/Admin/SubdomainsController.php`

### `featherpanel:admin:subdomains:domains:retrieved`

- **Method:** `onSubdomainDomainsRetrieved`
- **Emitted:** yes
- **Callback docs:** array domains list.
- **Data keys:** `domains`, `filters`, `includeInactive`, `limit`, `page`, `pagination`, `search`, `total`

**Source files**

- `backend/app/Controllers/Admin/SubdomainsController.php`

### `featherpanel:admin:subdomains:domain:updated`

- **Method:** `onSubdomainDomainUpdated`
- **Emitted:** yes
- **Callback docs:** string domain uuid, array old data, array new data.
- **Data keys:** `domain_uuid`, `new_data`, `old_data`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/SubdomainsController.php`

### `featherpanel:admin:subdomains:error`

- **Method:** `onSubdomainsError`
- **Emitted:** no (defined only)
- **Callback docs:** string error message, array context.
- **Data keys:** _none_

**Source files**

- _none_

### `featherpanel:admin:subdomains:settings:updated`

- **Method:** `onSubdomainSettingsUpdated`
- **Emitted:** yes
- **Callback docs:** array settings data.
- **Data keys:** `allow_user_subdomains`, `cloudflare_api_key_set`, `cloudflare_email`, `max_subdomains_per_server`, `settings`, `updated_by`

**Source files**

- `backend/app/Controllers/Admin/SubdomainsController.php`

