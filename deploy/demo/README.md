# FeatherPanel demo stack

Set up once on a Docker-only VM. It **auto-updates** to the latest `:dev` images and
**auto-resets** the database to a golden snapshot on a timer. Unused Docker images
are pruned every update cycle.

## One-time deploy (demo server)

```bash
# 1) Install Docker (if needed)
curl -fsSL https://get.docker.com | sh
systemctl enable --now docker

# 2) Get the repo
git clone https://github.com/MythicalLTD/FeatherPanel.git
cd FeatherPanel/deploy/demo

# 3) Optional public URL (Cloudflare Tunnel hostname)
cp .env.example .env
# edit FEATHERPANEL_APP_URL / DEMO_WINGS_FQDN / DEMO_QUILL_FQDN

# 4) Start everything
docker compose up -d

# 5) Watch first boot (seed + Wings/Quilld)
docker compose logs -f demo-reset
```

That is it. Leave it running.

| What                               | Who does it          | Default              |
| ---------------------------------- | -------------------- | -------------------- |
| Pull latest `:dev` panel + daemons | `demo-updater`       | every **1 hour**     |
| Restore clean demo DB              | `demo-reset`         | every **30 minutes** |
| Free disk (old images/cache)       | `demo-updater` prune | every update cycle   |
| Create host data dirs              | `host-prep`          | on each compose up   |

## Demo credentials

Login with **email** (or username).

| Account | Email                    | Password                 | Role  |
| ------- | ------------------------ | ------------------------ | ----- |
| 1       | `demo@demo.demo`         | `demoPassword`           | admin |
| 2       | `admin@featherpanel.com` | `admin@featherpanel.com` | admin |

Also seeded (password `demoPassword`): `support`, `moderator`, plus banned/junk users for KPIs.

## Defaults (local)

| Service       | URL                   |
| ------------- | --------------------- |
| Panel         | http://localhost:8088 |
| Wings         | http://localhost:8081 |
| FeatherQuilld | http://localhost:8989 |

## Cloudflare Tunnel (public demo)

Use **single-level** hostnames under your zone. Cloudflare free Universal SSL covers
`*.featherpanel.com` only — **not** `*.demo.featherpanel.com`. Nested names like
`wings.demo.featherpanel.com` cause `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`.

| Role   | Hostname                      |
| ------ | ----------------------------- |
| Panel  | `demo.featherpanel.com`       |
| Wings  | `wings-demo.featherpanel.com` |
| Quilld | `quill-demo.featherpanel.com` |

Install [cloudflared](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/), create a tunnel, publish:

| Public hostname               | Service                 |
| ----------------------------- | ----------------------- |
| `demo.featherpanel.com`       | `http://localhost:8088` |
| `wings-demo.featherpanel.com` | `http://localhost:8081` |
| `quill-demo.featherpanel.com` | `http://localhost:8989` |

Or `/etc/cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL_ID>
credentials-file: /etc/cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: demo.featherpanel.com
    service: http://127.0.0.1:8088
  - hostname: wings-demo.featherpanel.com
    service: http://127.0.0.1:8081
  - hostname: quill-demo.featherpanel.com
    service: http://127.0.0.1:8989
  - service: http_status:404
```

```bash
# deploy/demo/.env
FEATHERPANEL_APP_URL=https://demo.featherpanel.com
DEMO_WINGS_FQDN=wings-demo.featherpanel.com
DEMO_QUILL_FQDN=quill-demo.featherpanel.com
DEMO_WINGS_REMOTE_URL=http://backend:80   # keep this — daemons use compose DNS
```

Non-localhost FQDNs are seeded as `scheme=https` + `behind_proxy=1` so the panel
hands the browser `wss://wings-demo…/…/ws` (Cloudflare 443 → tunnel → `:8081`),
not mixed-content `ws://…:8081`.

Wings `remote` stays `http://backend:80` (Docker DNS + JWT issuer). Browser Origin
(`FEATHERPANEL_APP_URL`) is added to Wings `allowed_origins` so console WSS works.

```bash
docker compose up -d
DEMO_REBUILD_GOLDEN=1 docker compose up -d demo-reset   # once after URL / FQDN change
cloudflared service install && systemctl enable --now cloudflared
```

DNS: proxied CNAMEs for each hostname → `<tunnel-id>.cfargotunnel.com`.
Cloudflare Tunnel supports WebSockets on those HTTP origins by default.

## Disk hygiene

Handled automatically by `demo-updater`:

- `docker image prune -af` (drops images not used by running containers after recreate)
- container / network / builder / dangling volume prune

**Not deleted:** named volumes (MariaDB, golden snapshot, Wings/Quill configs).

Manual cleanup if the VM is still tight:

```bash
cd /var/www/featherpanel/deploy/demo   # or your clone path
docker compose pull && docker compose up -d --remove-orphans
docker image prune -af
docker builder prune -af
```

## Useful commands

```bash
# Status
docker compose ps

# Force fresh golden snapshot (after seed/credential changes)
DEMO_REBUILD_GOLDEN=1 docker compose up -d demo-reset

# Nuclear wipe + reseed
docker compose down -v
docker compose up -d

# Pull repo scripts (compose/seed changes) then recreate
git -C /path/to/FeatherPanel pull
cd /path/to/FeatherPanel/deploy/demo
docker compose up -d
```

## Notes

- Wings/Quilld data paths are identical on host and in-container (`/var/lib/featherpanel-demo`, `/var/lib/featherquilld-demo`).
- If host Wings already owns bridge `featherpanel0`, keep `DEMO_WINGS_DOCKER_NETWORK=featherpanel_nw`.
- Game ports are bound by server containers, not the Wings compose service.
