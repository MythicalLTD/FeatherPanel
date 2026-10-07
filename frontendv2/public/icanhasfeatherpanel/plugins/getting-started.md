# Getting Started

## Prerequisites

- Working FeatherPanel backend (`backend/`)
- PHP 8.5+ recommended (`php=` dependency)
- `APP_DEVELOPER_MODE=true` for UI scaffolding / export
- Optional Node/Vite for `Frontend/App` SPAs

## Where plugins live

```
backend/storage/addons/{identifier}/
```

Composer PSR-4: `App\Addons\` → `storage/addons/` (from `backend/`).

Obsolete leftover names are skipped (`ObsoleteAddons`).

## Recommended full layout

```
{identifier}/
├── conf.yml
├── {EntryClass}.php
├── Routes/
├── Controllers/
├── Chat/
├── Helpers/  Services/  Libs/  middleware/
├── Migrations/
├── Cron/
├── Commands/
├── Events/
├── Public/
├── Storage/
├── Frontend/
│   ├── sidebar.json
│   ├── widgets.json
│   ├── public.json
│   ├── theme.json + theme.css
│   ├── ui.json + overrides.json
│   ├── index.js + index.css
│   ├── Components/
│   └── App/
└── README.md
```

Start with `conf.yml` + entry class. Add folders only when needed. See [examples.md](./examples.md).

## Create options

### A. Developer UI

1. `APP_DEVELOPER_MODE=true`
2. Admin → Dev → Plugins → Create
3. Templates: `empty` | `starter` | `fresh` | `theme` | `ui-pack`
4. Panel writes files, runs migrations, `pluginInstall()`, creates asset symlinks

API: `POST /api/admin/plugin-manager`

### B. Manual / AI

Follow [ai-guide.md](./ai-guide.md) + [recipes.md](./recipes.md). Study [examples.md](./examples.md).

### C. Author tooling (`devutils`)

```bash
php fuse makeplugincron
php fuse makeplugincommand
php fuse makemigration
```

## Boot sequence

1. Kernel creates `PluginManager` + `PluginEvents`
2. `loadKernel()` validates each addon, deps, mixins
3. `processEvents($eventManager)` per plugin
4. Core routes + each `Routes/*.php`
5. `AppEvent::onRouterReady` with `RouteCollection`
6. Frontend fetches aggregated `/api/system/plugin-*` manifests

## First feature ideas

| Goal | Next doc |
|------|----------|
| JSON API | [backend.md](./backend.md) + Recipe 2 |
| Admin setting | [conf-yml.md](./conf-yml.md) |
| Dashboard widget | [frontend.md](./frontend.md) |
| Server sidebar page | [examples.md](./examples.md) (minecraftutils) |
| Cron cleanup | [cron-and-commands.md](./cron-and-commands.md) |
| Theme pack | [themes.md](./themes.md) |
| Public storefront page | [public-pages.md](./public-pages.md) |

## Terminology

| Term | Meaning |
|------|---------|
| Plugin / Addon | Same — `storage/addons` directory |
| Identifier | Folder name + settings namespace |
| Entry class | Root `AppPlugin` implementation |
| Spell / Realm | Use these (not egg/nest) |
| `.fpa` | Packaged zip for install |
