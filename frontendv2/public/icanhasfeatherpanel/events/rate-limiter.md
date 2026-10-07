# Events: RateLimiter

4 events in this category.

### `featherpanel:rate-limiter:bulk:update`

- **Method:** `onRateLimiterBulkUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, array updated routes, array errors.
- **Data keys:** `errors`, `updated_routes`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/RateLimitController.php`

### `featherpanel:rate-limiter:delete`

- **Method:** `onRateLimiterDeleted`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string route name.
- **Data keys:** `route_name`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/RateLimitController.php`

### `featherpanel:rate-limiter:global:update`

- **Method:** `onRateLimiterGlobalUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, bool enabled.
- **Data keys:** `enabled`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/RateLimitController.php`

### `featherpanel:rate-limiter:update`

- **Method:** `onRateLimiterUpdated`
- **Emitted:** yes
- **Callback docs:** string|null user uuid, string route name, array config.
- **Data keys:** `config`, `route_name`, `user_uuid`

**Source files**

- `backend/app/Controllers/Admin/RateLimitController.php`

