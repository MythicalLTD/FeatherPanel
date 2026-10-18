#!/bin/sh
# Shared by backend/init.sh and the all-in-one image (deploy/oci): derive the
# Caddyfile variables for the PHP mode and size the worker pools so they always
# fit into FRANKENPHP_MAX_THREADS. Source it (". frankenphp-env.sh"); it only
# exports variables and prints one summary line.

# FEATHERPANEL_WORKER_MODE=true serves /api/* from booted FrankenPHP workers;
# anything else keeps the classic one-request-per-boot mode.
case "$(printf '%s' "${FEATHERPANEL_WORKER_MODE:-false}" | tr '[:upper:]' '[:lower:]')" in
true | 1 | yes | on) FEATHERPANEL_PHP_MODE=worker ;;
*) FEATHERPANEL_PHP_MODE=classic ;;
esac

_fp_cpus=$(nproc 2>/dev/null || echo 2)
FEATHERPANEL_WORKERS="${FEATHERPANEL_WORKERS:-$((_fp_cpus * 2))}"
FEATHERPANEL_SLOW_WORKERS="${FEATHERPANEL_SLOW_WORKERS:-2}"
FEATHERPANEL_SLOW_MAX_THREADS="${FEATHERPANEL_SLOW_MAX_THREADS:-16}"

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
		[ "$FEATHERPANEL_SLOW_MAX_THREADS" -ge "$FEATHERPANEL_SLOW_WORKERS" ] || FEATHERPANEL_SLOW_MAX_THREADS=$FEATHERPANEL_SLOW_WORKERS
		;;
	esac
fi

export FEATHERPANEL_PHP_MODE FEATHERPANEL_WORKERS FEATHERPANEL_SLOW_WORKERS FEATHERPANEL_SLOW_MAX_THREADS
echo "FrankenPHP: PHP mode ${FEATHERPANEL_PHP_MODE} (FEATHERPANEL_WORKER_MODE=${FEATHERPANEL_WORKER_MODE:-false}, workers ${FEATHERPANEL_WORKERS} api + ${FEATHERPANEL_SLOW_WORKERS} slow, max_threads ${FRANKENPHP_MAX_THREADS:-auto})"
unset _fp_cpus _fp_max
