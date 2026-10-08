# Recipes (Copy-Paste)

Replace `helloplugin` / `HelloPlugin` consistently. Prefer studying [examples.md](./examples.md) for production shapes.

---

## Recipe 1 — Minimal plugin

### `conf.yml`

```yaml
plugin:
  name: HelloPlugin
  identifier: helloplugin
  description: "Hello world FeatherPanel plugin."
  flags: [hasEvents]
  version: 1.0.0
  target: v3
  author: [Example Author]
  icon: "https://cdn.mythical.systems/featherpanel/logo.png"
  requiredConfigs: []
  dependencies:
    - php=8.5
    - php-ext=pdo
```

### `HelloPlugin.php`

```php
<?php
namespace App\Addons\helloplugin;

use App\Plugins\AppPlugin;
use App\Plugins\PluginEvents;

class HelloPlugin implements AppPlugin
{
    public static function processEvents(PluginEvents $event): void {}
    public static function pluginInstall(): void {}
    public static function pluginUninstall(): void {}
}
```

---

## Recipe 2 — Authenticated JSON API

`Routes/helloplugin.php` + `Controllers/User/HelloController.php` — see previous docs / discordplus & featherimages for `registerAuthRoute` + `ApiResponse::success`.

---

## Recipe 3 — Admin setting defaults

Add `config:` entries (see [conf-yml.md](./conf-yml.md)). In `pluginInstall`:

```php
use App\Plugins\PluginSettings;

if (PluginSettings::getSetting('helloplugin', 'greeting') === null) {
    PluginSettings::setSetting('helloplugin', 'greeting', 'Hello from HelloPlugin');
}
```

---

## Recipe 4 — Dashboard widget

`Frontend/widgets.json` + `Frontend/Components/widget.html` — pattern from discordplus (raw banner) or card widgets. Full sample in earlier recipes; page slugs from [../widgets/](../widgets/).

---

## Recipe 5 — Admin sidebar page

`Frontend/sidebar.json` admin section → `component: "/helloplugin/admin.html"` (discordplus-style).

---

## Recipe 6 — Migration + Chat model

SQL in `Migrations/` + class in `Chat/` using `Database::getPdoConnection()` — copy idioms from featherimages ([database.md](./database.md)).

---

## Recipe 7 — Addon Cron (billinglinks-style)

`Cron/HelloPurgeCron.php`:

```php
<?php
namespace App\Addons\helloplugin\Cron;

use App\Cron\Cron;
use App\Cron\TimeTask;
use App\Chat\TimedTask;

class HelloPurgeCron implements TimeTask
{
    public function run(): void
    {
        $cron = new Cron('helloplugin-purge', '1D');
        $cron->runIfDue(function () {
            TimedTask::markRun('helloplugin-purge', true, 'ok');
        });
    }
}
```

---

## Recipe 8 — CLI command

`Commands/HelloWorld.php` implementing `CommandBuilder` → `php fuse helloworld` ([cron-and-commands.md](./cron-and-commands.md)).

---

## Recipe 9 — Server-scoped route (minecraftutils-style)

```php
App::getInstance(true)->registerServerRoute(
    $routes,
    'helloplugin-server-tool',
    '/api/user/servers/{uuidShort}/addons/helloplugin/tool',
    function ($request, $uuidShort) {
        return (new \App\Addons\helloplugin\Controllers\Servers\ToolController())->index($request, $uuidShort);
    },
    ['GET']
);
```

Pair with `sidebar.json` → `server` section + `group`.

---

## Recipe 10 — Public page (billingplans-style)

`Frontend/public.json`:

```json
{
  "pages": [
    {
      "path": "/hello/public",
      "name": "Hello Public",
      "component": "/helloplugin/public.html",
      "nav": { "label": "Hello", "order": 50 },
      "enabled": true
    }
  ]
}
```

Avoid reserved prefixes — [public-pages.md](./public-pages.md).

---

## Recipe 11 — Theme pack

Use Dev template `theme`, or add `Frontend/theme.json` + `theme.css` from [themes.md](./themes.md).

---

## Recipe 12 — UI pack

Use Dev template `ui-pack` for `ui.json`, `overrides.json`, sample `Components/action-panel.html`, and Power SDK `index.js` — [ui-packs.md](./ui-packs.md).

---

## Recipe 13 — Depends on another plugin

```yaml
dependencies:
  - php=8.5
  - php-ext=pdo
  - plugin=billingcore
```

Guard calls to `App\Addons\billingcore\…` if missing.

---

## Recipe 14 — Middleware gate (discordplus-style)

1. `middleware/RequireSomethingMiddleware.php` implementing `MiddlewareInterface`
2. Attach from `processEvents` → `AppEvent::onRouterReady`
3. Default settings **off**; admin bypass required

Details: [middleware-and-hooks.md](./middleware-and-hooks.md).

---

## After creating files

1. Folder === identifier  
2. Reload PHP / panel  
3. Configure in Admin → Plugins  
4. Confirm `/api/system/plugin-sidebar` / `plugin-widgets` include your manifests  
5. Check `backend/storage/logs/` on failure  
