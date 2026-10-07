# Backend Plugin Development

Core classes live under `backend/app/Plugins/`. Your code lives under `backend/storage/addons/{identifier}/`.

## Entry class (`AppPlugin`)

Interface: `App\Plugins\AppPlugin`

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

### Lifecycle

| Hook | Caller | Notes |
|------|--------|-------|
| `processEvents` | `PluginProcessor` on every boot | Register `$event->on(...)` listeners here |
| `pluginInstall` | Install / create flows | Seed settings, create dirs |
| `pluginUpdate` | Update flows | Migrate data; often re-call install defaults |
| `pluginUninstall` | Uninstall | Cleanup; settings may remain until cleared |

## Routes

### Auto-loading

Every file matching `Routes/*.php` is loaded when the panel registers API routes.

Requirements:

1. File **returns** a callable: `return function (RouteCollection $routes): void { ... };`
2. Basename should not collide with another addon’s identifier (copy-paste guard)

Controllers are **not** auto-discovered. Instantiate them from the route closure.

### Example route file

`Routes/myplugin.php`:

```php
<?php

use App\App;
use App\Permissions;
use App\Addons\myplugin\Controllers\Admin\MyPluginController;
use App\Addons\myplugin\Controllers\User\MyPluginController as UserMyPluginController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAdminRoute(
        $routes,
        'admin-myplugin-status',
        '/api/admin/myplugin/status',
        function ($request) {
            return (new MyPluginController())->status($request);
        },
        Permissions::ADMIN_ROOT, // pick a real permission
        ['GET']
    );

    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-myplugin-status',
        '/api/user/myplugin/status',
        function ($request) {
            return (new UserMyPluginController())->status($request);
        },
        ['GET']
    );
};
```

Use the same response helpers as core controllers (`ApiResponse`, etc.). Follow existing addon controllers (e.g. `discordplus`) for patterns.

### `onRouterReady`

After routes are registered, the panel emits `AppEvent::onRouterReady()`. Use this to attach middleware or mutate the collection:

```php
use App\Plugins\Events\Events\AppEvent;

public static function processEvents(PluginEvents $event): void
{
    $event->on(AppEvent::onRouterReady(), function ($payload) {
        $router = is_array($payload) ? ($payload['router'] ?? null) : $payload;
        if ($router !== null) {
            // attach middleware / extra routes
        }
    });
}
```

## Plugin events catalog

Domain events live in `backend/app/Plugins/Events/Events/*.php`. Each class exposes static methods returning event name strings (e.g. `ServerEvent::onServerCreated()`).

Browse the published docs:

- HTML: `/icanhasfeatherpanel/events/`
- Generated from the same source as the panel

Register listeners only in `processEvents`.

Example pattern:

```php
$event->on(SomeEvent::onSomething(), function (...$args) {
    // handle
});
```

## Settings (`PluginSettings`)

```php
use App\Plugins\PluginSettings;

PluginSettings::setSetting($identifier, $key, (string) $value);
PluginSettings::getSetting($identifier, $key);      // ?string
PluginSettings::getSettings($identifier);            // all rows
PluginSettings::deleteSettings($identifier, $key);   // soft-delete
```

Admin API:

- Set: `POST /api/admin/plugins/{identifier}/settings/set` `{ "key": "...", "value": "..." }`
- Emits `PluginsSettingsEvent` on update

Seed defaults in `pluginInstall()` so `requiredConfigs` and visibility rules work.

## Migrations

Path: `Migrations/*.sql`

- Run on addon install (`CloudPluginsController::runAddonMigrations`)
- Also via `php fuse migrate`
- Tracked in `featherpanel_migrations` with a plugin namespace prefix

Conventions:

- Prefer table names `featherpanel_{identifier}_…`
- Idempotent SQL (`CREATE TABLE IF NOT EXISTS`, `INSERT IGNORE`) when possible
- Timestamp-style filenames (starter scaffold uses `Y-m-d-H.i`)

## Cron jobs

Path: `Cron/*.php`

Loaded by `backend/storage/cron/runner.php` (not the core `storage/cron/php/` tree).

Typical pattern (see billing addons):

```php
namespace App\Addons\myplugin\Cron;

use App\Cron\Cron;
use App\Cron\TimeTask;

class MyPurgeCron implements TimeTask
{
    public function run()
    {
        $cron = new Cron('myplugin-purge', '1D');
        $cron->runIfDue(function () {
            // work
        });
    }
}
```

Namespace for plugin crons is usually `App\Addons\{identifier}\Cron\…`. Some scaffolds historically used `App\Cron\` — prefer the addon namespace to avoid collisions.

## CLI commands

Path: `Commands/*.php`

Discovered by `backend/app/Cli/App.php`. Invoke:

```bash
php fuse {CommandName}
```

Class should implement `App\Cli\CommandBuilder` with `execute`, `getDescription`, `getSubCommands`.

Namespace: `App\Addons\{identifier}\Commands\{CommandName}`.

## Models / Chat layer

Optional `Chat/` classes for plugin tables, following core `App\Chat\*` PDO patterns. Namespace: `App\Addons\{identifier}\Chat\…`.

## Logging

```php
\App\App::getInstance(true)->getLogger()->error('myplugin: …');
```

Never log secrets, tokens, or passwords.

## Permissions

Reuse core permission constants from `App\Permissions` for admin routes. See the permissions docs section of icanhasfeatherpanel for the full node list. Plugins rarely ship new global permission nodes unless integrated with the panel’s permission system deliberately.

## Public / Storage directories

| Dir | Purpose |
|-----|---------|
| `Public/` | Symlinked to `backend/public/addons/{identifier}/` |
| `Storage/` | Durable plugin data; preserved across marketplace reinstall/update |
| `Frontend/Components/` | Symlinked to `backend/public/components/{identifier}/` |

## Testing tips

1. Validate package: ensure `PluginEntryValidator::validatePackage` would pass (conf + entry class)
2. Hit your routes with auth cookies / API keys like core endpoints
3. Confirm migrations applied (`featherpanel_migrations`)
4. Confirm frontend JSON appears in `/api/system/plugin-*` aggregators when enabled
