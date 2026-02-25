#!/usr/bin/env bash
# Quick check: are containers up and is traffic reaching the frontend?
# Run from repo root: ./scripts/docker-check.sh
# Frontend is published on host port 4831 (see docker-compose.v2.git.yml).

set -e
echo "=== Containers (v2 compose) ==="
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" --filter "name=featherpanel"

echo ""
echo "=== Port 4831 on host (expect 0.0.0.0:4831 or 127.0.0.1:4831) ==="
ss -tlnp 2>/dev/null | grep 4831 || netstat -tlnp 2>/dev/null | grep 4831 || echo "Port 4831 not listening. Start stack: docker compose -f docker-compose.v2.git.yml up -d"

echo ""
echo "=== HTTP GET http://127.0.0.1:4831 (expect 200) ==="
code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 http://127.0.0.1:4831/ 2>/dev/null || echo "000")
if [ "$code" = "200" ] || [ "$code" = "302" ]; then
  echo "OK HTTP $code - traffic is reaching the frontend."
else
  echo "HTTP $code - if 000, nothing is listening on 4831 or firewall blocks it."
fi

echo ""
echo "=== Frontend container logs (last 8 lines) ==="
docker logs featherpanel_frontendv2 --tail 8 2>&1 || true
