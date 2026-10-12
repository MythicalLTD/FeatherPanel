# Public Pages (`public.json`)

Unauthenticated (or publicly reachable) plugin pages are declared in:

```
Frontend/public.json
```

Aggregated by `GET /api/system/plugin-public-pages` (`PluginPublicPagesController`).

## Shape

```json
{
  "pages": [
    {
      "path": "/billing/plans",
      "name": "Billing Plans",
      "component": "/billingplans/dist/client.html",
      "query": {
        "public": "1"
      },
      "fallbackPath": "/dashboard/billing/plans",
      "nav": {
        "label": "Plans",
        "order": 30
      },
      "enabled": {
        "type": "plugin_setting",
        "key": "plans_public_enabled",
        "equals": "true"
      }
    }
  ]
}
```

Real file: `backend/storage/addons/billingplans/Frontend/public.json`  
Also see: `billingfilesstore/Frontend/public.json` (`/files/store`).

## Fields

| Field | Required | Notes |
|-------|----------|-------|
| `path` | yes | Public URL path |
| `name` | recommended | Display name |
| `component` | yes | HTML under `/components/{identifier}/…` (often written as `/{identifier}/dist/….html`) |
| `query` | no | Extra query params |
| `fallbackPath` | no | Authenticated fallback |
| `nav` | no | `{ label, order }` for public nav |
| `enabled` / `hidden` | no | Visibility rules (`always` / `never` / `plugin_setting`) |

## Reserved / ignored prefixes

Do **not** use paths that collide with core app areas. Controllers ignore reserved prefixes such as (non-exhaustive): `/admin`, `/dashboard`, `/server`, `/api`, and similar core roots. Prefer unique product prefixes (`/billing/…`, `/files/…`, `/myplugin/…`).

## Visibility

Same rule objects as widgets/UI packs:

```json
"enabled": {
  "type": "plugin_setting",
  "key": "plans_public_enabled",
  "equals": "true"
}
```

Store setting values as strings via `PluginSettings`.

## Security notes

- Public pages are reachable without a panel session — never embed secrets in HTML  
- Call only intentionally public APIs from these pages  
- Validate all inputs server-side  
- Prefer feature flags (`enabled` setting) so operators can disable exposure  

## Related

- [frontend.md](./frontend.md)  
- [examples.md](./examples.md) — billingplans  
- Catch-all frontend routes for public plugin paths live under the Next.js app (`[...publicPluginPath]`)
