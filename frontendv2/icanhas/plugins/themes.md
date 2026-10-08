# Theme packs

Ship selectable colors (and optional CSS) under Preferences → Appearance → Theme packs. No panel rebuild when someone installs your pack.

Schema: [`../schemas/plugin-theme.schema.json`](../schemas/plugin-theme.schema.json) · HTML overview: [`../plugin-themes.html`](../plugin-themes.html)

## Fastest path

Admin → Developer → Plugins → Create → template **Theme pack**. That writes `theme.json` + `theme.css` under `backend/storage/addons/{identifier}/Frontend/`. Edit tokens, enable the plugin, pick `{identifier}:default` in Appearance.

## Layout

```
{identifier}/
├── conf.yml
├── {EntryClass}.php
└── Frontend/
    ├── theme.json    # required
    └── theme.css     # optional; referenced from theme.json
```

APIs: `GET /api/system/plugin-themes`, `GET /api/system/plugin-theme-css?id={plugin}:{packId}`.

## `theme.json`

Color values are **HSL components without** `hsl()` — e.g. `"199 89% 48%"`. `radius` is a length (`0.5rem`).

```json
{
    "id": "default",
    "name": "Ocean Night",
    "tokens": {
        "light": {
            "background": "210 40% 98%",
            "foreground": "222 47% 11%",
            "primary": "199 89% 48%",
            "primary-foreground": "0 0% 100%",
            "muted": "210 40% 96%",
            "muted-foreground": "215 16% 47%",
            "border": "214 32% 91%",
            "ring": "199 89% 48%",
            "radius": "0.5rem"
        },
        "dark": {
            "background": "222 47% 7%",
            "foreground": "210 40% 98%",
            "primary": "199 89% 48%",
            "primary-foreground": "0 0% 100%",
            "muted": "217 33% 17%",
            "muted-foreground": "215 20% 65%",
            "border": "217 33% 17%",
            "ring": "199 89% 48%",
            "radius": "0.5rem"
        }
    },
    "accents": ["custom:#0ea5e9"],
    "defaults": { "backgroundType": "aurora" },
    "css": "theme.css"
}
```

Token keys the host applies: `background`, `foreground`, `card`, `card-foreground`, `popover`, `popover-foreground`, `primary`, `primary-foreground`, `secondary`, `secondary-foreground`, `muted`, `muted-foreground`, `accent`, `accent-foreground`, `destructive`, `destructive-foreground`, `border`, `input`, `ring`, `radius`.

Missing keys fall back to the built-in theme. Pack id in the UI is usually `{plugin}:{id}`.

## Optional CSS

Loaded only while the pack is active (`#fp-plugin-theme-css`). Prefer `hsl(var(--primary))` over hard-coded hex.

```css
.fp-plugin-slot[data-fp-slot='shell.navbar'] {
    border-bottom: 1px solid hsl(var(--border));
}
```

## Admin locks

- `app_theme_pack_default`
- `app_theme_pack_lock`

## Theme vs UI pack

| Need                              | File                                     |
| --------------------------------- | ---------------------------------------- |
| Colors / accents                  | `theme.json`                             |
| Replace sidebar / pages / toolbar | `ui.json` → [ui-packs.md](./ui-packs.md) |
| Intercept start/stop              | [power-sdk.md](./power-sdk.md)           |

A UI pack can set `"theme": "default"` so selecting it also activates your tokens.

## Minimal `conf.yml`

```yaml
plugin:
    name: MyTheme
    identifier: mytheme
    description: 'Theme pack.'
    flags: [hasEvents]
    version: 1.0.0
    target: v3
    author: [You]
    icon: 'https://cdn.mythical.systems/featherpanel/logo.png'
    requiredConfigs: []
    dependencies: [php=8.5]
```

Folder name must equal `identifier`. Entry class can leave `processEvents` empty.

If the pack does not show up: plugin enabled, valid JSON, check `GET /api/system/plugin-themes`.
