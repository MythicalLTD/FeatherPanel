# icanhasfeatherpanel (source)

Hand-authored developer docs **source**. This tree is committed.

At build time it is copied to `frontendv2/public/icanhasfeatherpanel/` (gitignored), then exporters fill in widgets, pages, CLI, settings, installer, events, permissions, API, RAG index, etc.

## Layout

| Path                                      | Purpose                 |
| ----------------------------------------- | ----------------------- |
| `plugins/*.md`                            | Plugin authoring guides |
| `assets/`                                 | Docs CSS/JS             |
| `schemas/`                                | JSON schemas            |
| `plugin-power.html`, `plugin-themes.html` | Static reference pages  |

## Build (only when needed)

```bash
cd frontendv2
pnpm export:docs          # seed public/ + generate → public/icanhasfeatherpanel/
pnpm build:public-docs    # GitHub Pages site → ../docs-site/
pnpm build:with-docs      # export:docs then Next production build
```

`public/icanhasfeatherpanel/` must not be committed. Docker / Pages / make shipping generate it on the fly.
