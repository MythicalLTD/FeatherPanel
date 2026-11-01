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
# divided by the per-worker heap target (not PHP_MEMORY_LIMIT — that is a
# hard ceiling, not typical RSS). Floor at 8 so a ≤2 GB VPS still has enough
# threads for ≥2 API workers + scale-up while a request waits on Wings.
_fp_mem_mb() {
	_v=$(printf '%s' "$1" | tr '[:lower:]' '[:upper:]')
	case "$_v" in
	*G) echo $((${_v%G} * 1024)) ;;
	*M) echo "${_v%M}" ;;
	*K) echo $((${_v%K} / 1024)) ;;
	'' | -1 | *[!0-9]*) echo 256 ;;
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
	_fp_per=$(_fp_mem_mb "${FEATHERPANEL_WORKER_MAX_MEMORY:-256M}")
	[ "$_fp_per" -ge 64 ] || _fp_per=64
	FRANKENPHP_MAX_THREADS=$((_fp_avail * 6 / 10 / _fp_per))
	# 8 = 2 api + headroom to scale while blocked on Wings/HTTP + 1 slow + 1 classic.
	[ "$FRANKENPHP_MAX_THREADS" -ge 8 ] || FRANKENPHP_MAX_THREADS=8
	[ "$FRANKENPHP_MAX_THREADS" -le 64 ] || FRANKENPHP_MAX_THREADS=64
	export FRANKENPHP_MAX_THREADS
	echo "FrankenPHP: max_threads=${FRANKENPHP_MAX_THREADS} (${_fp_avail} MB available, ${_fp_per} MB per thread)"
fi

# FrankenPHP refuses to start when the workers (plus one regular thread for
# phpMyAdmin & co.) need more threads than max_threads allows.
# Keep at least 2 API workers and leave scale-up room: a single API worker
# deadlocks when a request blocks on Wings/HTTP (server create, installs and
# transfers then time out with cURL error 28).
if [ "$FEATHERPANEL_PHP_MODE" = worker ]; then
	case "${FRANKENPHP_MAX_THREADS:-auto}" in
	'' | *[!0-9]*) ;; # "auto": FrankenPHP sizes it, nothing to clamp
	*)
		_fp_max=$FRANKENPHP_MAX_THREADS
		_fp_classic=1
		_fp_budget=$((_fp_max - _fp_classic))
		if [ "$_fp_budget" -lt 2 ]; then
			echo "FrankenPHP: FRANKENPHP_MAX_THREADS=${_fp_max} is too small for worker mode (needs 3+), using classic mode"
			FEATHERPANEL_PHP_MODE=classic
		else
			_fp_before_workers=$FEATHERPANEL_WORKERS
			_fp_before_slow=$FEATHERPANEL_SLOW_WORKERS
			# Never run with a single API worker: shrink slow first, then API start count.
			# Also leave ≥2 free threads for scale-up while a request waits on Wings/HTTP.
			_fp_need_fit=0
			[ "$FEATHERPANEL_WORKERS" -ge 2 ] || _fp_need_fit=1
			[ $((FEATHERPANEL_WORKERS + FEATHERPANEL_SLOW_WORKERS)) -le "$_fp_budget" ] || _fp_need_fit=1
			[ $((_fp_max - FEATHERPANEL_WORKERS - FEATHERPANEL_SLOW_WORKERS - _fp_classic)) -ge 2 ] || _fp_need_fit=1
			if [ "$_fp_need_fit" -eq 1 ]; then
				if [ "$_fp_budget" -ge 3 ]; then
					[ "$FEATHERPANEL_SLOW_WORKERS" -le $((_fp_budget - 2)) ] || FEATHERPANEL_SLOW_WORKERS=$((_fp_budget - 2))
					[ "$FEATHERPANEL_SLOW_WORKERS" -ge 1 ] || FEATHERPANEL_SLOW_WORKERS=1
				else
					FEATHERPANEL_SLOW_WORKERS=0
				fi
				_fp_api_cap=$((_fp_budget - FEATHERPANEL_SLOW_WORKERS))
				# Start at most half the API budget so Wings/HTTP waits can scale up.
				_fp_api_start=$(((_fp_api_cap + 1) / 2))
				[ "$_fp_api_start" -ge 2 ] || _fp_api_start=2
				[ "$_fp_api_start" -le "$_fp_api_cap" ] || _fp_api_start=$_fp_api_cap
				FEATHERPANEL_WORKERS=$_fp_api_start
			fi
			_fp_api_cap=$((_fp_budget - FEATHERPANEL_SLOW_WORKERS))
			[ "$_fp_api_cap" -ge 2 ] || _fp_api_cap=2
			[ "$FEATHERPANEL_WORKERS" -ge 2 ] || FEATHERPANEL_WORKERS=2
			[ "$FEATHERPANEL_WORKERS" -le "$_fp_api_cap" ] || FEATHERPANEL_WORKERS=$_fp_api_cap
			# Cap the API pool at the threads actually left after slow + classic
			# (not the global max — slow + classic already reserve slots).
			[ "$FEATHERPANEL_WORKER_MAX_THREADS" -le "$_fp_api_cap" ] || FEATHERPANEL_WORKER_MAX_THREADS=$_fp_api_cap
			if [ "$FEATHERPANEL_WORKER_MAX_THREADS" -le "$FEATHERPANEL_WORKERS" ] && [ "$_fp_api_cap" -gt "$FEATHERPANEL_WORKERS" ]; then
				FEATHERPANEL_WORKER_MAX_THREADS=$_fp_api_cap
			fi
			[ "$FEATHERPANEL_SLOW_MAX_THREADS" -le "$_fp_max" ] || FEATHERPANEL_SLOW_MAX_THREADS=$_fp_max
			[ "$FEATHERPANEL_SLOW_MAX_THREADS" -ge "$FEATHERPANEL_SLOW_WORKERS" ] || FEATHERPANEL_SLOW_MAX_THREADS=$FEATHERPANEL_SLOW_WORKERS
			if [ "$FEATHERPANEL_WORKERS" -ne "$_fp_before_workers" ] || [ "$FEATHERPANEL_SLOW_WORKERS" -ne "$_fp_before_slow" ]; then
				echo "FrankenPHP: workers lowered to ${FEATHERPANEL_WORKERS} api (up to ${FEATHERPANEL_WORKER_MAX_THREADS}) + ${FEATHERPANEL_SLOW_WORKERS} slow to fit FRANKENPHP_MAX_THREADS=${_fp_max}"
			fi
		fi
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
unset _fp_cpus _fp_max _fp_classic _fp_budget _fp_api_cap _fp_api_start _fp_before_workers _fp_before_slow _fp_need_fit _fp_env_file
unset -f _fp_env_get _fp_mercure_key _fp_mem_mb
