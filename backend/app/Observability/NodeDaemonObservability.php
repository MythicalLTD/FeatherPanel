<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Observability;

use App\Chat\Database;
use GuzzleHttp\Client;
use GuzzleHttp\Promise\Utils;
use App\Helpers\WingsUrlHelper;
use App\Runtime\RequestContext;
use App\Chat\NodeMetricsSetting;
use App\Helpers\NodeStatusHelper;
use App\Helpers\FeatherQuilldProbe;
use Psr\Http\Message\ResponseInterface;

/**
 * Reads the health and Prometheus endpoints of FeatherWings and FeatherQuilld nodes
 * so the admin area can show node status and live metrics.
 *
 * - /health/ready is read with the node token, which unlocks per-check messages.
 * - /metrics is read with the node's scrape token when one is saved. FeatherWings
 *   never accepts its node token there; FeatherQuilld does, so for web nodes the
 *   node token is the fallback. The node token is only ever sent to the node's
 *   own host.
 * - Daemons older than these endpoints answer 404: the node is reported as
 *   "unsupported" (update the daemon) instead of offline.
 *
 * Results are cached in Redis for CACHE_TTL seconds so several admins watching a
 * node do not multiply requests to the daemon.
 */
final class NodeDaemonObservability
{
    public const KIND_WINGS = NodeMetricsSetting::KIND_WINGS;
    public const KIND_WEB = NodeMetricsSetting::KIND_WEB;

    public const STATUS_HEALTHY = 'healthy';
    public const STATUS_DEGRADED = 'degraded';
    public const STATUS_UNHEALTHY = 'unhealthy';
    public const STATUS_UNREACHABLE = 'unreachable';
    public const STATUS_UNSUPPORTED = 'unsupported';

    public const CACHE_TTL = 20;
    /** Minimum age before ?refresh=1 may bypass the cache. */
    public const MIN_REFRESH_AGE = 5;
    public const TIMEOUT = 5;
    public const MAX_BODY_BYTES = 8388608;
    public const TOP_ITEMS = 10;

    private const CACHE_PREFIX = 'featherpanel:obs:daemon:';

    /**
     * Full report for one node: health checks, metrics summary and (for Wings) host utilization.
     *
     * @param array<string, mixed> $node decrypted node row
     *
     * @return array<string, mixed>
     */
    public static function report(string $kind, array $node, bool $refresh = false): array
    {
        $nodeId = (int) ($node['id'] ?? 0);
        $key = self::CACHE_PREFIX . $kind . ':full:' . $nodeId;
        $cached = self::cacheGet($key);
        if ($cached !== null && (!$refresh || (time() - (int) ($cached['fetched_at'] ?? 0)) < self::MIN_REFRESH_AGE)) {
            $cached['cached'] = true;

            return $cached;
        }

        $report = self::fetch($kind, $node, true);
        self::cacheSet($key, $report);
        self::cacheSet(self::CACHE_PREFIX . $kind . ':health:' . $nodeId, self::compact($report));

        return $report;
    }

    /**
     * Compact health status for many nodes (list pages). Probes uncached nodes in parallel.
     *
     * @param array<int, array<string, mixed>> $nodes decrypted node rows
     *
     * @return array<int, array<string, mixed>> node id => compact status
     */
    public static function healthSummaries(string $kind, array $nodes): array
    {
        $out = [];
        $pending = [];
        foreach ($nodes as $node) {
            $id = (int) ($node['id'] ?? 0);
            if ($id <= 0) {
                continue;
            }
            $cached = self::cacheGet(self::CACHE_PREFIX . $kind . ':health:' . $id);
            if ($cached !== null) {
                $cached['cached'] = true;
                $out[$id] = $cached;
                continue;
            }
            $pending[$id] = $node;
        }

        if ($pending === []) {
            return $out;
        }

        $client = self::client();
        $promises = [];
        $started = [];
        foreach ($pending as $id => $node) {
            $started[$id] = microtime(true);
            $promises[$id] = $client->getAsync(self::baseUrl($node) . '/health/ready', [
                'headers' => self::headers(self::nodeBearer($kind, $node)),
            ]);
        }

        foreach (Utils::settle($promises)->wait() as $id => $outcome) {
            $id = (int) $id;
            $health = self::interpretHealth($kind, $outcome, $started[$id] ?? microtime(true));
            $status = $health['overall'];
            $compact = [
                'node_id' => $id,
                'kind' => $kind,
                'status' => $status,
                'failing_checks' => $health['failing'],
                'http_status' => $health['http_status'],
                'latency_ms' => $health['latency_ms'],
                'error' => $health['error'],
                'fetched_at' => time(),
                'cached' => false,
            ];
            self::cacheSet(self::CACHE_PREFIX . $kind . ':health:' . $id, $compact);
            $out[$id] = $compact;
        }

        return $out;
    }

    public static function forget(string $kind, int $nodeId): void
    {
        $redis = ObservabilityRedis::connection();
        if ($redis === null) {
            return;
        }
        try {
            $redis->del([self::CACHE_PREFIX . $kind . ':full:' . $nodeId, self::CACHE_PREFIX . $kind . ':health:' . $nodeId]);
        } catch (\Throwable) {
        }
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    public static function fetch(string $kind, array $node, bool $withMetrics = true): array
    {
        $nodeId = (int) ($node['id'] ?? 0);
        $settings = NodeMetricsSetting::get($kind, $nodeId);
        $base = self::baseUrl($node);
        $nodeBearer = self::nodeBearer($kind, $node);
        $metricsUrl = $settings['metrics_url'] ?? null;
        $metricsTarget = $metricsUrl ?? ($base . '/metrics');
        $metricsBearer = self::metricsBearer($kind, $node, $settings);

        $client = self::client();
        $started = microtime(true);
        $promises = [
            'health' => $client->getAsync($base . '/health/ready', ['headers' => self::headers($nodeBearer)]),
        ];
        if ($withMetrics) {
            $promises['metrics'] = $client->getAsync($metricsTarget, [
                'headers' => self::headers($metricsBearer['token'], 'text/plain; version=0.0.4, */*;q=0.5'),
            ]);
        }
        if ($kind === self::KIND_WINGS && $nodeBearer !== null) {
            $promises['utilization'] = $client->getAsync($base . '/api/system/utilization', ['headers' => self::headers($nodeBearer)]);
        }

        $settled = Utils::settle($promises)->wait();
        $health = self::interpretHealth($kind, $settled['health'], $started);

        $metrics = null;
        if ($withMetrics) {
            $metrics = self::interpretMetrics($kind, $settled['metrics'], $metricsBearer['source'], $metricsUrl !== null);
            if ($metrics['state'] === 'ok' && isset($metrics['parser'])) {
                /** @var PrometheusParser $parser */
                $parser = $metrics['parser'];
                $metrics['summary'] = $kind === self::KIND_WINGS ? self::summarizeWings($parser) : self::summarizeQuilld($parser);
            }
            unset($metrics['parser']);
        }

        $host = null;
        if ($kind === self::KIND_WINGS) {
            $host = self::wingsHost($node, $settled['utilization'] ?? null);
        } elseif (is_array($metrics['summary']['host'] ?? null)) {
            $host = $metrics['summary']['host'];
        }

        $overall = $health['overall'];
        $legacy = null;
        if ($overall === self::STATUS_UNSUPPORTED && is_array($metrics) && $metrics['state'] === 'not_enabled' && $metricsUrl === null) {
            $metrics['state'] = 'unsupported';
            $metrics['error'] = 'The daemon is older than the health and metrics endpoints. Update the daemon to see live metrics.';
        }
        if ($overall === self::STATUS_UNSUPPORTED) {
            // The daemon may be older than /health/*. Tell "old but online" from "offline".
            $legacy = self::legacyProbe($kind, $node, $host !== null);
            if (!$legacy['online']) {
                $overall = self::STATUS_UNREACHABLE;
            }
        }

        return [
            'node_id' => $nodeId,
            'kind' => $kind,
            'status' => $overall,
            'fetched_at' => time(),
            'cached' => false,
            'cache_ttl' => self::CACHE_TTL,
            'health' => [
                'supported' => $health['supported'],
                'status' => $health['status_raw'],
                'http_status' => $health['http_status'],
                'detailed' => $health['detailed'],
                'latency_ms' => $health['latency_ms'],
                'version' => $health['version'],
                'error' => $health['error'],
                'checks' => $health['checks'],
            ],
            'legacy' => $legacy,
            'metrics' => $metrics,
            'host' => $host,
            'settings' => NodeMetricsSetting::publicView($kind, $nodeId),
        ];
    }

    /**
     * @param array<string, mixed> $outcome settled promise
     *
     * @return array<string, mixed>
     */
    public static function interpretHealth(string $kind, array $outcome, float $started): array
    {
        $result = [
            'overall' => self::STATUS_UNREACHABLE,
            'supported' => false,
            'reachable' => false,
            'status_raw' => null,
            'http_status' => null,
            'detailed' => false,
            'latency_ms' => (int) max(0, round((microtime(true) - $started) * 1000)),
            'version' => null,
            'error' => null,
            'checks' => [],
            'failing' => [],
        ];

        if (($outcome['state'] ?? '') !== 'fulfilled' || !($outcome['value'] ?? null) instanceof ResponseInterface) {
            $reason = $outcome['reason'] ?? null;
            $result['error'] = $reason instanceof \Throwable ? self::shortError($reason) : 'Request failed';

            return $result;
        }

        /** @var ResponseInterface $response */
        $response = $outcome['value'];
        $code = $response->getStatusCode();
        $result['http_status'] = $code;
        $result['reachable'] = true;
        $body = json_decode(self::readBody($response, 262144), true);

        if (!is_array($body) || !is_string($body['status'] ?? null) || !is_array($body['checks'] ?? null)) {
            if (in_array($code, [502, 504], true)) {
                // A reverse proxy in front of the daemon answered, the daemon did not.
                $result['reachable'] = false;
                $result['error'] = 'Daemon did not answer (HTTP ' . $code . ' from proxy)';

                return $result;
            }
            $result['overall'] = self::STATUS_UNSUPPORTED;
            $result['error'] = $code === 404
                ? 'Daemon has no /health/ready endpoint (update the daemon)'
                : 'Unexpected health response (HTTP ' . $code . ')';

            return $result;
        }

        $result['supported'] = true;
        $raw = strtolower($body['status']);
        $result['status_raw'] = $raw;
        $result['overall'] = self::mapStatus($raw, $code);
        $result['version'] = is_string($body['version'] ?? null) ? $body['version'] : null;

        foreach ($body['checks'] as $name => $check) {
            if (!is_array($check)) {
                continue;
            }
            $status = self::mapCheckStatus((string) ($check['status'] ?? ''));
            $message = null;
            foreach (['message', 'description'] as $field) {
                if (is_string($check[$field] ?? null) && $check[$field] !== '') {
                    $message = mb_substr($check[$field], 0, 500);
                    break;
                }
            }
            $error = is_string($check['error'] ?? null) && $check['error'] !== '' ? mb_substr($check['error'], 0, 500) : null;
            if ($message !== null || $error !== null || isset($check['duration_ms'])) {
                $result['detailed'] = true;
            }
            $data = null;
            if (is_array($check['data'] ?? null)) {
                $data = [];
                foreach ($check['data'] as $dk => $dv) {
                    if (is_scalar($dv) || $dv === null) {
                        $data[(string) $dk] = is_string($dv) ? mb_substr($dv, 0, 300) : $dv;
                    }
                }
            }
            $entry = [
                'name' => (string) $name,
                'status' => $status,
                'critical' => isset($check['critical']) ? (bool) $check['critical'] : null,
                'message' => $message,
                'error' => $error,
                'duration_ms' => is_numeric($check['duration_ms'] ?? null) ? round((float) $check['duration_ms'], 2) : null,
                'data' => $data,
            ];
            $result['checks'][] = $entry;
            if ($status !== 'ok') {
                $result['failing'][] = (string) $name;
            }
        }

        usort($result['checks'], static fn (array $a, array $b): int => strcmp($a['name'], $b['name']));
        sort($result['failing']);

        return $result;
    }

    /**
     * @param array<string, mixed> $outcome settled promise
     *
     * @return array<string, mixed>
     */
    public static function interpretMetrics(string $kind, array $outcome, string $tokenSource, bool $customUrl): array
    {
        $result = [
            'state' => 'unreachable',
            'http_status' => null,
            'token_source' => $tokenSource,
            'custom_url' => $customUrl,
            'error' => null,
            'samples' => 0,
            'summary' => null,
        ];

        if (($outcome['state'] ?? '') !== 'fulfilled' || !($outcome['value'] ?? null) instanceof ResponseInterface) {
            $reason = $outcome['reason'] ?? null;
            $result['error'] = $reason instanceof \Throwable ? self::shortError($reason) : 'Request failed';

            return $result;
        }

        /** @var ResponseInterface $response */
        $response = $outcome['value'];
        $code = $response->getStatusCode();
        $result['http_status'] = $code;

        if ($code === 401) {
            $result['state'] = 'unauthorized';
            $result['error'] = $tokenSource === 'none'
                ? 'The daemon requires a metrics token. Add it in the node metrics settings.'
                : 'The daemon rejected the metrics token.';

            return $result;
        }
        if ($code === 403) {
            $result['state'] = 'forbidden';
            $result['error'] = 'The daemon does not allow the panel address to read metrics (allowed_ips).';

            return $result;
        }
        if ($code === 404) {
            $result['state'] = 'not_enabled';
            $result['error'] = 'Metrics are disabled on the daemon, served on a dedicated port (set the metrics URL), or the daemon is too old.';

            return $result;
        }
        if ($code < 200 || $code >= 300) {
            $result['state'] = 'error';
            $result['error'] = 'Daemon answered HTTP ' . $code;

            return $result;
        }

        $parser = PrometheusParser::parse(self::readBody($response, self::MAX_BODY_BYTES));
        $prefix = $kind === self::KIND_WINGS ? 'featherwings_' : 'featherquilld_';
        $result['samples'] = $parser->count();
        if (!$parser->hasPrefix($prefix)) {
            $result['state'] = 'unsupported';
            $result['error'] = 'The endpoint answered but exported no ' . $prefix . '* metrics.';

            return $result;
        }

        $result['state'] = 'ok';
        $result['parser'] = $parser;

        return $result;
    }

    /**
     * @return array<string, mixed>
     */
    public static function summarizeWings(PrometheusParser $p): array
    {
        $byState = ['running' => 0, 'starting' => 0, 'stopping' => 0, 'offline' => 0];
        foreach ($p->sumBy('featherwings_servers', 'state') as $state => $count) {
            $byState[$state] = (int) $count;
        }

        $servers = [];
        foreach ($p->samples('featherwings_server_state') as $s) {
            $uuid = $s['labels']['server'] ?? '';
            if ($uuid !== '' && $s['value'] >= 1) {
                $servers[$uuid]['state'] = $s['labels']['state'] ?? 'unknown';
            }
        }
        $perServer = [
            'featherwings_server_cpu_absolute_percent' => 'cpu_percent',
            'featherwings_server_memory_bytes' => 'memory_bytes',
            'featherwings_server_memory_limit_bytes' => 'memory_limit_bytes',
            'featherwings_server_disk_bytes' => 'disk_bytes',
            'featherwings_server_network_rx_bytes_total' => 'network_rx_bytes',
            'featherwings_server_network_tx_bytes_total' => 'network_tx_bytes',
            'featherwings_server_uptime_seconds' => 'uptime_seconds',
        ];
        $totals = array_fill_keys(array_values($perServer), 0.0);
        foreach ($perServer as $metric => $field) {
            foreach ($p->samples($metric) as $s) {
                $uuid = $s['labels']['server'] ?? '';
                if ($uuid === '' || !is_finite($s['value'])) {
                    continue;
                }
                $servers[$uuid][$field] = $s['value'];
                if ($field !== 'uptime_seconds') {
                    $totals[$field] += $s['value'];
                }
            }
        }

        $top = [];
        foreach ($servers as $uuid => $row) {
            $top[] = [
                'uuid' => (string) $uuid,
                'state' => (string) ($row['state'] ?? 'unknown'),
                'cpu_percent' => round((float) ($row['cpu_percent'] ?? 0), 2),
                'memory_bytes' => (int) ($row['memory_bytes'] ?? 0),
                'memory_limit_bytes' => (int) ($row['memory_limit_bytes'] ?? 0),
                'disk_bytes' => (int) ($row['disk_bytes'] ?? 0),
                'uptime_seconds' => (int) ($row['uptime_seconds'] ?? 0),
            ];
        }
        usort($top, static fn (array $a, array $b): int => [$b['cpu_percent'], $b['memory_bytes']] <=> [$a['cpu_percent'], $a['memory_bytes']]);
        $top = self::attachServerNames(array_slice($top, 0, self::TOP_ITEMS));

        $started = $p->value('process_start_time_seconds');
        $lastContact = $p->value('featherwings_panel_last_contact_timestamp_seconds');
        $panel = [];
        foreach ($p->sumBy('featherwings_panel_requests_total', 'result') as $result => $count) {
            $panel[$result] = (int) $count;
        }
        $http5xx = 0;
        foreach ($p->samples('featherwings_http_requests_total') as $s) {
            if (str_starts_with($s['labels']['status'] ?? '', '5')) {
                $http5xx += (int) $s['value'];
            }
        }

        return [
            'servers' => [
                'total' => array_sum($byState),
                'by_state' => $byState,
                'per_server_metrics' => $servers !== [],
            ],
            'resources' => [
                'cpu_percent' => round($totals['cpu_percent'], 2),
                'memory_bytes' => (int) $totals['memory_bytes'],
                'memory_limit_bytes' => (int) $totals['memory_limit_bytes'],
                'disk_bytes' => (int) $totals['disk_bytes'],
                'network_rx_bytes' => (int) $totals['network_rx_bytes'],
                'network_tx_bytes' => (int) $totals['network_tx_bytes'],
            ],
            'top_servers' => $top,
            'backups' => [
                'in_progress' => (int) ($p->sum('featherwings_backups_in_progress') ?? 0),
                'succeeded_total' => (int) ($p->sum('featherwings_backups_total', ['result' => 'success']) ?? 0),
                'failed_total' => (int) ($p->sum('featherwings_backups_total', ['result' => 'failure']) ?? 0),
            ],
            'transfers' => [
                'incoming' => (int) ($p->sum('featherwings_transfers_in_progress', ['direction' => 'incoming']) ?? 0),
                'outgoing' => (int) ($p->sum('featherwings_transfers_in_progress', ['direction' => 'outgoing']) ?? 0),
                'succeeded_total' => (int) ($p->sum('featherwings_transfers_total', ['result' => 'success']) ?? 0),
                'failed_total' => (int) ($p->sum('featherwings_transfers_total', ['result' => 'failure']) ?? 0),
            ],
            'sftp' => [
                'sessions' => (int) ($p->sum('featherwings_sftp_sessions') ?? 0),
                'listening' => self::flag($p->value('featherwings_sftp_listening')),
            ],
            'websockets' => (int) ($p->sum('featherwings_websocket_connections') ?? 0),
            'docker_up' => self::flag($p->value('featherwings_docker_up')),
            'http' => [
                'in_flight' => (int) ($p->sum('featherwings_http_requests_in_flight') ?? 0),
                'requests_total' => (int) ($p->sum('featherwings_http_requests_total') ?? 0),
                'errors_5xx_total' => $http5xx,
            ],
            'panel' => [
                'last_contact_at' => $lastContact !== null && $lastContact > 0 ? (int) $lastContact : null,
                'requests' => $panel,
            ],
            'daemon' => [
                'uptime_seconds' => $started !== null && $started > 0 ? max(0, time() - (int) $started) : null,
                'resident_memory_bytes' => self::intOrNull($p->value('process_resident_memory_bytes')),
                'cpu_seconds_total' => $p->value('process_cpu_seconds_total') !== null ? round((float) $p->value('process_cpu_seconds_total'), 2) : null,
                'goroutines' => self::intOrNull($p->value('go_goroutines')),
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function summarizeQuilld(PrometheusParser $p): array
    {
        $names = [];
        foreach ($p->samples('featherquilld_webspace_info') as $s) {
            $uuid = $s['labels']['webspace'] ?? '';
            if ($uuid !== '') {
                $names[$uuid] = (string) ($s['labels']['name'] ?? $uuid);
            }
        }

        $proxies = [];
        $providers = array_unique(array_merge(
            array_keys($p->sumBy('featherquilld_proxy_enabled', 'provider')),
            array_keys($p->sumBy('featherquilld_proxy_running', 'provider')),
        ));
        foreach ($providers as $provider) {
            $match = ['provider' => (string) $provider];
            $lastAt = $p->value('featherquilld_proxy_last_reload_timestamp_seconds', $match);
            $proxies[] = [
                'provider' => (string) $provider,
                'enabled' => self::flag($p->value('featherquilld_proxy_enabled', $match)),
                'running' => self::flag($p->value('featherquilld_proxy_running', $match)),
                'last_reload_success' => self::flag($p->value('featherquilld_proxy_last_reload_success', $match)),
                'last_reload_at' => $lastAt !== null && $lastAt > 0 ? (int) $lastAt : null,
                'reloads_succeeded_total' => (int) ($p->sum('featherquilld_proxy_reloads_total', $match + ['result' => 'success']) ?? 0),
                'reloads_failed_total' => (int) ($p->sum('featherquilld_proxy_reloads_total', $match + ['result' => 'failure']) ?? 0),
            ];
        }

        $byCategory = $p->sumBy('featherquilld_waf_events_total', 'category');
        arsort($byCategory);
        $byWebspace = $p->sumBy('featherquilld_waf_events_total', 'webspace');
        arsort($byWebspace);
        $topWebspaces = [];
        foreach (array_slice($byWebspace, 0, self::TOP_ITEMS, true) as $uuid => $count) {
            $topWebspaces[] = ['uuid' => (string) $uuid, 'name' => $names[$uuid] ?? (string) $uuid, 'events' => (int) $count];
        }

        $intMap = static function (array $values): array {
            $out = [];
            foreach ($values as $k => $v) {
                $out[(string) $k] = (int) $v;
            }

            return $out;
        };

        $diskTotal = $p->sum('featherquilld_data_disk_total_bytes');
        $diskFree = $p->sum('featherquilld_data_disk_free_bytes');
        $memTotal = $p->value('featherquilld_host_memory_total_bytes');
        $memUsed = $p->value('featherquilld_host_memory_used_bytes');
        $cpu = $p->value('featherquilld_host_cpu_percent');
        $version = null;
        foreach ($p->samples('featherquilld_build_info') as $s) {
            $version = $s['labels']['version'] ?? null;
            break;
        }

        $host = null;
        if ($cpu !== null || $memTotal !== null || $diskTotal !== null) {
            $host = [
                'source' => 'metrics',
                'cpu_percent' => $cpu !== null ? round($cpu, 2) : null,
                'cpu_threads' => self::intOrNull($p->value('featherquilld_host_cpu_threads')),
                'memory_total' => self::intOrNull($memTotal),
                'memory_used' => self::intOrNull($memUsed),
                'swap_total' => self::intOrNull($p->value('featherquilld_host_swap_total_bytes')),
                'swap_used' => self::intOrNull($p->value('featherquilld_host_swap_used_bytes')),
                'disk_total' => self::intOrNull($diskTotal),
                'disk_used' => $diskTotal !== null && $diskFree !== null ? (int) max(0, $diskTotal - $diskFree) : null,
                'load_average1' => $p->value('featherquilld_host_load', ['window' => '1m']),
                'load_average5' => $p->value('featherquilld_host_load', ['window' => '5m']),
                'load_average15' => $p->value('featherquilld_host_load', ['window' => '15m']),
            ];
        }

        return [
            'version' => $version,
            'uptime_seconds' => self::intOrNull($p->value('featherquilld_uptime_seconds')),
            'maintenance_mode' => self::flag($p->value('featherquilld_maintenance_mode')),
            'panel_reachable' => self::flag($p->value('featherquilld_panel_reachable')),
            'webspaces' => [
                'total' => (int) ($p->value('featherquilld_webspaces') ?? count($names)),
                'by_state' => $intMap($p->sumBy('featherquilld_webspaces_by_state', 'state')),
                'by_status' => $intMap($p->sumBy('featherquilld_webspaces_by_status', 'status')),
                'suspended' => (int) ($p->value('featherquilld_webspaces_suspended') ?? 0),
                'waf_enabled' => (int) ($p->value('featherquilld_webspaces_waf_enabled') ?? 0),
            ],
            'domains' => (int) ($p->value('featherquilld_domains') ?? 0),
            'proxies' => $proxies,
            'firewall' => [
                'events_total' => (int) ($p->sum('featherquilld_waf_events_total') ?? 0),
                'blocked_total' => (int) ($p->sum('featherquilld_waf_events_total', ['action' => 'blocked']) ?? 0),
                'detected_total' => (int) ($p->sum('featherquilld_waf_events_total', ['action' => 'detected']) ?? 0),
                'by_category' => $intMap(array_slice($byCategory, 0, self::TOP_ITEMS, true)),
                'top_webspaces' => $topWebspaces,
            ],
            'sftp' => [
                'auth_failures_total' => (int) ($p->sum('featherquilld_sftp_auth_failures_total') ?? 0),
                'lockouts_total' => (int) ($p->sum('featherquilld_sftp_lockouts_total') ?? 0),
            ],
            'host' => $host,
        ];
    }

    public static function mapStatus(string $raw, int $httpCode): string
    {
        return match ($raw) {
            'ok', 'healthy', 'pass' => self::STATUS_HEALTHY,
            'degraded', 'warn' => self::STATUS_DEGRADED,
            'unavailable', 'unhealthy', 'fail', 'down' => self::STATUS_UNHEALTHY,
            default => $httpCode >= 500 ? self::STATUS_UNHEALTHY : self::STATUS_DEGRADED,
        };
    }

    public static function mapCheckStatus(string $raw): string
    {
        return match (strtolower($raw)) {
            'ok', 'healthy', 'pass' => 'ok',
            'degraded', 'warn' => 'degraded',
            default => 'fail',
        };
    }

    /**
     * @param array<string, mixed> $node
     */
    public static function baseUrl(array $node): string
    {
        return rtrim(WingsUrlHelper::buildFromNode($node), '/');
    }

    /**
     * Credential the node daemon expects for its own API.
     *
     * @param array<string, mixed> $node
     */
    public static function nodeBearer(string $kind, array $node): ?string
    {
        $token = trim((string) ($node['daemon_token'] ?? ''));
        if ($token === '') {
            return null;
        }
        if ($kind === self::KIND_WEB) {
            $tokenId = trim((string) ($node['daemon_token_id'] ?? ''));

            return $tokenId === '' ? null : $tokenId . '.' . $token;
        }

        return $token;
    }

    /**
     * Token for /metrics and where it came from (metrics_token, node_token or none).
     *
     * @param array<string, mixed> $node
     * @param array{metrics_url: ?string, metrics_token: ?string} $settings
     *
     * @return array{token: ?string, source: string}
     */
    public static function metricsBearer(string $kind, array $node, array $settings): array
    {
        if (!empty($settings['metrics_token'])) {
            return ['token' => (string) $settings['metrics_token'], 'source' => 'metrics_token'];
        }
        if ($kind === self::KIND_WEB) {
            // FeatherQuilld accepts the node token on /metrics; only send it to the node itself.
            $url = $settings['metrics_url'] ?? null;
            $sameHost = $url === null
                || strcasecmp((string) parse_url($url, PHP_URL_HOST), trim((string) ($node['fqdn'] ?? ''), '[]/')) === 0;
            $bearer = self::nodeBearer($kind, $node);
            if ($bearer !== null && $sameHost) {
                return ['token' => $bearer, 'source' => 'node_token'];
            }
        }

        return ['token' => null, 'source' => 'none'];
    }

    /**
     * @param array<string, mixed> $node
     * @param array<string, mixed>|null $outcome
     *
     * @return array<string, mixed>|null
     */
    private static function wingsHost(array $node, ?array $outcome): ?array
    {
        $util = null;
        if ($outcome !== null && ($outcome['state'] ?? '') === 'fulfilled' && ($outcome['value'] ?? null) instanceof ResponseInterface) {
            /** @var ResponseInterface $response */
            $response = $outcome['value'];
            if ($response->getStatusCode() === 200) {
                $decoded = json_decode(self::readBody($response, 262144), true);
                $util = is_array($decoded) && $decoded !== [] ? $decoded : null;
            } elseif ($response->getStatusCode() === 404) {
                // Older or alternative daemons: reuse the panel's fallback chain (/stats, /system?v=2).
                $probe = NodeStatusHelper::probeNodesUtilization([$node], self::TIMEOUT);
                $first = reset($probe);
                $util = is_array($first['utilization'] ?? null) ? $first['utilization'] : null;
            }
        }
        if ($util === null) {
            return null;
        }

        $num = static fn (string $key): ?float => is_numeric($util[$key] ?? null) ? (float) $util[$key] : null;

        return [
            'source' => 'utilization',
            'cpu_percent' => $num('cpu_percent') !== null ? round((float) $num('cpu_percent'), 2) : null,
            'cpu_threads' => self::intOrNull($num('cpu_threads') ?? $num('cpu_count')),
            'memory_total' => self::intOrNull($num('memory_total')),
            'memory_used' => self::intOrNull($num('memory_used')),
            'swap_total' => self::intOrNull($num('swap_total')),
            'swap_used' => self::intOrNull($num('swap_used')),
            'disk_total' => self::intOrNull($num('disk_total')),
            'disk_used' => self::intOrNull($num('disk_used')),
            'load_average1' => $num('load_average1'),
            'load_average5' => $num('load_average5'),
            'load_average15' => $num('load_average15'),
        ];
    }

    /**
     * Is a daemon without /health/* still online? Uses the endpoints the panel already relies on.
     *
     * @param array<string, mixed> $node
     *
     * @return array{online: bool, error: ?string}
     */
    private static function legacyProbe(string $kind, array $node, bool $hostKnown): array
    {
        if ($hostKnown) {
            return ['online' => true, 'error' => null];
        }
        if ($kind === self::KIND_WEB) {
            $probe = FeatherQuilldProbe::probeHealth($node, self::TIMEOUT);
            $online = $probe['http_status'] !== null && (int) $probe['http_status'] < 500;

            return ['online' => $online, 'error' => $online ? null : ($probe['error'] ?? null)];
        }
        $probe = NodeStatusHelper::probeNodesUtilization([$node], self::TIMEOUT);
        $first = reset($probe);
        if ($first === false) {
            return ['online' => false, 'error' => null];
        }
        $online = $first['status'] === 'healthy';

        return ['online' => $online, 'error' => $online ? null : $first['error']];
    }

    /**
     * @param list<array<string, mixed>> $rows
     *
     * @return list<array<string, mixed>>
     */
    private static function attachServerNames(array $rows): array
    {
        if ($rows === []) {
            return $rows;
        }
        $uuids = array_values(array_unique(array_filter(array_map(static fn (array $r): string => (string) $r['uuid'], $rows))));
        $map = [];
        try {
            $pdo = Database::getPdoConnection();
            $placeholders = implode(',', array_fill(0, count($uuids), '?'));
            $stmt = $pdo->prepare('SELECT id, uuid, uuidShort, name FROM featherpanel_servers WHERE uuid IN (' . $placeholders . ')');
            $stmt->execute($uuids);
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $map[(string) $row['uuid']] = $row;
            }
        } catch (\Throwable) {
        }
        foreach ($rows as &$row) {
            $match = $map[$row['uuid']] ?? null;
            $row['server_id'] = $match !== null ? (int) $match['id'] : null;
            $row['uuid_short'] = $match !== null ? (string) $match['uuidShort'] : null;
            $row['name'] = $match !== null ? (string) $match['name'] : null;
        }
        unset($row);

        return $rows;
    }

    /**
     * @param array<string, mixed> $report
     *
     * @return array<string, mixed>
     */
    private static function compact(array $report): array
    {
        $failing = [];
        foreach ($report['health']['checks'] ?? [] as $check) {
            if (($check['status'] ?? 'ok') !== 'ok') {
                $failing[] = (string) $check['name'];
            }
        }

        return [
            'node_id' => $report['node_id'],
            'kind' => $report['kind'],
            'status' => $report['status'],
            'failing_checks' => $failing,
            'http_status' => $report['health']['http_status'] ?? null,
            'latency_ms' => $report['health']['latency_ms'] ?? null,
            'error' => $report['health']['error'] ?? null,
            'fetched_at' => $report['fetched_at'],
            'cached' => false,
        ];
    }

    private static function client(): Client
    {
        return new Client([
            'timeout' => self::TIMEOUT,
            'connect_timeout' => 3,
            // Same TLS policy as the rest of the panel's daemon traffic (self-signed node certs).
            'verify' => false,
            'http_errors' => false,
            // Never follow redirects: a redirect must not carry a token to another host.
            'allow_redirects' => false,
        ]);
    }

    /**
     * @return array<string, string>
     */
    private static function headers(?string $bearer, string $accept = 'application/json'): array
    {
        $headers = [
            'Accept' => $accept,
            'User-Agent' => 'FeatherPanel/v1.0.0',
            'X-Request-Id' => RequestContext::id(),
        ];
        if ($bearer !== null && $bearer !== '') {
            $headers['Authorization'] = 'Bearer ' . $bearer;
        }

        return $headers;
    }

    private static function readBody(ResponseInterface $response, int $max): string
    {
        $stream = $response->getBody();
        $out = '';
        while (!$stream->eof() && strlen($out) < $max) {
            $chunk = $stream->read(min(65536, $max - strlen($out)));
            if ($chunk === '') {
                break;
            }
            $out .= $chunk;
        }

        return $out;
    }

    private static function shortError(\Throwable $e): string
    {
        $message = $e->getMessage();
        // cURL messages carry the full URL; keep the useful part.
        if (preg_match('/cURL error (\d+): ([^(]+)/', $message, $m)) {
            return 'cURL error ' . $m[1] . ': ' . trim($m[2]);
        }

        return mb_substr($message, 0, 300);
    }

    private static function flag(?float $value): ?bool
    {
        return $value === null ? null : $value >= 1;
    }

    private static function intOrNull(?float $value): ?int
    {
        return $value === null || !is_finite($value) ? null : (int) round($value);
    }

    /**
     * @return array<string, mixed>|null
     */
    private static function cacheGet(string $key): ?array
    {
        $redis = ObservabilityRedis::connection();
        if ($redis === null) {
            return null;
        }
        try {
            $raw = $redis->get($key);
            if (!is_string($raw) || $raw === '') {
                return null;
            }
            $decoded = json_decode($raw, true);

            return is_array($decoded) ? $decoded : null;
        } catch (\Throwable) {
            return null;
        }
    }

    /**
     * @param array<string, mixed> $value
     */
    private static function cacheSet(string $key, array $value): void
    {
        $redis = ObservabilityRedis::connection();
        if ($redis === null) {
            return;
        }
        try {
            $redis->setex($key, self::CACHE_TTL, (string) json_encode($value));
        } catch (\Throwable) {
        }
    }
}
