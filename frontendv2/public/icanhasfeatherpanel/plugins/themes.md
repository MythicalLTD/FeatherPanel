# Theme Packs

Theme packs let a plugin ship selectable design tokens (and optional CSS) under **Preferences → Appearance → Theme packs**.

There are currently **no live marketplace theme addons** in a typical install — use the official **Dev → Create plugin → template `theme`**, which calls `PluginManagerController::createThemeTemplate()`.

## Files

```
{identifier}/
├── conf.yml
├── {EntryClass}.php          # can be a stub AppPlugin
└── Frontend/
    ├── theme.json            # required for theme packs
    └── theme.css             # optional; path referenced from theme.json
```

Aggregated by `GET /api/system/plugin-themes`. Schema: [`../schemas/plugin-theme.schema.json`](../schemas/plugin-theme.schema.json).

## `theme.json` (official scaffold shape)

```json
{
  "id": "default",
  "name": "My Theme Pack",
  "preview": null,
  "tokens": {
    "light": {
      "background": "210 40% 98%",
      "foreground": "222 47% 11%",
      "card": "0 0% 100%",
      "card-foreground": "222 47% 11%",
      "primary": "199 89% 48%",
      "primary-foreground": "0 0% 100%",
      "muted": "210 40% 96%",
      "muted-foreground": "215 16% 47%",
      "border": "214 32% 91%",
      "ring": "199 89% 48%"
    },
    "dark": {
      "background": "222 47% 7%",
      "foreground": "210 40% 98%",
      "card": "217 33% 12%",
      "card-foreground": "210 40% 98%",
      "primary": "199 89% 48%",
      "primary-foreground": "0 0% 100%",
      "muted": "217 33% 17%",
      "muted-foreground": "215 20% 65%",
      "border": "217 33% 17%",
      "ring": "199 89% 48%"
    }
  },
  "accents": ["custom:#0ea5e9"],
  "defaults": {
    "backgroundType": "aurora"
  },
  "css": "theme.css"
}
```

### Field notes

| Field | Meaning |
|-------|---------|
| `id` | Pack id within the plugin (users often see `pluginId:packId`) |
| `tokens.light` / `tokens.dark` | HSL **components without** `hsl()` wrapper (space-separated) |
| `accents` | Accent options exposed in the UI |
| `defaults.backgroundType` | Panel background style hint (e.g. `aurora`) |
| `css` | Relative path under `Frontend/` applied **only while this pack is active** |

## `theme.css`

Target panel slots when the pack is active:

```css
/* Active only while this theme pack is selected */
.fp-plugin-slot[data-fp-slot="shell.navbar"] {
  /* Example styling */
}
```

## Admin defaults / locks

Panel settings (core, not plugin YAML):

- `app_theme_pack_default` — default pack id
- `app_theme_pack_lock` — prevent users from changing packs

## Minimal `conf.yml` for a theme-only plugin

```yaml
plugin:
  name: MyTheme
  identifier: mytheme
  description: "Selectable FeatherPanel theme pack."
  flags:
    - hasEvents
  version: 1.0.0
  target: v3
  author:
    - You
  icon: "https://cdn.mythical.systems/featherpanel/logo.png"
  requiredConfigs: []
  dependencies:
    - php=8.5
```

Entry class can leave `processEvents` empty.

## Related

- UI layout takeovers → [ui-packs.md](./ui-packs.md) (`ui.json` can reference a `theme` pack id)
- Power SDK theme APIs → [power-sdk.md](./power-sdk.md) (`FP.theme.*`, `fp:theme:change`)
- HTML overview → [`../plugin-themes.html`](../plugin-themes.html)
