# Pterodactyl migrate fixtures

- `schema.sql` — minimal tables FeatherCli migrate reads (v1 + v2 compatible: nullable `nest_id`, `tags`/`taggables`)
- `seed.sql` — **Pterodactyl v1-shaped** advanced anonymized seed (nests present)
- `seed_v2.sql` — **Pterodactyl v2-shaped** advanced anonymized seed (empty nests, tags drive realms)
- `panel.env` — CI APP_KEY used to encrypt daemon/db secrets in the seeds
- `bootstrap_admin.php` — creates FeatherPanel admin API key for migrate smoke

## CI

Every commit runs:

1. **Build FeatherCli** on **amd64** + **arm64**
2. **Migrate smoke — Pterodactyl v1** on **amd64** + **arm64** (`seed.sql`)
3. **Migrate smoke — Pterodactyl v2** on **amd64** + **arm64** (`seed_v2.sql`)

Arm jobs use GitHub’s `ubuntu-24.04-arm` runners (same pattern as docker release workflows).

## Regenerating (do NOT use live panel DBs)

Artisan on a live install often has **cached config** (`bootstrap/cache/config.php`), so `DB_DATABASE=...` env overrides may still hit production.

Safe pattern:

1. `mysqldump` the live DB read-only into a file
2. Load into a throwaway MariaDB database (e.g. `ptero_seed_staging`)
3. Anonymize + enrich **only** that staging DB (SQL or a dedicated staging Laravel env with its own uncached `.env`)
4. Export INSERT seed SQL for the tables in `schema.sql`

Never run `php artisan p:user:make` / `p:location:make` / `p:node:make` against production.
