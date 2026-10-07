# Real Plugin Examples (Patterns, Not Clones)

These are **real addons** that ship with / are developed against FeatherPanel. Use them as pattern references — copy structure and idioms, not entire products.

All paths are under `backend/storage/addons/{identifier}/`.

## Gallery

| Identifier | Good for learning | Notable pieces |
|------------|-------------------|----------------|
| **discordplus** | Settings UI, middleware gate, widgets, admin sidebar page | `config:`, `middleware/`, `widgets.json`, `sidebar.json`, `Frontend/index.js` |
| **featherimages** | Migrations + Chat models + Vite client/admin apps | `Chat/`, `Migrations/`, `Frontend/App/`, dual sidebar |
| **minecraftutils** | Multi-route server addon + server sidebar group | Several `Routes/*.php`, `registerServerRoute`, `Libs/` |
| **minecraftpluginmanger** | Required API key setting + server UI | `requiredConfigs`, CurseForge key in `config:` |
| **bedrockaddoninstaller** | Server-scoped search API | `Controllers/Servers/`, server routes |
| **fivemutils** | Server config APIs + curl deps | `php-ext=curl`, `Routes/fivem.php` |
| **billinglinks** | Plugin dependency + Cron + Chat | `plugin=billingcore`, `Cron/LinkPurgeCron.php` |
| **devutils** | CLI generators for plugin authors | `Commands/*` (`php fuse …`) |
| **billingplans** | Public pages with setting visibility | `Frontend/public.json` |

---

## discordplus — settings + gate + widgets

**Why study it:** richest “panel integration” example that is still readable.

### conf.yml highlights

```yaml
plugin:
  name: DiscordPlus
  identifier: discordplus
  flags: [hasEvents, hasInstallScript, hasRemovalScript, hasUpdateScript]
  # …
config:
  - name: require_discord_link
    type: boolean
    default: "false"
  # allow_admin_bypass, block_api_keys, gate_message …
```

### Entry class pattern

- Listens to `AppEvent::onRouterReady()`
- Attaches middleware via a helper (`Helpers/RouteGuard.php`)
- Seeds defaults in `pluginInstall()` with `PluginSettings::setSetting`

### Frontend

- `Frontend/widgets.json` — dashboard + account banners (`useRawRendering`, `borderless`) and `admin-users-edit` card
- `Frontend/sidebar.json` — admin page `/discordplus` → `/discordplus/dist/admin.html`
- `Frontend/index.js` — waits for `window.FeatherPanel.api`, polls `/api/user/discordplus/status`

### Middleware

Folder is lowercase `middleware/`. Class implements `App\Middleware\MiddlewareInterface`. Not declared in `conf.yml` — wired from PHP on router ready.

---

## featherimages — database + dual UI

**Why study it:** clean Chat/Migration/Vite stack.

```
featherimages/
├── FeatherImages.php
├── conf.yml
├── Chat/Upload.php          # PDO model → featherpanel_imagehosting_*
├── Migrations/*.sql
├── Controllers/{User,Admin}/
├── Routes/
└── Frontend/
    ├── sidebar.json         # client + admin
    └── App/                 # Vite → dist/*.html under Components
```

Chat model idiom (`Chat/Upload.php`):

```php
namespace App\Addons\featherimages\Chat;

use App\Chat\Database;

class Upload
{
    private static string $table = 'featherpanel_imagehosting_uploads';

    public static function getById(int $id): ?array
    {
        $pdo = Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM ' . self::$table . ' WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $result = $stmt->fetch(\PDO::FETCH_ASSOC);
        return $result ?: null;
    }
}
```

---

## minecraftutils — server routes + sidebar group

**Why study it:** server-scoped APIs and nav grouping.

Route style (conceptually):

```php
App::getInstance(true)->registerServerRoute(
    $routes,
    'mcutils-player-manager',
    '/api/user/servers/{uuidShort}/addons/mcutils/playermanager',
    /* controller */,
    /* methods */
);
```

Sidebar (note: only `server` / `admin` / `client` / `vds` / `webspace` are merged — a top-level `"dashboard": {}` key is **ignored**):

```json
{
  "server": {
    "/minecraftutils": {
      "name": "Minecraft Utils",
      "lucideIcon": "wrench",
      "redirect": "/minecraftutils",
      "component": "/mcutils/dist/index.html",
      "group": "Minecraft Java Edition",
      "category": "server"
    }
  }
}
```

---

## billinglinks — depends on another plugin + Cron

```yaml
dependencies:
  - php=8.5
  - php-ext=pdo
  - plugin=billingcore
```

Canonical Cron (`Cron/LinkPurgeCron.php`):

```php
namespace App\Addons\billinglinks\Cron;

use App\Cron\Cron;
use App\Cron\TimeTask;
use App\Chat\TimedTask;

class LinkPurgeCron implements TimeTask
{
    public function run(): void
    {
        $cron = new Cron('billinglinks-link-purge', '1D');
        $cron->runIfDue(function () {
            // purge work…
            TimedTask::markRun('billinglinks-link-purge', true, 'Link purge completed');
        });
    }
}
```

Namespace **must** be `App\Addons\{identifier}\Cron` for the addon cron runner.

---

## minecraftpluginmanger — requiredConfigs

```yaml
plugin:
  identifier: minecraftpluginmanger   # typo is historical — keep identifiers stable
  requiredConfigs:
    - curseforge_api_key
config:
  - name: curseforge_api_key
    type: text
    required: true
```

Until the setting exists in DB, the plugin is treated as not fully configured.

---

## billingplans — public.json

```json
{
  "pages": [
    {
      "path": "/billing/plans",
      "name": "Billing Plans",
      "component": "/billingplans/dist/client.html",
      "query": { "public": "1" },
      "fallbackPath": "/dashboard/billing/plans",
      "nav": { "label": "Plans", "order": 30 },
      "enabled": {
        "type": "plugin_setting",
        "key": "plans_public_enabled",
        "equals": "true"
      }
    }
  ]
}
```

See [public-pages.md](./public-pages.md) for reserved path rules.

---

## devutils — author tooling

CLI commands under `Commands/` generate migrations, cron, plugin commands, frontend watch helpers, etc.

```bash
php fuse makeplugincron
php fuse exportpermissions
```

Class `MakePluginCron` → invoke name is the lowercased class basename.

---

## What is *not* in live OSS addons (use scaffolds)

| Feature | Live examples? | Where to learn |
|---------|----------------|----------------|
| `theme.json` / `theme.css` | No live pack | Dev template `theme` → [themes.md](./themes.md) |
| `ui.json` / `overrides.json` | No live pack | Dev template `ui-pack` → [ui-packs.md](./ui-packs.md) |
| Mixins in `conf.yml` | None installed | [mixins.md](./mixins.md) + core `App\Plugins\Mixins\*` |

Create those via Admin → Dev → Plugins → template **theme** or **ui-pack** (`APP_DEVELOPER_MODE=true`).

---

## How to study a plugin efficiently (LLM checklist)

1. Read `conf.yml` (identifier, flags, deps, config schema)
2. Open root `*Plugin*.php` / entry class — lifecycle + events
3. List `Routes/*.php` — API surface
4. Skim `Frontend/{sidebar,widgets,public}.json` — UI surface
5. Check `Migrations/`, `Cron/`, `Commands/`, `Chat/`, `middleware/`
6. Note how Vite `Frontend/App` maps to `component` paths (`/{id}/dist/….html`)
