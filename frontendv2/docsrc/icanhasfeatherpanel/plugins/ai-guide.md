# AI / LLM Agent Guide: FeatherPanel Plugins

Primary contract for generating or modifying plugins. Follow every rule unless the user overrides it.

## Goal

Produce a valid addon under `backend/storage/addons/{identifier}/` that:

1. Passes `PluginEntryValidator` / `PluginConfig::isConfigValid`
2. Loads via `PluginManager`
3. Optionally exposes APIs, UI, settings, DB, cron, CLI, themes, UI packs

## Non-negotiable rules

1. Folder name === `plugin.identifier`
2. `plugin.name` === PHP entry class name → `{Name}.php` in plugin root
3. Namespace `App\Addons\{identifier}` for entry class
4. Entry implements `App\Plugins\AppPlugin` (`processEvents`, `pluginInstall`, `pluginUninstall`; optional `pluginUpdate`)
5. Identifier: `^[a-zA-Z0-9_]+$` (no hyphens)
6. Prefer **one** root-level PHP entry file
7. `flags` non-empty with at least one known flag (usually `hasEvents`)
8. `PluginSettings` values are **strings**
9. `Routes/*.php` **return** `function (RouteCollection $routes): void`
10. Controllers are **not** auto-registered
11. Widget/component paths resolve under `/components/{identifier}/`
12. Sidebar sections: only `admin|client|server|vds|webspace` (not `dashboard`)
13. Addon Cron namespace: `App\Addons\{id}\Cron` (not `App\Cron`)
14. No secrets in `conf.yml` or committed env files

## Full capability map

| Need | Create | Doc |
|------|--------|-----|
| Manifest | `conf.yml` | [conf-yml.md](./conf-yml.md) |
| Lifecycle / listeners | Entry `AppPlugin` | [backend.md](./backend.md) |
| HTTP API | `Routes/` + `Controllers/` | [backend.md](./backend.md) |
| Admin settings UI | top-level `config:` + `PluginSettings` | [conf-yml.md](./conf-yml.md) |
| DB schema | `Migrations/*.sql` | [database.md](./database.md) |
| DB access | `Chat/*.php` | [database.md](./database.md) |
| Scheduled work | `Cron/*.php` | [cron-and-commands.md](./cron-and-commands.md) |
| CLI | `Commands/*.php` | [cron-and-commands.md](./cron-and-commands.md) |
| Request gate | `middleware/` + `onRouterReady` | [middleware-and-hooks.md](./middleware-and-hooks.md) |
| Inject into pages | `Frontend/widgets.json` | [frontend.md](./frontend.md) |
| Nav + full page | `Frontend/sidebar.json` | [frontend.md](./frontend.md) |
| Public page | `Frontend/public.json` | [public-pages.md](./public-pages.md) |
| Theme tokens | `Frontend/theme.json` (+ `theme.css`) | [themes.md](./themes.md) |
| Layout takeover | `Frontend/ui.json` (+ `overrides.json`) | [ui-packs.md](./ui-packs.md) |
| JS host API | `Frontend/index.js` / component scripts | [power-sdk.md](./power-sdk.md) |
| Reusable PHP mixins | top-level `mixins:` (+ core Custom class) | [mixins.md](./mixins.md) |
| Package | `.fpa` / export | [packaging.md](./packaging.md) |

## Minimal valid plugin

```
backend/storage/addons/helloplugin/
├── conf.yml
└── HelloPlugin.php
```

See [recipes.md](./recipes.md) Recipe 1 for full file contents.

## Real plugins to imitate (not clone)

| Plugin | Copy these ideas |
|--------|------------------|
| `discordplus` | settings schema, middleware gate, widgets, admin sidebar |
| `featherimages` | Migrations + Chat + Vite client/admin |
| `minecraftutils` | `registerServerRoute`, server sidebar `group` |
| `billinglinks` | `plugin=` dependency + Cron `TimeTask` |
| `billingplans` | `public.json` + setting visibility |
| `devutils` | CLI `CommandBuilder` generators |
| `minecraftpluginmanger` | `requiredConfigs` for API keys |

Details: [examples.md](./examples.md).

## Scaffold templates (developer mode)

`APP_DEVELOPER_MODE=true` → Admin → Dev → Plugins → Create:

| Template | Use |
|----------|-----|
| `empty` | conf + entry only |
| `starter` | examples across folders |
| `fresh` | empty dirs |
| `theme` | theme.json + theme.css |
| `ui-pack` | ui.json + overrides + sample Power SDK |

## Validation checklist

- [ ] conf required fields + types
- [ ] identifier === folder, no hyphens
- [ ] entry class namespace/class/file aligned; implements AppPlugin
- [ ] flags valid
- [ ] route files return closures; filename ≠ other plugin ids
- [ ] SQL tables prefixed; migrations idempotent
- [ ] Cron namespace `App\Addons\{id}\Cron`
- [ ] Frontend JSON valid; sidebar sections recognized
- [ ] widget `page`/`location` exist ([../widgets/](../widgets/))
- [ ] public paths avoid reserved prefixes
- [ ] booleans in settings are `"true"`/`"false"` strings
- [ ] no secrets committed

## Pitfalls

1. `plugin.name` used as display title → use sidebar/widget titles  
2. Hyphenated ids  
3. Expecting Controllers to auto-load  
4. Mixins only under `plugin.mixins` (also put top-level — see [mixins.md](./mixins.md))  
5. Cron in `App\Cron` inside an addon  
6. Sidebar key `dashboard` (ignored)  
7. Components referenced as `/addons/…` instead of `/components/…`  
8. Forgetting Vite build output paths in `component` fields  
9. Invasive middleware without admin bypass  
10. Wiping `Storage/` on update  

## Fetch next

1. [examples.md](./examples.md)  
2. Topic docs from the capability map  
3. Site refs: widgets / events / permissions / openapi / schemas  
4. [../rag/](../rag/) + [../llms.txt](../llms.txt) for whole-site RAG  
