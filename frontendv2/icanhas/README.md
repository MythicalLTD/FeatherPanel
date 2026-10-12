# icanhas sources

Hand-written Markdown, schemas, and a couple of HTML portals.

`pnpm export:docs` copies this tree into `public/icanhasfeatherpanel/`, then fills in generated sections (widgets, pages, CLI, settings, API Redoc, RAG index, …). That output is gitignored.

| Path                  | What                                                  |
| --------------------- | ----------------------------------------------------- |
| `plugins/`            | Plugin authoring guides                               |
| `auth/`               | OIDC login, passkeys                                  |
| `api/oauth2.md`       | API-key consent (browser callback + device)           |
| `assets/`, `schemas/` | Shared CSS/JS + JSON schemas                          |
| `plugin-*.html`       | Short HTML overviews (Markdown is the real reference) |

## Commands

```bash
pnpm export:docs         # → public/icanhasfeatherpanel/  (panel + Docker bake)
pnpm build:public-docs   # → ../docs-site/                (GitHub Pages)
pnpm build:with-docs     # export:docs + Next production build
```

Same export feeds both GitHub Pages and the Docker/Next image. URL on a running panel: `/icanhasfeatherpanel/`.
