# AI Agent Guide: Building FeatherPanel Plugins

Use this document as the primary contract when generating or modifying a FeatherPanel plugin. Follow every rule unless the user explicitly overrides it.

## Goal

Produce a valid addon under `backend/storage/addons/{identifier}/` that:

1. Passes `PluginEntryValidator` / `PluginConfig::isConfigValid`
2. Loads via `PluginManager` on boot
3. Optionally exposes API routes, UI (sidebar/widgets), settings, migrations, cron, and CLI commands

## Non-negotiable rules

1. **Folder name === `plugin.identifier`**
2. **`plugin.name` === PHP entry class name** (PascalCase), file `{name}.php` in plugin root
3. **Namespace** must be `App\Addons\{identifier}` for the entry class
4. Entry class **must** `implements App\Plugins\AppPlugin`
5. Identifier regex (runtime): `^[a-zA-Z0-9_]+$` — **no hyphens, no spaces**
6. Prefer **one** root-level PHP entry file (install hooks historically use `glob('*.php')[0]`)
7. `flags` must be a non-empty array containing at least one known flag (usually `hasEvents`)
8. Settings stored via `PluginSettings` are **always strings**
9. Route files live in `Routes/*.php` and **return** `function (RouteCollection $routes): void`
10. Controllers are normal PSR-4 classes — **not** auto-registered; import them from route files
11. Widget/component HTML paths in manifests are relative to `/components/{identifier}/`
12. Do **not** put secrets in `conf.yml` or commit `.env` / API keys inside the addon

## Minimal valid plugin (generate this first)

```
backend/storage/addons/helloplugin/
├── conf.yml
└── HelloPlugin.php
```

### conf.yml

```yaml
plugin:
  name: HelloPlugin
  identifier: helloplugin
  description: "Minimal FeatherPanel plugin example."
  flags:
    - hasEvents
  version: 1.0.0
  target: v3
  author:
    - YourName
  icon: "https://cdn.mythical.systems/featherpanel/logo.png"
  requiredConfigs: []
  dependencies:
    - php=8.5
    - php-ext=pdo
```

### HelloPlugin.php

```php
<?php

namespace App\Addons\helloplugin;

use App\Plugins\AppPlugin;
use App\Plugins\PluginEvents;

class HelloPlugin implements AppPlugin
{
    public static function processEvents(PluginEvents $event): void
    {
        // Register listeners with $event->on(...), or leave empty.
    }

    public static function pluginInstall(): void
    {
    }

    public static function pluginUninstall(): void
    {
    }

    // Optional:
    // public static function pluginUpdate(?string $oldVersion, ?string $newVersion): void {}
}
```

## Scaffolding options

### A. Panel UI (requires `APP_DEVELOPER_MODE=true`)

Admin → Dev → Plugins → Create. Templates:

| Template | Creates |
|----------|---------|
| `empty` | `conf.yml` + entry class |
| `starter` | Examples: migrations, cron, command, routes, controllers, frontend |
| `fresh` | Empty dirs only |
| `theme` | `Frontend/theme.json` + `theme.css` |
| `ui-pack` | `Frontend/ui.json`, `overrides.json`, sample components |

API: `POST /api/admin/plugin-manager`

### B. Manual / AI generation

Create the directory tree yourself following this guide and [recipes.md](./recipes.md).

## Decision tree (what to generate)

| User wants… | Create… |
|-------------|---------|
| HTTP API only | `Routes/` + `Controllers/` (+ optional `processEvents`) |
| Admin settings UI | `config:` array in `conf.yml` + `PluginSettings` on install |
| Sidebar page | `Frontend/sidebar.json` + HTML under `Frontend/Components/` |
| Inject UI into existing page | `Frontend/widgets.json` + component HTML |
| Public unauthenticated page | `Frontend/public.json` |
| Theme tokens | `Frontend/theme.json` + `theme.css` |
| Layout takeover | `Frontend/ui.json` (+ optional `overrides.json`) |
| DB tables | `Migrations/*.sql` |
| Scheduled job | `Cron/*.php` with `run()` |
| CLI command | `Commands/*.php` implementing `CommandBuilder` |
| Marketplace package | Zip as `.fpa` (see [packaging.md](./packaging.md)) |

## AppPlugin lifecycle

| Method | Required | When |
|--------|----------|------|
| `processEvents(PluginEvents $event)` | Yes | Every boot after plugin load |
| `pluginInstall()` | Yes | Fresh install |
| `pluginUninstall()` | Yes | Uninstall |
| `pluginUpdate(?string $old, ?string $new)` | Optional | Update path; else install may re-run |

Register PHP listeners **only** inside `processEvents()` during boot.

Common router hook:

```php
use App\Plugins\Events\Events\AppEvent;

$event->on(AppEvent::onRouterReady(), function ($payload) {
    $router = is_array($payload) ? ($payload['router'] ?? null) : $payload;
    // mutate RouteCollection if needed
});
```

Note: `PluginEvents::emit` passes payload values positionally; accept both object and `['router' => …]`.

## Flags (metadata)

Known flags: `hasEvents`, `hasInstallScript`, `hasRemovalScript`, `hasUpdateScript`, `developerIgnoreInstallScript`, `developerEscalateInstallScript`, `userEscalateInstallScript`.

`hasEvents` does **not** gate loading — include it when you use events; always implement `processEvents` anyway.

## Dependencies (`plugin.dependencies[]`)

| Prefix | Example |
|--------|---------|
| `php=` | `php=8.5` |
| `php-ext=` | `php-ext=pdo` |
| `composer=` | `composer=guzzlehttp/guzzle:^7` |
| `plugin=` | `plugin=billingcore` |

## Frontend manifests (optional files)

| File | Aggregated by |
|------|----------------|
| `Frontend/widgets.json` | `GET /api/system/plugin-widgets` |
| `Frontend/sidebar.json` | `GET /api/system/plugin-sidebar` |
| `Frontend/public.json` | `GET /api/system/plugin-public-pages` |
| `Frontend/ui.json` | `GET /api/system/plugin-ui-packs` |
| `Frontend/theme.json` | `GET /api/system/plugin-themes` |
| `Frontend/overrides.json` | With UI packs |

On install, panel symlinks:

- `Public/` → `backend/public/addons/{identifier}/`
- `Frontend/Components/` → `backend/public/components/{identifier}/`

Widget `component` field example: `"helloplugin/widget.html"` → `/components/helloplugin/widget.html`.

## Visibility rules

`enabled` / `hidden` may be:

```json
true
```

or

```json
{ "type": "plugin_setting", "key": "hide-widget", "equals": "true" }
```

Types: `always` | `never` | `plugin_setting`.

## Settings API (PHP)

```php
use App\Plugins\PluginSettings;

PluginSettings::setSetting('helloplugin', 'api_key', $value);
$value = PluginSettings::getSetting('helloplugin', 'api_key'); // ?string
```

Admin HTTP: `POST /api/admin/plugins/{identifier}/settings/set` body `{ "key", "value" }`.

`requiredConfigs` lists setting keys that must exist before the plugin is considered configured.

## Validation checklist (run mentally before finishing)

- [ ] `conf.yml` has all required `plugin.*` fields with correct types
- [ ] Identifier matches folder and has no hyphens
- [ ] Entry class namespace/class/file/name aligned
- [ ] Implements `AppPlugin` with install/uninstall/processEvents
- [ ] Flags array valid
- [ ] Route files return a closure; no filename colliding with another plugin id
- [ ] SQL migrations use `featherpanel_{identifier}_*` table prefix
- [ ] Frontend JSON is valid JSON
- [ ] Widget pages/locations exist (see widgets docs)
- [ ] No absolute panel source paths hardcoded for production assets
- [ ] Booleans in settings are `"true"`/`"false"` strings when using plugin_setting visibility

## Pitfalls (do not repeat)

1. Using `plugin.name` as a human display title — use sidebar `name` / widget `title` instead
2. Hyphenated identifiers (`my-plugin`) — use `my_plugin` or `myplugin`
3. Expecting Controllers to auto-load
4. Putting mixins only under `plugin.mixins` — runtime historically reads root-level `mixins:` (prefer documenting/avoiding mixins unless you verify both)
5. Storing PHP booleans in PluginSettings
6. Referencing components as `/addons/...` instead of `/components/...`
7. Forgetting to rebuild Vite plugin apps into `Frontend/Components/...` paths referenced by JSON
8. Listening to events outside `processEvents` / after boot

## Cross-references to fetch next

1. [getting-started.md](./getting-started.md) — full layout
2. [conf-yml.md](./conf-yml.md) — field reference
3. [backend.md](./backend.md) — routes/events/cron
4. [frontend.md](./frontend.md) — manifests
5. [power-sdk.md](./power-sdk.md) — JS host API
6. [recipes.md](./recipes.md) — complete examples
7. Site: widgets, events, permissions, OpenAPI for page slugs and API shapes
