# Backend Plugin Development

Core runtime: `backend/app/Plugins/*`  
Your code: `backend/storage/addons/{identifier}/`

## Optional backend folders (complete)

| Folder | Role | Examples |
|--------|------|----------|
| `Routes/` | Auto-loaded route registrars | discordplus, featherimages, minecraftutils |
| `Controllers/` | HTTP handlers (manual wire) | all feature plugins |
| `Chat/` | PDO models | featherimages, billinglinks |
| `Migrations/` | SQL | featherimages, billinglinks |
| `Cron/` | Scheduled tasks | billinglinks |
| `Commands/` | `php fuse …` | devutils |
| `Helpers/` / `Services/` / `Libs/` | Shared PHP | discordplus, minecraftutils |
| `middleware/` | HTTP middleware classes | discordplus |
| `Events/` | Plugin-local helpers | discordplus, fivemutils |
| `Mail/` | Optional mail templates | some billing addons |
| `Public/` | → `/addons/{id}/` | discordplus, fivemutils |
| `Storage/` | Durable files (preserved on update) | marketplace installs |

## Entry class (`AppPlugin`)

```php
namespace App\Addons\myplugin;

use App\Plugins\AppPlugin;
use App\Plugins\PluginEvents;

class MyPlugin implements AppPlugin
{
    public static function processEvents(PluginEvents $event): void {}
    public static function pluginInstall(): void {}
    public static function pluginUninstall(): void {}
    // optional:
    public static function pluginUpdate(?string $oldVersion, ?string $newVersion): void {}
}
```

| Hook | When |
|------|------|
| `processEvents` | Every boot — register `$event->on(...)` |
| `pluginInstall` | Fresh install — seed settings |
| `pluginUpdate` | Update path |
| `pluginUninstall` | Uninstall cleanup |

Resolution: `App\Addons\{id}\{plugin.name}` with fallback to single root `AppPlugin`.

### Real — discordplus install seeding

```php
PluginSettings::setSetting('discordplus', 'require_discord_link', 'false');
```

### Real — discordplus router hook

```php
$event->on(AppEvent::onRouterReady(), function ($payload) {
    $router = is_array($payload) ? ($payload['router'] ?? null) : $payload;
    if ($router !== null) {
        RouteGuard::attach($router);
    }
});
```

## Routes

Each `Routes/*.php` **returns**:

```php
return function (RouteCollection $routes): void {
    // register…
};
```

Helpers (via `App::getInstance(true)`):

- `registerAuthRoute` — logged-in user APIs (`discordplus`, `featherimages`)
- `registerAdminRoute` — admin + permission node (`featherimages` admin)
- `registerServerRoute` — server-scoped (`minecraftutils`, `bedrockaddoninstaller`, `fivemutils`)

### Auth route sketch (discordplus-style)

```php
App::getInstance(true)->registerAuthRoute(
    $routes,
    'user-discordplus-status',
    '/api/user/discordplus/status',
    function ($request) {
        return (new UserController())->status($request);
    },
    ['GET']
);
```

### Server route sketch (minecraftutils-style)

```php
App::getInstance(true)->registerServerRoute(
    $routes,
    'mcutils-player-manager',
    '/api/user/servers/{uuidShort}/addons/mcutils/playermanager',
    function ($request, $uuidShort) {
        return (new PlayerManagerController())->index($request, $uuidShort);
    },
    ['GET']
);
```

**Controllers are not auto-discovered** — import and call them from the route closure.

Route basename should not equal another addon’s identifier (copy-paste guard).

## Settings

```php
use App\Plugins\PluginSettings;

PluginSettings::setSetting($id, $key, (string) $value);
PluginSettings::getSetting($id, $key); // ?string
PluginSettings::getSettings($id);
PluginSettings::deleteSettings($id, $key);
```

Admin HTTP: `POST /api/admin/plugins/{identifier}/settings/set` `{ "key", "value" }`.

Schema for the admin UI comes from top-level `config:` in `conf.yml` — see [conf-yml.md](./conf-yml.md).  
`requiredConfigs` lists keys that must exist for “configured” status (`minecraftpluginmanger` / CurseForge key).

## Permissions

Use `App\Permissions` constants on admin routes. Full list: [../permissions/](../permissions/) and `../permissions/all.json`.

## Plugin PHP events

Catalog: [../events/](../events/) + `../events/all.json`.  
Registration details: [middleware-and-hooks.md](./middleware-and-hooks.md).

## Dependencies between plugins

```yaml
dependencies:
  - plugin=billingcore
```

Real: `billinglinks` depends on `billingcore`. Fail closed if classes are missing.

## Logging

```php
\App\App::getInstance(true)->getLogger()->error('myplugin: …');
```

Never log tokens/passwords.

## Related

- [database.md](./database.md) · [cron-and-commands.md](./cron-and-commands.md) · [middleware-and-hooks.md](./middleware-and-hooks.md) · [examples.md](./examples.md) · [mixins.md](./mixins.md)
