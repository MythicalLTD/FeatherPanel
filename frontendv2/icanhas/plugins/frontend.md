# Frontend Manifests & Assets

Frontend integration is mostly **declarative JSON** under `Frontend/`, plus static HTML/JS/CSS published from `Frontend/Components/` (URL prefix `/components/{identifier}/`).

## Complete Frontend file inventory

| File | Purpose | Live examples |
|------|---------|---------------|
| `sidebar.json` | Nav entries | discordplus, featherimages, minecraftutils, billing* |
| `widgets.json` | Page injections | discordplus, billingcore, … |
| `public.json` | Unauthenticated pages | billingplans, billingfilesstore → [public-pages.md](./public-pages.md) |
| `theme.json` + `theme.css` | Theme packs | scaffold only → [themes.md](./themes.md) |
| `ui.json` | UI packs | scaffold only → [ui-packs.md](./ui-packs.md) |
| `overrides.json` | Slot overrides | scaffold only → [ui-packs.md](./ui-packs.md) |
| `index.js` | Boot / Power SDK / gates | discordplus, widgetbot, billingreferrals |
| `index.css` | Global plugin CSS | discordplus, widgetbot |
| `Components/**` | Served static UI | symlink → `/components/{id}/` |
| `App/**` | Optional Vite/React/Vue source | featherimages, minecraftutils, discordplus |

## Asset publishing

On install/update:

| Addon path | Public URL |
|------------|------------|
| `Frontend/Components/` | `/components/{identifier}/` |
| `Public/` | `/addons/{identifier}/` |

Widget iframes load component URLs with theme/route/context query params.

### Vite / SPA pattern (featherimages, minecraftutils, discordplus)

```
Frontend/App/           # package.json, vite.config, src/
Frontend/Components/    # build output (or symlink/copy dist here)
```

Point JSON `component` fields at built HTML, e.g.:

- `/discordplus/dist/admin.html`
- `/featherimages/dist/client.html`
- `/mcutils/dist/index.html` (note: component path may use a short folder name if that is how Components are laid out)

Runtime resolves under `/components/…`.

## `sidebar.json`

Sections merged by the panel: **`server`**, **`vds`**, **`webspace`**, **`client`**, **`admin`**.

⚠️ Keys like `"dashboard"` (seen in some minecraft addons) are **silently ignored**.

### Real example — discordplus (admin)

```json
{
  "client": {},
  "admin": {
    "/discordplus": {
      "name": "Discord Plus",
      "lucideIcon": "search",
      "showBadge": false,
      "redirect": "/discordplus",
      "component": "/discordplus/dist/admin.html",
      "description": "Search users by Discord ID or username",
      "category": "admin",
      "group": "Users"
    }
  },
  "server": {}
}
```

### Real example — minecraftutils (server group)

```json
{
  "server": {
    "/minecraftutils": {
      "name": "Minecraft Utils",
      "lucideIcon": "wrench",
      "redirect": "/minecraftutils",
      "component": "/mcutils/dist/index.html",
      "description": "View Minecraft Utils",
      "category": "server",
      "group": "Minecraft Java Edition"
    }
  }
}
```

Common fields: `name`, `description`, `lucideIcon` / `icon`, `redirect`, `component`, `js`, `permission`, `category`, `group`, `priority`, `showBadge`.

Server items may be filtered by spell IDs via settings (`plugin-sidebar-server-allowedOnlyOnSpells`).

## `widgets.json`

Array of objects. Required: `id`, `page`, `location`, `component`.

### Real example — discordplus (truncated)

```json
[
  {
    "id": "discordplus-link-gate-dashboard",
    "component": "discordplus/dist/link-widget.html",
    "enabled": true,
    "priority": 100,
    "page": "dashboard",
    "location": "top-of-page",
    "useRawRendering": true,
    "borderless": true,
    "card": { "enabled": false },
    "iframe": { "minHeight": "88px", "title": "Discord account linking" }
  },
  {
    "id": "discordplus-admin-user-edit",
    "component": "discordplus/dist/admin-user-widget.html",
    "page": "admin-users-edit",
    "location": "after-header",
    "title": "Discord",
    "size": "full",
    "card": { "enabled": true, "padding": "sm", "header": { "show": true } }
  }
]
```

### Finding page slugs & locations

Browse [../widgets/](../widgets/) or `../widgets/index.json`.

### Visibility

```json
"hidden": {
  "type": "plugin_setting",
  "key": "hide-banner",
  "equals": "true"
}
```

Types: `always` | `never` | `plugin_setting`.

### Sizes

`full` | `half` | `third` | `quarter`

## Calling APIs from widgets

Same-origin fetch with cookies:

```js
const res = await fetch('/api/user/discordplus/status', {
  credentials: 'include',
  headers: { Accept: 'application/json' },
});
```

Or use `window.FeatherPanel.api` / postMessage bridge — [power-sdk.md](./power-sdk.md).

## `index.js` patterns (real)

**discordplus:** wait for `FeatherPanel.api`, poll status, show link gate overlay.  
**billingreferrals:** DOM hooks on `/auth/register`.  
**UI-pack scaffold:** full Power SDK (`events`, `actions`, `search`, `shortcuts`).

## Related docs

- [public-pages.md](./public-pages.md) · [themes.md](./themes.md) · [ui-packs.md](./ui-packs.md) · [power-sdk.md](./power-sdk.md) · [examples.md](./examples.md)
