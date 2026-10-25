# FeatherPanel MCP Server

Model Context Protocol server for [FeatherPanel](https://github.com/mythicalltd/FeatherPanel). Lets Claude, Cursor, and other MCP clients manage servers, files, console, networking, VDS, and more through the panel REST API.

## Auth (everything)

| Client                         | How                                                                                               |
| ------------------------------ | ------------------------------------------------------------------------------------------------- |
| **Claude.ai custom connector** | Add `https://<panel>/mcp` → **Connect** → FeatherPanel OAuth consent (create key or paste `fp_…`) |
| **Cursor / static headers**    | `Authorization: Bearer fp_…` or `x-api-key`                                                       |
| **Stdio**                      | `FEATHERPANEL_API_KEY`                                                                            |

OAuth implements DCR + PKCE (`/authorize`, `/token`, `/register`) so Claude’s sign-in flow works.

## Local development (matches prod)

```bash
# once
pnpm --dir mcp install

# from frontendv2 — starts Next (:3000) + MCP (:3001); /mcp + OAuth proxied like prod
cd frontendv2 && pnpm dev
```

Use `http://127.0.0.1:3000/mcp` (or your tunnel host).

| Command                          | What it does                         |
| -------------------------------- | ------------------------------------ |
| `cd frontendv2 && pnpm dev`      | Next + MCP together (`/mcp` rewrite) |
| `cd frontendv2 && pnpm dev:next` | Next only                            |
| `make mcp-dev`                   | MCP only on `:3001`                  |
| `make mcp`                       | Build MCP                            |

MCP calls the PHP API at `http://127.0.0.1:8721` by default (same as Next `/api` rewrites). Override with `FEATHERPANEL_URL`.

## Modes

### Remote (Docker Compose — recommended)

Proxied at `https://<your-panel>/mcp`. Claude uses OAuth; other clients can send a Bearer API key.

### Local stdio

```bash
cd mcp
pnpm install && pnpm build
export FEATHERPANEL_URL=https://panel.example.com
export FEATHERPANEL_API_KEY=YOUR_API_KEY
pnpm start:stdio
```

## Environment

| Variable                                    | Default                                                                      | Description                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `FEATHERPANEL_URL`                          | `http://backend:80` (Docker) / `http://127.0.0.1:8721` (frontend `pnpm dev`) | Panel API base URL                                          |
| `FEATHERPANEL_API_KEY`                      | —                                                                            | Required for stdio; remote can use OAuth or per-request key |
| `MCP_HOST`                                  | `0.0.0.0` (Docker) / `127.0.0.1` (frontend `pnpm dev`)                       | HTTP bind address                                           |
| `MCP_PORT`                                  | `3001`                                                                       | HTTP listen port                                            |
| `MCP_DEV_URL`                               | `http://127.0.0.1:3001`                                                      | Next rewrite target for `/mcp` in local dev                 |
| `MCP_PUBLIC_URL`                            | (from request Host)                                                          | Optional public origin override for OAuth redirects         |
| `MCP_OAUTH_STORE_PATH`                      | `/data/oauth-store.json` (Docker volume `mcp_oauth_data`) / `/tmp/…` locally | Persist OAuth clients/tokens across restarts                |
| `MCP_DANGEROUSLY_ALLOW_INSECURE_ISSUER_URL` | `true`                                                                       | Allow `http://` issuer (local / HTTP panels)                |

## CI / images

| Workflow | When | What |
| -------- | ---- | ---- |
| `MCP Jobs` (`.github/workflows/mcp.yml`) | `mcp/**` push/PR | typecheck + build (Node 22/24), tool inventory, Docker smoke `/health` |
| `Docker Build & Publish (Dev)` | `develop`, `main` | multi-arch push `ghcr.io/mythicalltd/featherpanel-mcp:dev*` |
| `Docker Build & Publish (Release)` | `v*` tags | multi-arch push version + `latest` |

## Tools

Tools are registered from panel public settings (`GET /api/system/settings`, see `mcp/src/features.ts`). A setting value of `"false"` disables that pack; missing values count as enabled. Disabled packs are omitted from `tools/list`.

**Not exposed (by design):** FeatherOS, panel plugins/addons, webspace/VDS chatbots, multipart file uploads.

### Always available

- **Account:** `whoami`, notifications / inbox, SSH keys, sessions

### Game servers (`module_game_enabled`)

- **Servers:** list/details/status/activities/power, resources + resource history, trash, FastDL
- **Console / live:** command, websocket, logs, install logs, players
- **Files:** browse/read/write/search/compress/pull/permissions
- **Startup / danger:** startup, update, reinstall, wipe, abort install
- **Allocations, subusers, network** (firewall / proxy / subdomains)
- **Backups:** list/create/delete/restore/lock/unlock/download/recover
- **Databases / schedules:** CRUD packs

### Web hosting (`module_web_enabled`)

- **Webspaces (core):** list/catalog/get/update, utilization, transfer, infrastructure readiness, PHP ini/extensions, Redis, malware scan, power/status/logs, SSL, proxy logs, analytics, activities, JWT, DNS check/provision
- **Files:** list/read/write, trash, pull/upload-url/download URLs, share jobs, search, archives (no raw multipart upload)
- **Databases, mail, DNS zones/records, backups, cron schedules, SFTP, subusers**
- **Apps:** WordPress (install/update/staging/auto-update), Laravel, Ghost, Joomla, Drupal, Magento, PrestaShop, Node/Python starters, git deploy + webhook + deploy key (WordPress *plugin* install excluded)

### VDS (`module_vds_enabled`)

- Full user VDS/VM pack: list/details/status/power, QEMU hardware, networking/DNS, ISO fetch/unmount (no multipart ISO upload), templates, VNC ticket, reinstall + task polling, backups create/list/restore/delete/recover + status polling, activities, subusers (`mcp/src/tools/vds.ts`)

### Tickets (`ticket_system_enabled`)

- categories/priorities/statuses/servers helpers, list/get/create/reply/delete message/close

### Knowledgebase (`knowledgebase_enabled`)

- `search_knowledgebase`, `get_knowledgebase_article`, `list_knowledgebase_categories`

Permissions match the API key’s user and webspace/server/VDS subuser ACLs.

## Security

Treat API keys like passwords. Prefer IP allowlists. Destructive tools (kill, wipe, reinstall, delete) are available whenever the key already has those panel permissions.
