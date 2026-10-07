# UI Packs & Overrides

UI packs can replace shell regions, hide slots, swap whole pages, and register toolbar actions. Create with Dev template **`ui-pack`**.

Live marketplace addons rarely ship `ui.json` today — learn from the official scaffold (`PluginManagerController::createUiPackTemplate`) and schemas.

## Files

```
Frontend/
├── ui.json                 # pack definition
├── overrides.json          # optional slot hide/replace/actions
├── index.js                # optional Power SDK boot
└── Components/
    └── action-panel.html   # iframe/HTML for actions
```

APIs:

- `GET /api/system/plugin-ui-packs`
- Schemas: [`plugin-ui-pack.schema.json`](../schemas/plugin-ui-pack.schema.json), [`plugin-overrides.schema.json`](../schemas/plugin-overrides.schema.json)

## `ui.json` (scaffold)

```json
{
  "id": "default",
  "name": "My UI Pack",
  "theme": null,
  "shell": {
    "replace": {}
  },
  "pages": [],
  "hide": [],
  "actions": [
    {
      "slot": "toolbar.server-console",
      "label": "My UI Pack",
      "component": "Components/action-panel.html",
      "priority": 10
    }
  ]
}
```

### Important fields

| Field | Purpose |
|-------|---------|
| `theme` | Theme pack id (`plugin:id` or bare id for this plugin) |
| `shell.replace` | Map of shell slots → `{ hide, component, remote }` |
| `pages[]` | `{ match, hide, replace, enabled, hidden }` — `match` like `/dashboard` or `/server/:uuidShort/console` |
| `hide[]` | Slot ids to hide globally for the pack |
| `actions[]` | Toolbar / slot actions pointing at HTML components |
| `enabled` / `hidden` | Visibility rules (bool or `{ type: plugin_setting, key, equals }`) |
| `packs[]` | Nested sub-packs (schema allows recursion) |

### Replace object

```json
{
  "component": "Components/navbar.html",
  "remote": null,
  "hide": false
}
```

- `component` — HTML under `/components/{identifier}/…` (iframe)
- `remote` — ESM remote module (advanced)

## `overrides.json`

```json
{
  "hide": [],
  "replace": [],
  "actions": []
}
```

Same visibility / component concepts as the UI pack schema. Use for finer slot surgery alongside or instead of packing everything into `ui.json`.

## Sample Power SDK in UI packs

Scaffold writes `Frontend/index.js` that:

- Listens for `fp:host:ready`
- Registers `fp:server:power` middleware (confirm on kill)
- Contributes search results
- Registers a keyboard shortcut

See [power-sdk.md](./power-sdk.md) for the full API.

## When to use UI pack vs widgets vs sidebar

| Need | Prefer |
|------|--------|
| Inject a card into an existing page | `widgets.json` |
| Add a nav entry + full page | `sidebar.json` |
| Restyle tokens only | `theme.json` |
| Replace chrome / hide slots / toolbar actions | `ui.json` |
| Intercept power/files without replacing UI | Power SDK actions |

## Related

- [themes.md](./themes.md)
- [frontend.md](./frontend.md)
- [`../plugin-themes.html`](../plugin-themes.html)
