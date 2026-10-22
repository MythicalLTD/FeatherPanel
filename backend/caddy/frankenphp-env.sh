#!/bin/sh
# Shared by backend/init.sh and the all-in-one image (deploy/oci): derive the
# Caddyfile variables for the PHP mode and size the worker pools so they always
# fit into FRANKENPHP_MAX_THREADS, and enable the Mercure hub. Source it
# (". frankenphp-env.sh"); it exports variables, prints a short summary and
# may append generated Mercure keys to storage/config/.env.

# Worker mode is the default: /api/* is served by booted FrankenPHP workers.
# FRANKENPHP_WORKER=false (or 0/no/off) switches back to classic mode, where
# every request boots the app.
case "$(printf '%s' "${FRANKENPHP_WORKER:-true}" | tr '[:upper:]' '[:lower:]')" in
false | 0 | no | off) FEATHERPANEL_PHP_MODE=classic ;;
*) FEATHERPANEL_PHP_MODE=worker ;;
esac

_fp_cpus=$(nproc 2>/dev/null || echo 2)
FEATHERPANEL_WORKERS="${FEATHERPANEL_WORKERS:-$((_fp_cpus * 2))}"
FEATHERPANEL_SLOW_WORKERS="${FEATHERPANEL_SLOW_WORKERS:-2}"
FEATHERPANEL_SLOW_MAX_THREADS="${FEATHERPANEL_SLOW_MAX_THREADS:-4}"
FEATHERPANEL_WORKER_MAX_THREADS="${FEATHERPANEL_WORKER_MAX_THREADS:-$((_fp_cpus * 3))}"
[ "$FEATHERPANEL_WORKER_MAX_THREADS" -le 32 ] || FEATHERPANEL_WORKER_MAX_THREADS=32
[ "$FEATHERPANEL_WORKERS" -le 16 ] || FEATHERPANEL_WORKERS=16

# "auto" thread sizing ignores the container memory limit, so on a big host
# the pools can grow until the box runs out of RAM. Size it from the memory
# that is actually available (cgroup limit or MemTotal): about 60% of it
# divided by the per-request memory_limit, between 4 and 64 threads.
_fp_mem_mb() {
	_v=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')
	case "$_v" in
	*G) echo $((${_v%G} * 1024)) ;;
	*M) echo "${_v%M}" ;;
	*K) echo $((${_v%K} / 1024)) ;;
	'' | -1 | *[!0-9]*) echo 512 ;;
	*) echo $((_v / 1048576)) ;;
	esac
}
if [ "${FRANKENPHP_MAX_THREADS:-auto}" = auto ]; then
	_fp_limit=$(cat /sys/fs/cgroup/memory.max 2>/dev/null || cat /sys/fs/cgroup/memory/memory.limit_in_bytes 2>/dev/null || echo max)
	_fp_total=$(awk '/MemTotal/ {print int($2 / 1024)}' /proc/meminfo 2>/dev/null || echo 4096)
	case "$_fp_limit" in
	'' | max | *[!0-9]*) _fp_avail=$_fp_total ;;
	*) _fp_avail=$((_fp_limit / 1048576)); [ "$_fp_avail" -le "$_fp_total" ] || _fp_avail=$_fp_total ;;
	esac
	_fp_per=$(_fp_mem_mb "${PHP_MEMORY_LIMIT:-512M}")
	[ "$_fp_per" -ge 64 ] || _fp_per=64
	FRANKENPHP_MAX_THREADS=$((_fp_avail * 6 / 10 / _fp_per))
	[ "$FRANKENPHP_MAX_THREADS" -ge 4 ] || FRANKENPHP_MAX_THREADS=4
	[ "$FRANKENPHP_MAX_THREADS" -le 64 ] || FRANKENPHP_MAX_THREADS=64
	export FRANKENPHP_MAX_THREADS
	echo "FrankenPHP: max_threads=${FRANKENPHP_MAX_THREADS} (${_fp_avail} MB available, ${_fp_per} MB per thread)"
fi

# FrankenPHP refuses to start when the workers (plus one regular thread for
# phpMyAdmin & co.) need more threads than max_threads allows.
if [ "$FEATHERPANEL_PHP_MODE" = worker ]; then
	case "${FRANKENPHP_MAX_THREADS:-auto}" in
	'' | *[!0-9]*) ;; # "auto": FrankenPHP sizes it, nothing to clamp
	*)
		_fp_max=$FRANKENPHP_MAX_THREADS
		if [ $((FEATHERPANEL_WORKERS + FEATHERPANEL_SLOW_WORKERS + 1)) -gt "$_fp_max" ]; then
			FEATHERPANEL_WORKERS=$((_fp_max - FEATHERPANEL_SLOW_WORKERS - 1))
			if [ "$FEATHERPANEL_WORKERS" -lt 1 ]; then
				FEATHERPANEL_SLOW_WORKERS=1
				FEATHERPANEL_WORKERS=$((_fp_max - 2))
			fi
			if [ "$FEATHERPANEL_WORKERS" -lt 1 ]; then
				echo "FrankenPHP: FRANKENPHP_MAX_THREADS=${_fp_max} is too small for worker mode (needs 3+), using classic mode"
				FEATHERPANEL_PHP_MODE=classic
			else
				echo "FrankenPHP: workers lowered to ${FEATHERPANEL_WORKERS} api + ${FEATHERPANEL_SLOW_WORKERS} slow to fit FRANKENPHP_MAX_THREADS=${_fp_max}"
			fi
		fi
		[ "$FEATHERPANEL_SLOW_MAX_THREADS" -le "$_fp_max" ] || FEATHERPANEL_SLOW_MAX_THREADS=$_fp_max
		[ "$FEATHERPANEL_WORKER_MAX_THREADS" -le "$_fp_max" ] || FEATHERPANEL_WORKER_MAX_THREADS=$_fp_max
		[ "$FEATHERPANEL_SLOW_MAX_THREADS" -ge "$FEATHERPANEL_SLOW_WORKERS" ] || FEATHERPANEL_SLOW_MAX_THREADS=$FEATHERPANEL_SLOW_WORKERS
		;;
	esac
fi
[ "$FEATHERPANEL_WORKER_MAX_THREADS" -ge "$FEATHERPANEL_WORKERS" ] || FEATHERPANEL_WORKER_MAX_THREADS=$FEATHERPANEL_WORKERS

# Mercure hub (live updates instead of polling). FEATHERPANEL_MERCURE:
# auto (default) mounts the hub when both JWT keys exist - taken from the
# environment, else from storage/config/.env, else generated once and saved
# there so the panel (which reads .env) signs with the same keys - and off
# disables it; the frontend then falls back to polling.
_fp_env_file="${FEATHERPANEL_ENV_FILE:-${FEATHERPANEL_ROOT:-/var/www/html}/storage/config/.env}"
_fp_env_get() {
	[ -r "$_fp_env_file" ] || return 0
	sed -n "s/^$1=//p" "$_fp_env_file" | tail -n 1 | sed 's/^["'"'"']//; s/["'"'"']$//'
}
_fp_mercure_key() {
	eval "_fp_val=\${$1:-}"
	[ -n "$_fp_val" ] || _fp_val=$(_fp_env_get "$1")
	if [ -z "$_fp_val" ] && [ -w "$_fp_env_file" ]; then
		_fp_val=$(openssl rand -base64 32 2>/dev/null || head -c 32 /dev/urandom | base64)
		printf '%s="%s"\n' "$1" "$_fp_val" >>"$_fp_env_file"
	fi
	[ -n "$_fp_val" ] && eval "$1=\$_fp_val" && export "${1?}"
	unset _fp_val
}
case "$(printf '%s' "${FEATHERPANEL_MERCURE:-auto}" | tr '[:upper:]' '[:lower:]')" in
off | false | 0 | no) FEATHERPANEL_MERCURE=off ;;
*)
	_fp_mercure_key MERCURE_SUBSCRIBER_JWT_KEY
	_fp_mercure_key MERCURE_PUBLISHER_JWT_KEY
	if [ "${#MERCURE_SUBSCRIBER_JWT_KEY}" -ge 32 ] && [ "${#MERCURE_PUBLISHER_JWT_KEY}" -ge 32 ]; then
		FEATHERPANEL_MERCURE=on
	else
		echo "FrankenPHP: Mercure disabled (MERCURE_SUBSCRIBER_JWT_KEY / MERCURE_PUBLISHER_JWT_KEY missing or shorter than 32 characters)"
		FEATHERPANEL_MERCURE=off
	fi
	;;
esac

export FEATHERPANEL_MERCURE FEATHERPANEL_PHP_MODE FEATHERPANEL_WORKERS FEATHERPANEL_WORKER_MAX_THREADS FEATHERPANEL_SLOW_WORKERS FEATHERPANEL_SLOW_MAX_THREADS
if [ "$FEATHERPANEL_PHP_MODE" = worker ]; then
	echo "FrankenPHP: worker mode (FRANKENPHP_WORKER=${FRANKENPHP_WORKER:-true}, workers ${FEATHERPANEL_WORKERS} api (up to ${FEATHERPANEL_WORKER_MAX_THREADS}) + ${FEATHERPANEL_SLOW_WORKERS} slow, max_threads ${FRANKENPHP_MAX_THREADS:-auto})"
else
	echo "FrankenPHP: classic mode (FRANKENPHP_WORKER=${FRANKENPHP_WORKER:-true}, max_threads ${FRANKENPHP_MAX_THREADS:-auto})"
fi
echo "FrankenPHP: live updates (Mercure) ${FEATHERPANEL_MERCURE}"
unset _fp_cpus _fp_max _fp_env_file
unset -f _fp_env_get _fp_mercure_key
