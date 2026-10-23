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
| `Commands/` | `php cli …` | devutils |
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
use Symfony\Component\HttpFoundation\Request;

App::getInstance(true)->registerServerRoute(
    $routes,
    'mcutils-player-manager',
    '/api/user/servers/{uuidShort}/addons/mcutils/playermanager',
    function (Request $request, array $args) {
        $uuidShort = $args['uuidShort'];

        return (new PlayerManagerController())->index($request, $uuidShort);
    },
    'uuidShort', // name of the route parameter that holds the server short UUID
    ['GET']
);
```

`registerServerRoute($routes, $name, $path, $controller, $serverShortUuid, $methods = ['GET'], $rateLimit = null, $rateLimitNamespace = null)`:

- `$serverShortUuid` is **required** and comes before `$methods`. It is the name of the path placeholder (here `'uuidShort'`), not the value. `ServerMiddleware` reads that parameter, loads the server, checks that the user can access it and rejects suspended servers before your closure runs.
- Every route closure (auth, admin, server, API) is called as `function (Request $request, array $args)`. `$args` holds the path parameters by name, for example `$args['uuidShort']`. A closure written as `function ($request, $uuidShort)` gets that array, not the string.
- The other helpers have no server argument: `registerAuthRoute($routes, $name, $path, $controller, $methods, ...)` and `registerAdminRoute($routes, $name, $path, $controller, $permission, $methods, ...)`.

**Controllers are not auto-discovered** — import and call them from the route closure.

Route basename should not equal another addon’s identifier (copy-paste guard).

## Settings

```php
use App\Plugins\PluginSettings;

PluginSettings::setSetting($id, $key, (string) $value);
PluginSettings::getSetting($id, $key); // ?string
PluginSettings::getSettings($id);      // raw rows (key, value, ...)
PluginSettings::getSettingValues($id); // ['key' => 'value', ...]
PluginSettings::applyDefaults($id);    // save conf.yml defaults for keys that are not stored yet
PluginSettings::deleteSettings($id, $key);
```

Admin HTTP: `POST /api/admin/plugins/{identifier}/settings/set` `{ "key", "value" }`. When the key is declared under `config:` in `conf.yml`, the value is checked against `required` and `validation` first and a failing value returns `400` with `error_code: PLUGIN_SETTING_INVALID`. `PluginSettings::setSetting()` from PHP does not run these checks.

The admin UI form, the defaults and the validation rules come from top-level `config:` in `conf.yml`. See [conf-yml.md](./conf-yml.md#config-admin-settings).  
`requiredConfigs` lists keys that must have a non-empty value before the plugin counts as configured (`minecraftpluginmanger` / CurseForge key). A plugin with missing settings is still loaded; the admin plugin list shows it as "Not configured". Call `PluginRequiredConfigs::getMissingConfigs($id)` or `PluginRequiredConfigs::areRequiredConfigsSet($id)` from your own code if a feature must not run without them.

## Permissions

Use `App\Permissions` constants on admin routes. Full list: [../permissions/](../permissions/) and `../permissions/all.json`.

## Plugin PHP events

Complete list and listener example: [events.md](./events.md). Payload keys per event: [../events/](../events/) + `../events/all.json`.  
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
