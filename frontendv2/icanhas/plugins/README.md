# FeatherPanel Plugin Developer Documentation

Complete reference for building FeatherPanel plugins (addons). Written for **humans and LLMs**.

**Live:** [https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/plugins/](https://mythicalltd.github.io/FeatherPanel/icanhasfeatherpanel/plugins/)

Index tip: crawl the raw `.md` files plus [`../catalog.json`](../catalog.json) / [`../llms.txt`](../llms.txt). HTML is for browsing.

## Reading order

| #   | Doc                                                  | Covers                                           |
| --- | ---------------------------------------------------- | ------------------------------------------------ |
| 0   | [ai-guide.md](./ai-guide.md)                         | Dense LLM contract + pitfalls + checklist        |
| 1   | [getting-started.md](./getting-started.md)           | Layout, create flow, boot sequence               |
| 2   | [examples.md](./examples.md)                         | Real open-source plugins (patterns, not clones)  |
| 3   | [conf-yml.md](./conf-yml.md)                         | Manifest, flags, deps, admin `config:`           |
| 4   | [backend.md](./backend.md)                           | AppPlugin, routes, controllers, settings, events |
| 5   | [database.md](./database.md)                         | Migrations + Chat models                         |
| 6   | [cron-and-commands.md](./cron-and-commands.md)       | Addon Cron + CLI Commands                        |
| 7   | [middleware-and-hooks.md](./middleware-and-hooks.md) | Middleware, `onRouterReady`, PHP events          |
| 8   | [frontend.md](./frontend.md)                         | widgets, sidebar, assets, Vite apps              |
| 9   | [public-pages.md](./public-pages.md)                 | `public.json` unauthenticated pages              |
| 10  | [themes.md](./themes.md)                             | Theme packs (`theme.json` / `theme.css`)         |
| 11  | [ui-packs.md](./ui-packs.md)                         | UI packs + overrides                             |
| 12  | [mixins.md](./mixins.md)                             | Reusable PHP mixins                              |
| 13  | [power-sdk.md](./power-sdk.md)                       | `window.FeatherPanel`                            |
| 14  | [packaging.md](./packaging.md)                       | `.fpa`, install, Storage, symlinks               |
| 15  | [recipes.md](./recipes.md)                           | Copy-paste starters                              |

## Related site references

- [Widgets](../widgets/) · [Events](../events/) · [Permissions](../permissions/) · [API / OpenAPI](../api/)
- Auth: [OIDC SSO](../auth/oidc-sso.md) · [Passkeys](../auth/passkeys.md) · [OAuth2 API keys](../api/oauth2.md)
- HTML portals: [`../plugin-themes.html`](../plugin-themes.html) · [`../plugin-power.html`](../plugin-power.html)
- Schemas: [`../schemas/`](../schemas/)
- Site RAG index: [`../rag/`](../rag/)

## What a plugin is

A directory under `backend/storage/addons/{identifier}/` with:

1. `conf.yml` — manifest
2. `{EntryClass}.php` — implements `App\Plugins\AppPlugin`
3. Optional backend + frontend pieces documented below

PSR-4: `App\Addons\` → `backend/storage/addons/`.

## Quick facts

- Folder name **===** `plugin.identifier` (`[a-zA-Z0-9_]+`, no hyphens)
- `plugin.name` is the **PHP entry class name**, not a display title
- `Routes/*.php` auto-load; Controllers do **not**
- Components served at `/components/{identifier}/…`
- Settings values are **strings** (`"true"` / `"false"`)
- Sidebar sections that work: `admin`, `client`, `server`, `vds`, `webspace` (not `dashboard`)
