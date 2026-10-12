#!/bin/sh
# Runs inside the host-prep container. Creates host paths Wings/Quilld need
# (identical bind-mount paths for docker.sock sibling containers).
set -eu

WINGS_ROOT="${DEMO_WINGS_ROOT_PATH:-/var/lib/featherpanel-demo}"
WINGS_TMP="${DEMO_WINGS_TMP_PATH:-/tmp/featherpanel-demo-wings}"
QUILL_ROOT="${DEMO_QUILL_ROOT_PATH:-/var/lib/featherquilld-demo}"
QUILL_TMP="${DEMO_QUILL_TMP_PATH:-/tmp/featherquilld-demo}"
UID_="${DEMO_WINGS_UID:-988}"
GID_="${DEMO_WINGS_GID:-988}"

mkdir -p \
	"${WINGS_ROOT}/volumes" \
	"${WINGS_ROOT}/archives" \
	"${WINGS_ROOT}/backups" \
	"${WINGS_ROOT}/diffs" \
	"${WINGS_ROOT}/machine-id" \
	"${WINGS_TMP}" \
	"${QUILL_ROOT}/webspaces" \
	"${QUILL_ROOT}/backups" \
	"${QUILL_TMP}" \
	/var/log/featherpanel \
	/var/log/featherquilld

# Best-effort ownership for Wings (uid 988). Quilld image often runs as non-root.
chown -R "${UID_}:${GID_}" "${WINGS_ROOT}" "${WINGS_TMP}" 2>/dev/null || true
chmod -R u+rwX,go+rX \
	"${WINGS_ROOT}" "${WINGS_TMP}" \
	"${QUILL_ROOT}" "${QUILL_TMP}" \
	/var/log/featherpanel /var/log/featherquilld 2>/dev/null || true

echo "[demo-host-prep] Ready: ${WINGS_ROOT} + ${QUILL_ROOT}"
