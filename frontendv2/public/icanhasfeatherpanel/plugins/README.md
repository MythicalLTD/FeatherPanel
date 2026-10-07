# FeatherPanel Plugin Developer Documentation

Complete reference for building FeatherPanel plugins (addons). Written for humans and AI coding agents.

**Live site:** [https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/plugins/](https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/plugins/)

**Raw Markdown (best for AIs):** fetch these `.md` files directly from GitHub Pages or the repo under `frontendv2/public/icanhasfeatherpanel/plugins/`.

## Reading order

| # | Doc | Purpose |
|---|-----|---------|
| 0 | [ai-guide.md](./ai-guide.md) | Dense checklist + pitfalls — start here if you are an AI |
| 1 | [getting-started.md](./getting-started.md) | Layout, create flow, minimal plugin |
| 2 | [conf-yml.md](./conf-yml.md) | Manifest schema (`conf.yml`) |
| 3 | [backend.md](./backend.md) | Entry class, routes, events, settings, migrations, cron, CLI |
| 4 | [frontend.md](./frontend.md) | Widgets, sidebar, public pages, themes, UI packs |
| 5 | [power-sdk.md](./power-sdk.md) | `window.FeatherPanel` events/actions/API |
| 6 | [packaging.md](./packaging.md) | `.fpa` install, export, marketplace |
| 7 | [recipes.md](./recipes.md) | Copy-paste recipes (API plugin, widget, sidebar page) |

## Related references (same docs site)

- [Widgets](../widgets/) — page slugs and injection points
- [Events](../events/) — PHP plugin event catalog
- [Permissions](../permissions/) — permission nodes
- [API (OpenAPI)](../api/) — HTTP API
- [Power SDK (HTML)](../plugin-power.html)
- [Themes & UI packs (HTML)](../plugin-themes.html)
- JSON schemas: [`../schemas/`](../schemas/)

## AI discovery

- [`llms.txt`](./llms.txt) — machine-readable index of this section
- Prefer **Markdown sources** over HTML when generating or editing plugins

## What a plugin is

A plugin is a directory under `backend/storage/addons/{identifier}/` with:

1. `conf.yml` — manifest
2. `{EntryClass}.php` — implements `App\Plugins\AppPlugin`
3. Optional `Routes/`, `Controllers/`, `Migrations/`, `Cron/`, `Commands/`, `Frontend/`, `Public/`, `Storage/`

PSR-4 autoload: `App\Addons\` → `backend/storage/addons/`.

## Quick facts

- Folder name **must equal** `plugin.identifier`
- `plugin.name` is the **PHP entry class name**, not a display title
- Identifier charset for runtime validation: `[a-zA-Z0-9_]+` (no hyphens)
- `Routes/*.php` are auto-loaded; Controllers are **not** auto-discovered
- Frontend components are served from `/components/{identifier}/…`
- Settings values are **strings** in the database (`"true"` / `"false"` for booleans)
