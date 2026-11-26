#!/usr/bin/env bash
set -euo pipefail
: "${DB_PORT:?}"
: "${SEED_FILE:?}"
: "${SEED_VARIANT:?}"

mysql -h 127.0.0.1 -P "$DB_PORT" -u root pterodactyl_source < tests/fixtures/pterodactyl/schema.sql
mysql -h 127.0.0.1 -P "$DB_PORT" -u root pterodactyl_source < "$SEED_FILE"
mysqldump -h 127.0.0.1 -P "$DB_PORT" -u root pterodactyl_source > /tmp/panel.sql
cp tests/fixtures/pterodactyl/panel.env /tmp/panel.env
test -s /tmp/panel.sql
echo "Seeded ${SEED_VARIANT} from ${SEED_FILE} ($(wc -c < /tmp/panel.sql) bytes dump)"
