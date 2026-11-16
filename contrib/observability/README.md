# FeatherPanel observability

Everything here is optional. The panel works the same without it.

FeatherPanel can expose:

| What | Where | Default |
| --- | --- | --- |
| Prometheus metrics | `GET /api/system/metrics` | off |
| Liveness probe | `GET /api/health/live` | on |
| Readiness probe | `GET /api/health/ready` | on |
| Structured JSON logs | `storage/logs/featherpanel.json.log` and/or stderr | off |
| Direct Loki push | your Loki `/loki/api/v1/push` | off |

All of it is configured in **Admin → Observability** (needs `admin.settings.view` to see, `admin.settings.edit` to change).

This folder has a Docker Compose stack (Prometheus, Loki, Grafana Alloy, Grafana) with alert rules and four dashboards:

- **FeatherPanel / Overview**: health, users, servers, nodes, tickets, mail, backups, cron, runtime
- **FeatherPanel / Nodes & Servers**: node reachability, daemon CPU/memory/disk, allocation, servers by status
- **FeatherPanel / HTTP performance**: request rate, error ratio, p50/p95/p99 latency, heatmap, top and slowest routes
- **FeatherPanel / Logs**: log volume by level, errors by logger, access log status and latency, search and request id tracing

The dashboards are also importable on their own (Grafana → Dashboards → Import). They ask for a Prometheus or Loki data source.

## Quick start

1. In the panel, open **Admin → Observability**:
   - turn on **Enable the metrics endpoint**, click **Generate token** and copy the token (it is shown only once)
   - turn on **Write JSON logs** with output **File**
   - save
2. On the panel host:

   ```bash
   cd contrib/observability
   cp .env.example .env            # set GF_SECURITY_ADMIN_PASSWORD
   printf '%s' 'fpm_...' > secrets/featherpanel-metrics-token
   chmod 600 secrets/featherpanel-metrics-token
   docker volume ls | grep logs    # put the panel's logs volume name in .env (FEATHERPANEL_LOGS_VOLUME)
   docker compose up -d
   ```

3. Open Grafana on `http://127.0.0.1:3000` and look in the **FeatherPanel** folder.

All ports bind to `127.0.0.1`. Put Grafana behind your reverse proxy (or an SSH tunnel) instead of opening it to the internet.

`prometheus/prometheus.yml` scrapes `host.docker.internal:4831`, the panel's default public port from the main `docker-compose.yml`. Change the target (and `scheme: https`) when Prometheus runs elsewhere, for example `panel.example.com:443`.

## Metrics endpoint

```bash
curl -H "Authorization: Bearer $TOKEN" https://panel.example.com/api/system/metrics
```

Access control (Admin → Observability → Prometheus metrics):

- **Bearer token (recommended)**: the token is `fpm_` + 48 hex characters. The panel stores only its SHA-256 hash and compares in constant time. When the IP allowlist is also filled in, both must match.
- **IP allowlist only**: one IP or CIDR per line (IPv4 and IPv6). The client IP is the same one the panel uses elsewhere (Cloudflare `CF-Connecting-IP` aware), so make sure your proxy setup is trusted.

Responses:

| Case | Status | Code |
| --- | --- | --- |
| Metrics turned off | 404 | `METRICS_DISABLED` |
| Token mode but no token generated, or IP mode with an empty allowlist | 403 | `METRICS_NOT_CONFIGURED` |
| Missing or wrong token | 401 (`WWW-Authenticate: Bearer`) | `METRICS_UNAUTHORIZED` |
| IP not in the allowlist | 403 | `METRICS_IP_NOT_ALLOWED` |
| OK | 200 `text/plain; version=0.0.4` | |

Rotating the token invalidates the old one right away. Revoking it makes every scrape fail until a new one is generated.

### What is exported

Run the endpoint once to see the full list with help text. Highlights:

| Metric | Labels |
| --- | --- |
| `featherpanel_up`, `featherpanel_info` | `version`, `php_version`, `php_mode`, ... |
| `featherpanel_http_requests_total` (counter) | `method`, `route` (template, `unmatched` for 404), `status`, `status_class` |
| `featherpanel_http_request_duration_seconds` (histogram) | `method`, `route` |
| `featherpanel_database_up`, `_latency_seconds`, `_size_bytes`, `_connections` | |
| `featherpanel_redis_up`, `_latency_seconds`, `_used_memory_bytes`, `_connected_clients` | |
| `featherpanel_users`, `_users_banned`, `_users_two_factor_enabled`, `_users_active` | `window` (24h, 30d) |
| `featherpanel_nodes`, `_nodes_online`, `_nodes_maintenance` | |
| `featherpanel_node_info`, `_node_up`, `_node_probe_latency_seconds` | `node_id`, `node` |
| `featherpanel_node_cpu_usage_percent`, `_node_memory_*_bytes`, `_node_disk_*_bytes` | `node_id`, `node` |
| `featherpanel_servers`, `_servers_by_status`, `_servers_suspended`, `_node_servers` | `status`, `node_id`, `node` |
| `featherpanel_backups`, `_backups_size_bytes`, `_backups_last_success_timestamp_seconds` | `state` |
| `featherpanel_tickets`, `_tickets_open`, `_tickets_open_by_status` | `status` |
| `featherpanel_mail_queue`, `_mail_queue_oldest_pending_age_seconds` | `status` |
| `featherpanel_cron_task_last_run_timestamp_seconds`, `_cron_task_last_run_success`, `_cron_heartbeat_timestamp_seconds` | `task` |
| `featherpanel_jobs` | `queue`, `status` |
| `featherpanel_loki_queue_length`, `_loki_pushed_lines_total`, `_loki_push_failures_total` | |
| `featherpanel_metrics_collector_success` | `collector` |

Notes:

- HTTP counters live in Redis (one pipelined write per request), so every PHP worker and FrankenPHP thread adds to the same numbers. Without Redis the HTTP series are missing; everything else still works. If more than 20,000 label combinations pile up, the counters reset (`featherpanel_http_metrics_started_timestamp_seconds` changes).
- Node reachability and usage come from a parallel status probe to each daemon, cached for 30 seconds. Turn off **Probe nodes** to skip it.
- Each section is collected separately. A broken section shows up as `featherpanel_metrics_collector_success{collector="..."} 0` instead of failing the scrape.

## Health probes

```bash
curl -i https://panel.example.com/api/health/live    # 200 while PHP answers
curl -i https://panel.example.com/api/health/ready   # 200 ok/degraded, 503 fail
```

`ready` checks the database, storage and disk (critical) plus Redis and Mercure (non-critical, they only mark the panel `degraded`). The response lists each check with its status and latency. Error details are never returned, only generic messages. Both endpoints are public and send `Cache-Control: no-store`.

Kubernetes example:

```yaml
livenessProbe:
  httpGet: { path: /api/health/live, port: 80 }
  periodSeconds: 15
readinessProbe:
  httpGet: { path: /api/health/ready, port: 80 }
  periodSeconds: 15
  failureThreshold: 3
```

## Structured logs

With **Write JSON logs** on, every panel log line is also written as one JSON object per line:

```json
{"timestamp":"2026-11-16T07:42:10.123456Z","level":"warning","message":"GET /api/nope 404","logger":"http","app":"featherpanel","version":"v1.5.4","instance":"panel-1","request_id":"0af7651916cd43dd8448eb211c80319c","user_id":"6f1c...","route":null,"method":"GET","context":{"type":"access","status":404,"duration_ms":3.1,"ip":"203.0.113.9"}}
```

- Output: `storage/logs/featherpanel.json.log` (rotated to `.1` at 50 MB), stderr (container logs), or both. `FEATHERPANEL_LOG_FORMAT=json` and `FEATHERPANEL_LOG_JSON_TARGET=file|stderr|both` force it from the environment.
- Messages and context go through the panel's log redactor (passwords, tokens and keys are masked).
- **Access log** adds one line per API request with method, route template, status, duration, IP and user.
- **Request ids**: an incoming `X-Request-Id` (8 to 128 characters of `A-Z a-z 0-9 . _ : -`) is kept, anything else is replaced by a random id. The id is returned in the `X-Request-ID` response header, written to every log line of that request and sent to Wings on daemon calls.

`alloy/config.alloy` tails the file and turns `level` into a Loki label. A commented section reads container stderr instead, for setups that log to stderr. Use one of the two, not both.

## Direct Loki push

No agent needed: turn on **Push logs to Loki** and fill in the URL (base URL or full push URL), optional basic auth, tenant (`X-Scope-OrgID`) and extra labels (`env=production`, one per line). **Send test line** pushes one line right away with the values in the form.

How it works:

- Lines at or above the minimum level are queued in Redis (`featherpanel:obs:loki:queue`, capped at 20,000 lines; without Redis a capped spool file in `storage/logs` is used).
- The `loki-log-shipper` cron task pushes the queue every minute in batches of 1,000. Requests never wait on Loki.
- When a push fails the batch goes back to the queue and the error is shown on the admin page and in `featherpanel_loki_push_failures_total`.
- Streams get the labels `app`, `job`, `instance`, `level` and your extra labels. Keep extra labels low-cardinality.
- The password is stored encrypted with the other panel settings and never sent back to the browser.

## Alerts

`prometheus/alerts.yml` has starter rules: panel unreachable, database or Redis down, node down (not in maintenance), 5xx ratio above 5%, p95 latency above 2 s, cron stalled, mail stuck, storage below 10% and Loki push failing. Wire them to Alertmanager or use Grafana alerting.

## Files

```
contrib/observability/
├── docker-compose.yml
├── .env.example
├── prometheus/prometheus.yml      scrape config (bearer token from secrets/)
├── prometheus/alerts.yml          alert rules
├── loki/loki.yml                  single-binary Loki, 30 day retention
├── alloy/config.alloy             ships featherpanel.json.log to Loki
├── grafana/provisioning/          data sources and dashboard provider
├── grafana/dashboards/            the four dashboards
└── secrets/                       put featherpanel-metrics-token here (git-ignored)
```
