#!/bin/bash
# After Wings is healthy, finish demo server install + start.
set -euo pipefail

CONFIG="${DEMO_WINGS_CONFIG_PATH:-/etc/featherpanel/config.yml}"
WINGS_URL="${DEMO_WINGS_INTERNAL_URL:-http://wings:8081}"
ROOT="${DEMO_WINGS_ROOT_PATH:-/var/lib/featherpanel-demo}"

log() {
	printf '[demo-servers] %s\n' "$*"
}

wings_api() {
	local method="$1"
	local path="$2"
	local data="${3:-}"
	if [ -n "$data" ]; then
		curl -sS -o /tmp/demo-wings.body -w '%{http_code}' \
			-X "$method" "${WINGS_URL}${path}" \
			-H "Authorization: ${AUTH}" \
			-H "Content-Type: application/json" \
			-H "Accept: application/json" \
			-d "$data" || true
	else
		curl -sS -o /tmp/demo-wings.body -w '%{http_code}' \
			-X "$method" "${WINGS_URL}${path}" \
			-H "Authorization: ${AUTH}" \
			-H "Accept: application/json" || true
	fi
}

if [ ! -f "$CONFIG" ]; then
	log "WARNING: ${CONFIG} missing; skip server start."
	exit 0
fi

# Wings inbound auth is Bearer <token> only (not token_id.token).
TOKEN="$(awk '/^token:/{print $2; exit}' "$CONFIG" | tr -d "'\"")"
AUTH="Bearer ${TOKEN}"

# Only auto-install/start healthy demo servers (skip suspended / failed / transferring junk).
mapfile -t SERVERS < <(php -r '
$host = getenv("DATABASE_HOST") ?: "mysql";
$db = getenv("DATABASE_DATABASE") ?: "featherpanel";
$user = getenv("DATABASE_USER") ?: "featherpanel";
$pass = getenv("DATABASE_PASSWORD") ?: "";
try {
  $pdo = new PDO("mysql:host={$host};dbname={$db};charset=utf8mb4", $user, $pass);
  $q = $pdo->query("SELECT uuid FROM featherpanel_servers
    WHERE COALESCE(suspended,0)=0
      AND (status IS NULL OR status NOT IN (\"suspended\",\"install_failed\",\"transferring\"))
      AND name IN (\"Survival World\",\"Creative Sandbox\",\"Admin Test Node\")");
  foreach ($q->fetchAll(PDO::FETCH_COLUMN) as $uuid) {
    echo $uuid, PHP_EOL;
  }
} catch (Throwable $e) {
  fwrite(STDERR, $e->getMessage());
  exit(1);
}
' 2>/dev/null || true)

if [ "${#SERVERS[@]}" -eq 0 ] || [ -z "${SERVERS[0]:-}" ]; then
	# Fallback: any non-hidden volume that Wings already knows
	mapfile -t SERVERS < <(find "${ROOT}/volumes" -mindepth 1 -maxdepth 1 -type d ! -name '.sftp' -printf '%f\n' 2>/dev/null | head -3 || true)
fi

if [ "${#SERVERS[@]}" -eq 0 ] || [ -z "${SERVERS[0]:-}" ]; then
	log "No startable demo servers found"
	exit 0
fi

for uuid in "${SERVERS[@]}"; do
	mkdir -p "${ROOT}/volumes/${uuid}"
	chown -R "${DEMO_WINGS_UID:-988}:${DEMO_WINGS_GID:-988}" "${ROOT}/volumes/${uuid}" 2>/dev/null || true

	log "Triggering install for ${uuid}..."
	code="$(wings_api POST "/api/servers/${uuid}/install")"
	log "Install HTTP ${code}"
done

# Wait for installs to finish before powering on
log "Waiting for installs to complete..."
sleep 15

for uuid in "${SERVERS[@]}"; do
	log "Starting ${uuid}..."
	# Retry a few times in case install is still finishing
	for attempt in 1 2 3 4 5; do
		code="$(wings_api POST "/api/servers/${uuid}/power" '{"action":"start"}')"
		body="$(cat /tmp/demo-wings.body 2>/dev/null || true)"
		log "Start attempt ${attempt} HTTP ${code}: ${body}"
		if [ "$code" = "202" ] || [ "$code" = "204" ]; then
			break
		fi
		# Suspended / install_failed junk servers are intentional — don't spin.
		if printf '%s' "$body" | grep -Eqi 'suspended|not installed|install_failed'; then
			log "Skipping ${uuid} (not startable)."
			break
		fi
		sleep 5
	done
done

# Panel status can lag on "starting"; if containers are up, mark running in DB via Wings status pushes
# (best-effort — Wings already posts container/status; give it a moment).
sleep 3
log "Done."
