# Getting Started with FeatherPanel Plugins

## Prerequisites

- FeatherPanel with a working backend (`backend/`)
- PHP 8.5+ recommended (declare with `php=` dependency)
- For UI scaffolding: `APP_DEVELOPER_MODE=true` in backend env
- Optional: Node/Vite if you ship a compiled frontend app inside the plugin

## Where plugins live

```
backend/storage/addons/{identifier}/
```

Composer PSR-4 maps `App\Addons\` → `storage/addons/` (relative to `backend/`).

Obsolete leftover addon folder names are skipped at load time (`yetanotherbadupdate`, `whitelabel`, `navlayout`, `notsofeatherai`).

## Recommended directory layout

```
{identifier}/
├── conf.yml                 # Required
├── {EntryClass}.php         # Required AppPlugin entry
├── Routes/                  # Auto-loaded route registrars
│   └── {identifier}.php
├── Controllers/             # Your HTTP controllers (manual wiring)
├── Chat/                    # Optional DB model classes
├── Helpers/                 # Optional helpers
├── middleware/              # Optional middleware classes
├── Migrations/              # *.sql run on install + `php fuse migrate`
├── Cron/                    # Scheduled tasks (runner.php)
├── Commands/                # CLI: `php fuse {CommandName}`
├── Events/                  # Optional plugin-local event helpers
├── Public/                  # → /addons/{identifier}/
├── Storage/                 # Preserved across marketplace updates
├── Frontend/
│   ├── sidebar.json
│   ├── widgets.json
│   ├── public.json          # Optional
│   ├── ui.json              # Optional UI pack
│   ├── theme.json           # Optional
│   ├── overrides.json       # Optional
│   ├── index.js             # Optional Power SDK script
│   ├── Components/          # → /components/{identifier}/
│   └── App/                 # Optional Vite/React/Vue app source
└── README.md
```

You do not need every folder. Start with `conf.yml` + entry class.

## Create a plugin (developer mode)

1. Enable `APP_DEVELOPER_MODE=true`
2. Open Admin → Dev → Plugins → Create
3. Choose a template (`empty`, `starter`, `fresh`, `theme`, `ui-pack`)
4. Panel writes files under `storage/addons/{identifier}/`, runs migrations, calls `pluginInstall()`, and creates asset symlinks

HTTP: `POST /api/admin/plugin-manager` with JSON fields including `name`, `identifier`, `description`, `template`, `author`, `version`, `flags`, `dependencies`, `requiredConfigs`, etc.

## Create a plugin (manual)

1. Create `backend/storage/addons/myplugin/`
2. Add `conf.yml` and `MyPlugin.php` (see [ai-guide.md](./ai-guide.md))
3. Reload the panel / restart PHP-FPM so Composer/opcache picks up new classes
4. Enable/install via Admin → Plugins if using the installed-plugins DB flow

## Boot sequence (how your plugin is loaded)

1. Kernel creates `PluginManager` + `PluginEvents` (`backend/boot/kernel.php`)
2. `PluginManager::loadKernel()` scans addon dirs, validates config/deps, loads mixins
3. For each plugin: `PluginProcessor::process()` → `YourPlugin::processEvents($eventManager)`
4. Later: core routes register, then each `Routes/*.php` from addons is included
5. `AppEvent::onRouterReady` is emitted with the `RouteCollection`

## Terminology

| Term | Meaning |
|------|---------|
| Plugin / Addon | Same thing — directory under `storage/addons` |
| Identifier | Unique id, folder name, settings namespace |
| Entry class | Root PHP class implementing `AppPlugin` |
| Spell / Realm | Game egg/nest replacements — use these words in APIs, not “egg/nest” |
| `.fpa` | Packaged addon zip for install/marketplace |

## Next steps

- Manifest details → [conf-yml.md](./conf-yml.md)
- Backend APIs → [backend.md](./backend.md)
- UI → [frontend.md](./frontend.md)
- End-to-end examples → [recipes.md](./recipes.md)
