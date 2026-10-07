# Events: ServerProxy

2 events in this category.

### `featherpanel:server:proxy:create`

- **Method:** `onServerProxyCreated`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int|null proxy id, string domain, int port.
- **Data keys:** `domain`, `port`, `proxy_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerProxyController.php`

### `featherpanel:server:proxy:delete`

- **Method:** `onServerProxyDeleted`
- **Emitted:** yes
- **Callback docs:** string user uuid, string server uuid, int|null proxy id, string domain, int port.
- **Data keys:** `domain`, `port`, `proxy_id`, `server_uuid`, `user_uuid`

**Source files**

- `backend/app/Controllers/User/Server/ServerProxyController.php`

