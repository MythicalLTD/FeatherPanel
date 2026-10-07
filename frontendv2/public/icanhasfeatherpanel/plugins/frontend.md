# Frontend Plugin Manifests & UI

Frontend integration is **declarative JSON** under `Frontend/`, plus static HTML/JS/CSS published under `Frontend/Components/` (served at `/components/{identifier}/`).

Optional Power SDK scripts use `window.FeatherPanel` — see [power-sdk.md](./power-sdk.md).

JSON schemas:

- [`../schemas/plugin-ui-pack.schema.json`](../schemas/plugin-ui-pack.schema.json)
- [`../schemas/plugin-theme.schema.json`](../schemas/plugin-theme.schema.json)
- [`../schemas/plugin-overrides.schema.json`](../schemas/plugin-overrides.schema.json)

## Asset publishing

On install/update the panel links:

| Addon path | Public URL prefix |
|------------|-------------------|
| `Frontend/Components/` | `/components/{identifier}/` |
| `Public/` | `/addons/{identifier}/` |

Widget iframes load component URLs with query params for theme/route/context.

When using a Vite/React/Vue app in `Frontend/App/`, configure the build `outDir` so outputs land in `Frontend/Components/` (or a subfolder referenced by your JSON).

## `widgets.json`

Array of widget definitions. Aggregated by `GET /api/system/plugin-widgets`.

### Required fields

| Field | Description |
|-------|-------------|
| `id` | Unique widget id |
| `page` | Page slug (e.g. `dashboard`, `admin-users-edit`, `server-console`) |
| `location` | Injection point (e.g. `top-of-page`, `after-header`, `before-content`, `bottom-of-page`) |
| `component` | Path under `/components/` (often `{identifier}/file.html`) |

### Common optional fields

`enabled`, `hidden`, `priority`, `pluginName`, `title`, `description`, `icon`, `size`, `borderless`, `useRawRendering`, `card`, `iframe`, `behavior`

### Example

```json
[
  {
    "id": "helloplugin-dashboard-banner",
    "component": "helloplugin/banner.html",
    "enabled": true,
    "priority": 50,
    "page": "dashboard",
    "location": "top-of-page",
    "pluginName": "HelloPlugin",
    "title": "Hello",
    "size": "full",
    "useRawRendering": true,
    "card": { "enabled": false },
    "iframe": {
      "minHeight": "80px",
      "title": "Hello plugin",
      "ariaLabel": "Hello plugin banner"
    }
  }
]
```

### Finding page slugs & locations

Browse `/icanhasfeatherpanel/widgets/` or search the panel for `usePluginWidgets('…')`.

Visibility can depend on settings:

```json
"hidden": {
  "type": "plugin_setting",
  "key": "hide-banner",
  "equals": "true"
}
```

## `sidebar.json`

Object with sections: `client`, `admin`, `server`, `vds`, `webspace`.

Each key is a path segment under the plugin; the API prefixes with `/{identifier}`.

### Example

```json
{
  "client": {},
  "admin": {
    "/hello": {
      "name": "Hello Admin",
      "lucideIcon": "sparkles",
      "showBadge": false,
      "redirect": "/hello",
      "component": "/helloplugin/admin.html",
      "description": "Hello plugin admin UI",
      "category": "admin",
      "group": "Plugins"
    }
  },
  "server": {}
}
```

Common item fields: `name`, `description`, `lucideIcon` or `icon`, `redirect`, `component`, `js`, `permission`, `category`, `group`, `priority`, `showBadge`.

Server sidebar items may be filtered by spell IDs via plugin settings (`plugin-sidebar-server-allowedOnlyOnSpells`).

Routes for plugin pages are handled by the panel’s catch-all plugin path pages (admin/server/webspace). Your `component` should be an HTML document under `/components/{identifier}/…`.

## `public.json`

Unauthenticated / public pages. Aggregated by `GET /api/system/plugin-public-pages`.

Typical shape includes a `pages` array with path match + component. See live plugins and `PluginPublicPagesController` for the exact fields your panel version expects.

## `ui.json` (UI packs)

Layout takeover packs: replace shell regions or whole pages, hide slots, register actions.

See schema `plugin-ui-pack.schema.json` and `/icanhasfeatherpanel/plugin-themes.html`.

Highlights:

- `shell.replace` — replace chrome pieces
- `pages[]` with `match` path patterns (`/dashboard`, `/server/:uuidShort/console`)
- `hide[]` — slot ids to hide
- `theme` — theme pack id
- Nested `packs[]` allowed
- `enabled` / `hidden` visibility rules

## `theme.json` + `theme.css`

Design tokens for light/dark, accents, optional CSS file path. Schema: `plugin-theme.schema.json`.

## `overrides.json`

Slot-level hide/replace/actions (`component` iframe HTML vs `remote` ESM). Schema: `plugin-overrides.schema.json`.

## Building HTML widgets that call the API

Inside an iframe/component:

1. Prefer `window.parent.FeatherPanel` / postMessage bridge (Power SDK installs a same-origin bus)
2. Or call relative `/api/...` endpoints with the user’s session cookies (`credentials: 'include'`) when same-origin

Keep widgets small; use `iframe.minHeight` and `useRawRendering` for borderless banners.

## Compiling a SPA inside a plugin

Pattern used by many addons:

```
Frontend/App/          # package.json, vite.config, src/
Frontend/Components/   # build output (html/js/css)
```

Point `sidebar.json` / `widgets.json` `component` fields at the built HTML (e.g. `myplugin/dist/admin.html` if that is how you structure Components).

## Admin visibility overrides

Admins can hide plugin UI pieces via plugin settings keys generated for visibility scopes. Design `enabled`/`hidden` rules so operators can disable widgets without code edits.

## Related docs

- [power-sdk.md](./power-sdk.md)
- Widgets reference: `../widgets/`
- HTML overview: `../plugin-power.html`, `../plugin-themes.html`
