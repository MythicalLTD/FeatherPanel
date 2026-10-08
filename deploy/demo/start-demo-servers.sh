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

# Seed sample files so the file manager / trash bin have something to explore.
# Install may recreate the volume root — write after install settles.
for uuid in "${SERVERS[@]}"; do
	vol="${ROOT}/volumes/${uuid}"
	mkdir -p "${vol}/config" "${vol}/plugins" "${vol}/logs" "${vol}/.trash-demo"
	cat >"${vol}/README-DEMO.txt" <<EOF
FeatherPanel Demo Server
========================
This volume is part of the public FeatherPanel demo.
It wipes periodically. Feel free to browse files, edit configs,
and try the trash bin — nothing here is production data.
EOF
	cat >"${vol}/server.properties" <<'EOF'
# Demo sample config (not a real Minecraft server)
motd=FeatherPanel Demo World
max-players=20
gamemode=survival
difficulty=easy
pvp=true
online-mode=false
EOF
	cat >"${vol}/config/settings.yml" <<'EOF'
demo: true
panel: FeatherPanel
features:
  - console
  - files
  - trash
  - schedules
  - subusers
note: Spoofed / limited on the public demo. Not for production.
EOF
	printf 'Demo plugin placeholder — safe to delete into trash.\n' >"${vol}/plugins/DemoPlugin.jar.txt"
	printf '[%s] Demo server started\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" >>"${vol}/logs/latest.log"
	mkdir -p "${vol}/backups" "${vol}/imports" "${vol}/world/region" "${vol}/mods"
	cat >"${vol}/eula.txt" <<'EOF'
#By changing the setting below to TRUE you are indicating your agreement to our EULA (https://aka.ms/MinecraftEULA).
eula=true
EOF
	cat >"${vol}/ops.json" <<'EOF'
[{"uuid":"00000000-0000-4000-8000-000000000001","name":"DemoAdmin","level":4,"bypassesPlayerLimit":true}]
EOF
	cat >"${vol}/whitelist.json" <<'EOF'
[{"uuid":"00000000-0000-4000-8000-000000000002","name":"DemoPlayer"}]
EOF
	printf 'placeholder region file for file-manager demos\n' >"${vol}/world/region/r.0.0.mca.txt"
	printf 'DemoMod v1.0 — safe to delete into trash\n' >"${vol}/mods/DemoMod.jar.txt"
	cat >"${vol}/imports/README.txt" <<'EOF'
Import staging folder for the FeatherPanel demo.
Panel import history is seeded in MySQL; these files are for the file manager.
EOF
	# Sample files that look good in FeatherIDE (Monaco editor)
	mkdir -p "${vol}/scripts"
	cat >"${vol}/scripts/hello.js" <<'EOF'
// FeatherIDE demo script — safe to edit
console.log('Hello from FeatherPanel Demo');
function greet(name) {
  return `Welcome, ${name}!`;
}
greet('Demo');
EOF
	cat >"${vol}/scripts/backup.sh" <<'EOF'
#!/bin/sh
# Demo backup helper — not executed by the panel automatically
echo "Demo backup stub at $(date -u +%Y-%m-%dT%H:%M:%SZ)"
EOF
	cat >"${vol}/config/featheride-notes.md" <<'EOF'
# FeatherIDE

Open any of these files in the panel file manager / FeatherIDE:
- `server.properties`
- `config/settings.yml`
- `scripts/hello.js`
- `scripts/backup.sh`

Edits on the public demo are wiped on the next reset.
EOF
	cat >"${vol}/backups/README.txt" <<'EOF'
Local backup ghosts appear in the panel Backups UI (DB-seeded).
This folder is just volume filler for demos.
EOF
	# A few log lines so log viewers aren't empty
	for i in 1 2 3 4 5; do
		printf '[%s] [Server thread/INFO]: Demo tick %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$i" >>"${vol}/logs/latest.log"
	done
	chown -R "${DEMO_WINGS_UID:-988}:${DEMO_WINGS_GID:-988}" "${vol}" 2>/dev/null || true
	log "Seeded sample files for ${uuid}"
done

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
