# FeatherCli

Official CLI for FeatherPanel. Lives in this monorepo under `cli/` (formerly [MythicalLTD/FeatherPanel-CLI](https://github.com/MythicalLTD/FeatherPanel-CLI)).

## Install

**APT (Debian/Ubuntu, preferred):**

```bash
# MythicalSystems APT repo is configured by the FeatherPanel installer
sudo apt-get install feathercli
# nightly channel:
# sudo apt-get install feathercli-dev
```

**GitHub release binary (fallback):**

```bash
# From the same panel v* release as Docker images
curl -L -o /usr/local/bin/feathercli \
  https://github.com/mythicalltd/featherpanel/releases/latest/download/feathercli-linux-x64
chmod +x /usr/local/bin/feathercli
```

**Build from source:**

```bash
dotnet publish FeatherCli.csproj -c Release -r linux-x64 --self-contained true /p:PublishSingleFile=true
```

## Migrate from Pterodactyl / Pelican

### Interactive

```bash
feathercli config setup
feathercli migrate --pterodactyl-dir /var/www/pterodactyl
```

### Headless / CI

```bash
feathercli config set api_url http://127.0.0.1:8080
feathercli config set api_key "$FEATHERPANEL_API_KEY"
# or: export FEATHERCLI_API_URL=... FEATHERCLI_API_KEY=...

feathercli migrate \
  --sql-dump ./panel.sql \
  --env-file ./panel.env \
  --staging-db-host 127.0.0.1 \
  --staging-db-user root \
  --staging-db-password '' \
  --confirm-blueprint \
  --confirm-migrate
```

| Flag / env | Purpose |
|------------|---------|
| `--sql-dump` | Pterodactyl/Pelican `.sql` dump |
| `--env-file` | Panel `.env` (needs `APP_KEY`) |
| `--app-key` | `APP_KEY` only |
| `--staging-db-*` | MySQL used to load the dump |
| `--pterodactyl-dir` | Local install path |
| `--confirm-blueprint` / `--confirm-migrate` | Skip interactive confirmations |
| `FEATHERCLI_API_URL` / `FEATHERCLI_API_KEY` | Override config file for CI |

## Releases

Binaries and `.deb` packages ship on each FeatherPanel `v*` GitHub release (same tag as Docker) and are uploaded to the MythicalSystems APT repo (`feathercli` / `feathercli-dev`).

## License

MIT — see [LICENSE](LICENSE).
