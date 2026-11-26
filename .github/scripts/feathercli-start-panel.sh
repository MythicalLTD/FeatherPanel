#!/usr/bin/env bash
set -euo pipefail
nohup php -S 127.0.0.1:8080 -t public public/index.php > /tmp/panel-http.log 2>&1 &
echo $! > /tmp/panel-http.pid
for i in $(seq 1 30); do
  if curl -sf http://127.0.0.1:8080/api/health/live >/dev/null 2>&1; then
    echo "panel up"
    exit 0
  fi
  sleep 1
done
echo "panel failed to start"
echo "--- last health probe ---"
curl -sS -D - -o /tmp/panel-health.body http://127.0.0.1:8080/api/health/live || true
echo
cat /tmp/panel-health.body 2>/dev/null || true
echo
echo "--- panel-http.log ---"
cat /tmp/panel-http.log || true
exit 1
