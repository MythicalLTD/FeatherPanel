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
| `Docker Build & Publish (Dev)` | `develop` | multi-arch push `ghcr.io/mythicalltd/featherpanel-mcp:dev*` |
| `Docker Build & Publish (Release)` | `v*` tags | multi-arch push version + `latest` |

## Tools

- **Account:** `whoami`
- **Servers:** `list_servers`, `get_server_details`, `get_server_status`, `get_server_activities`, `server_power_action`
- **Console / live:** `send_console_command`, `get_console_websocket`, `get_server_logs`, `get_install_logs`, `get_server_players`
- **Files:** `get_files`, `get_file_content`, `write_file`, `search_files`, `create_directory`, `delete_files`, `rename_file`, `copy_files`, `compress_files`, `decompress_archive`, `pull_file`, `change_file_permissions`
- **Startup / danger:** `get_server_startup`, `update_server`, `reinstall_server`, `wipe_server_files`, `abort_server_install`
- **Allocations:** `get_server_allocations`, `get_available_allocations`, `auto_allocate`, `set_primary_allocation`, `delete_allocation`
- **Subusers:** `get_server_subusers`, `get_subuser_permissions`, `create_subuser`, `update_subuser`, `delete_subuser`
- **Network:** firewall / proxy / subdomain tools
- **Backups / DBs / schedules:** full CRUD packs
- **Knowledgebase:** `search_knowledgebase`, `get_knowledgebase_article`, `list_knowledgebase_categories`
- **VDS:** list/details/status/power/backups/restore

Permissions match the API key’s user.

## Security

Treat API keys like passwords. Prefer IP allowlists. Destructive tools (kill, wipe, reinstall, delete) are available whenever the key already has those panel permissions.
