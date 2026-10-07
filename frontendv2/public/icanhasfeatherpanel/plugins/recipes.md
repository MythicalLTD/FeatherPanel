# Plugin Recipes (Copy-Paste)

Replace `helloplugin` / `HelloPlugin` with your identifier and class name. Keep them consistent.

---

## Recipe 1 — Minimal plugin (backend only)

### `conf.yml`

```yaml
plugin:
  name: HelloPlugin
  identifier: helloplugin
  description: "Hello world FeatherPanel plugin."
  flags:
    - hasEvents
  version: 1.0.0
  target: v3
  author:
    - Example Author
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
    public static function processEvents(PluginEvents $event): void
    {
    }

    public static function pluginInstall(): void
    {
    }

    public static function pluginUninstall(): void
    {
    }
}
```

---

## Recipe 2 — Authenticated JSON API

### `Routes/helloplugin.php`

```php
<?php

use App\App;
use App\Addons\helloplugin\Controllers\User\HelloController;
use Symfony\Component\Routing\RouteCollection;

return function (RouteCollection $routes): void {
    App::getInstance(true)->registerAuthRoute(
        $routes,
        'user-helloplugin-ping',
        '/api/user/helloplugin/ping',
        function ($request) {
            return (new HelloController())->ping($request);
        },
        ['GET']
    );
};
```

### `Controllers/User/HelloController.php`

```php
<?php

namespace App\Addons\helloplugin\Controllers\User;

use App\Helpers\ApiResponse;
use App\Plugins\PluginSettings;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class HelloController
{
    public function ping(Request $request): Response
    {
        $user = $request->get('user');

        return ApiResponse::success([
            'message' => 'pong',
            'user' => $user['username'] ?? null,
            'greeting' => PluginSettings::getSetting('helloplugin', 'greeting') ?? 'Hello',
        ]);
    }
}
```

Wire settings in `pluginInstall` + `config:` in `conf.yml` as needed.

---

## Recipe 3 — Admin setting + install defaults

### Add to `conf.yml`

```yaml
config:
  - name: greeting
    display_name: "Greeting"
    type: text
    description: "Text returned by the ping endpoint."
    required: false
    validation: {}
    default: "Hello from HelloPlugin"
```

### Install hook

```php
use App\Plugins\PluginSettings;

public static function pluginInstall(): void
{
    if (PluginSettings::getSetting('helloplugin', 'greeting') === null) {
        PluginSettings::setSetting('helloplugin', 'greeting', 'Hello from HelloPlugin');
    }
}
```

---

## Recipe 4 — Dashboard widget

### `Frontend/widgets.json`

```json
[
  {
    "id": "helloplugin-dashboard",
    "component": "helloplugin/widget.html",
    "enabled": true,
    "priority": 40,
    "page": "dashboard",
    "location": "after-header",
    "pluginName": "HelloPlugin",
    "title": "Hello Plugin",
    "description": "Sample widget",
    "size": "full",
    "card": {
      "enabled": true,
      "padding": "sm",
      "header": { "show": true }
    },
    "iframe": {
      "minHeight": "120px",
      "title": "Hello Plugin",
      "ariaLabel": "Hello Plugin widget"
    }
  }
]
```

### `Frontend/Components/widget.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      body {
        margin: 0;
        font-family: system-ui, sans-serif;
        background: transparent;
        color: inherit;
        padding: 0.75rem 1rem;
      }
      code { font-size: 0.85em; }
    </style>
  </head>
  <body>
    <p>Hello from <strong>HelloPlugin</strong>.</p>
    <p><code id="out">Loading…</code></p>
    <script>
      (async function () {
        try {
          const res = await fetch('/api/user/helloplugin/ping', {
            credentials: 'include',
            headers: { Accept: 'application/json' },
          });
          const json = await res.json();
          document.getElementById('out').textContent = JSON.stringify(json);
        } catch (e) {
          document.getElementById('out').textContent = String(e);
        }
      })();
    </script>
  </body>
</html>
```

Ensure Components are symlinked (`/components/helloplugin/widget.html`). Re-install or recreate the symlink if missing.

---

## Recipe 5 — Admin sidebar page

### `Frontend/sidebar.json`

```json
{
  "client": {},
  "admin": {
    "/hello": {
      "name": "Hello Plugin",
      "lucideIcon": "sparkles",
      "showBadge": false,
      "redirect": "/hello",
      "component": "/helloplugin/admin.html",
      "description": "Hello Plugin admin page",
      "category": "admin",
      "group": "Plugins"
    }
  },
  "server": {}
}
```

### `Frontend/Components/admin.html`

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hello Plugin</title>
    <style>
      body {
        margin: 0;
        padding: 1.5rem;
        font-family: system-ui, sans-serif;
      }
    </style>
  </head>
  <body>
    <h1>Hello Plugin</h1>
    <p>Admin UI loaded from <code>/components/helloplugin/admin.html</code>.</p>
  </body>
</html>
```

---

## Recipe 6 — Migration

### `Migrations/2026-04-08-12.00-helloplugin-logs.sql`

```sql
CREATE TABLE IF NOT EXISTS `featherpanel_helloplugin_logs` (
  `id` INT NOT NULL AUTO_INCREMENT,
  `message` TEXT NOT NULL,
  `level` VARCHAR(20) DEFAULT 'info',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
```

Run via install or:

```bash
php fuse migrate
```

---

## Recipe 7 — Power SDK listener

### `Frontend/index.js` (or script tag in a component)

```js
(function () {
  function boot() {
    var FP = window.FeatherPanel;
    if (!FP || !FP.events) return setTimeout(boot, 50);

    FP.events.on('fp:host:ready', function () {
      FP.toast.info('HelloPlugin ready');
    });

    FP.events.on('fp:route:change', function (payload) {
      console.log('[helloplugin] route', payload);
    });
  }
  boot();
})();
```

How `index.js` is loaded depends on your UI pack / panel version — prefer embedding the boot snippet in a widget/page component if unsure.

---

## Recipe 8 — Depends on another plugin

```yaml
dependencies:
  - php=8.5
  - php-ext=pdo
  - plugin=billingcore
```

Fail closed if the dependency API is missing; check for classes under `App\Addons\billingcore\…` before calling them.

---

## After creating files

1. Confirm folder name === identifier
2. Reload PHP / panel
3. Open Admin → Plugins and configure
4. Hit `/api/user/helloplugin/ping` while logged in
5. Visit dashboard for the widget; `/admin/hello` (or panel’s plugin path) for sidebar UI

For deeper API shapes, see OpenAPI docs. For page slugs, see widgets docs. For PHP hooks, see events docs.
