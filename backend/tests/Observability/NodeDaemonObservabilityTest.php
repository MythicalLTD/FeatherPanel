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

namespace App\Tests\Observability;

use GuzzleHttp\Psr7\Response;
use PHPUnit\Framework\TestCase;
use App\Chat\NodeMetricsSetting;
use App\Observability\PrometheusParser;
use App\Observability\NodeDaemonObservability;

class NodeDaemonObservabilityTest extends TestCase
{
    private const WINGS_SCRAPE = <<<'TXT'
        # HELP go_goroutines Number of goroutines that currently exist.
        # TYPE go_goroutines gauge
        go_goroutines 87
        # TYPE process_start_time_seconds gauge
        process_start_time_seconds 1.7e+09
        # TYPE featherwings_servers gauge
        featherwings_servers{state="offline"} 1
        featherwings_servers{state="running"} 2
        featherwings_servers{state="starting"} 0
        featherwings_servers{state="stopping"} 0
        # TYPE featherwings_server_state gauge
        featherwings_server_state{server="aaaa",state="running"} 1
        featherwings_server_state{server="aaaa",state="offline"} 0
        featherwings_server_state{server="bbbb",state="running"} 1
        featherwings_server_state{server="cccc",state="offline"} 1
        # TYPE featherwings_server_cpu_absolute_percent gauge
        featherwings_server_cpu_absolute_percent{server="aaaa"} 12.5
        featherwings_server_cpu_absolute_percent{server="bbbb"} 40
        featherwings_server_cpu_absolute_percent{server="cccc"} 0
        # TYPE featherwings_server_memory_bytes gauge
        featherwings_server_memory_bytes{server="aaaa"} 1.073741824e+09
        featherwings_server_memory_bytes{server="bbbb"} 536870912
        # TYPE featherwings_backups_in_progress gauge
        featherwings_backups_in_progress 1
        # TYPE featherwings_backups_total counter
        featherwings_backups_total{result="failure"} 2
        featherwings_backups_total{result="success"} 57
        # TYPE featherwings_transfers_in_progress gauge
        featherwings_transfers_in_progress{direction="incoming"} 0
        featherwings_transfers_in_progress{direction="outgoing"} 1
        # TYPE featherwings_sftp_sessions gauge
        featherwings_sftp_sessions 3
        featherwings_sftp_listening 1
        featherwings_websocket_connections 4
        featherwings_docker_up 1
        featherwings_http_requests_total{method="GET",route="/api/servers/:server",status="200"} 10
        featherwings_http_requests_total{method="GET",route="/api/servers/:server",status="500"} 2
        TXT;

    public function testParserReadsLabelsEscapesAndSpecialValues(): void
    {
        $p = PrometheusParser::parse(implode("\n", [
            '# HELP x A help line with "quotes"',
            'x{a="1",b="we\\"ird\\\\path\\nnext"} 3 1700000000000',
            'x{a="2",} 4.5',
            'y +Inf',
            'z NaN',
            'broken{a="1" 3',
            'w{a="1"} 7 # {trace_id="abc"} 1',
        ]));

        $this->assertSame(5, $p->count(), 'broken line skipped');
        $this->assertSame(3.0, $p->value('x', ['a' => '1']));
        $this->assertSame("we\"ird\\path\nnext", $p->samples('x', ['a' => '1'])[0]['labels']['b']);
        $this->assertSame(4.5, $p->value('x', ['a' => '2']));
        $this->assertSame(7.5, $p->sum('x'));
        $this->assertNull($p->value('y'), 'non-finite values read as missing');
        $this->assertNull($p->value('z'));
        $this->assertFalse($p->has('broken'));
        $this->assertSame(7.0, $p->value('w'));
        $this->assertTrue($p->hasPrefix('w'));
        $this->assertNull($p->value('missing'));
    }

    public function testWingsSummary(): void
    {
        $summary = NodeDaemonObservability::summarizeWings(PrometheusParser::parse(self::WINGS_SCRAPE));

        $this->assertSame(3, $summary['servers']['total']);
        $this->assertSame(2, $summary['servers']['by_state']['running']);
        $this->assertSame(52.5, $summary['resources']['cpu_percent']);
        $this->assertSame(1610612736, $summary['resources']['memory_bytes']);
        $this->assertSame('bbbb', $summary['top_servers'][0]['uuid'], 'busiest server first');
        $this->assertSame('offline', $summary['top_servers'][2]['state']);
        $this->assertSame(['in_progress' => 1, 'succeeded_total' => 57, 'failed_total' => 2], $summary['backups']);
        $this->assertSame(1, $summary['transfers']['outgoing']);
        $this->assertSame(3, $summary['sftp']['sessions']);
        $this->assertTrue($summary['sftp']['listening']);
        $this->assertSame(4, $summary['websockets']);
        $this->assertTrue($summary['docker_up']);
        $this->assertSame(12, $summary['http']['requests_total']);
        $this->assertSame(2, $summary['http']['errors_5xx_total']);
        $this->assertSame(87, $summary['daemon']['goroutines']);
    }

    public function testQuilldSummary(): void
    {
        $summary = NodeDaemonObservability::summarizeQuilld(PrometheusParser::parse(<<<'TXT'
            featherquilld_build_info{version="1.0.4",node="n1"} 1
            featherquilld_uptime_seconds 5000
            featherquilld_panel_reachable 1
            featherquilld_webspaces 2
            featherquilld_webspaces_by_state{state="running"} 1
            featherquilld_webspaces_by_state{state="stopped"} 1
            featherquilld_webspace_info{webspace="w1",name="shop",runtime="php",state="running",status="installed"} 1
            featherquilld_proxy_enabled{provider="caddy"} 1
            featherquilld_proxy_running{provider="caddy"} 0
            featherquilld_proxy_last_reload_success{provider="caddy"} 0
            featherquilld_proxy_reloads_total{provider="caddy",action="reload",result="success"} 4
            featherquilld_proxy_reloads_total{provider="caddy",action="start",result="success"} 1
            featherquilld_proxy_reloads_total{provider="caddy",action="reload",result="failure"} 2
            featherquilld_waf_events_total{webspace="w1",category="sqli",action="blocked"} 10
            featherquilld_waf_events_total{webspace="w1",category="xss",action="detected"} 3
            featherquilld_sftp_auth_failures_total 5
            featherquilld_host_cpu_percent 12.345
            featherquilld_host_memory_total_bytes 1000
            featherquilld_host_memory_used_bytes 400
            featherquilld_host_load{window="1m"} 0.5
            featherquilld_data_disk_total_bytes{path="/var/lib/featherquilld"} 2000
            featherquilld_data_disk_free_bytes{path="/var/lib/featherquilld"} 500
            TXT));

        $this->assertSame('1.0.4', $summary['version']);
        $this->assertTrue($summary['panel_reachable']);
        $this->assertSame(2, $summary['webspaces']['total']);
        $this->assertSame(['running' => 1, 'stopped' => 1], $summary['webspaces']['by_state']);
        $proxy = $summary['proxies'][0];
        $this->assertSame('caddy', $proxy['provider']);
        $this->assertFalse($proxy['running']);
        $this->assertFalse($proxy['last_reload_success']);
        $this->assertSame(5, $proxy['reloads_succeeded_total']);
        $this->assertSame(2, $proxy['reloads_failed_total']);
        $this->assertSame(13, $summary['firewall']['events_total']);
        $this->assertSame(10, $summary['firewall']['blocked_total']);
        $this->assertSame('shop', $summary['firewall']['top_webspaces'][0]['name']);
        $this->assertSame(5, $summary['sftp']['auth_failures_total']);
        $this->assertSame(12.35, $summary['host']['cpu_percent']);
        $this->assertSame(1500, $summary['host']['disk_used']);
    }

    public function testWingsHealthStatusMapping(): void
    {
        $body = (string) json_encode([
            'status' => 'degraded',
            'checks' => [
                'docker' => ['status' => 'ok', 'critical' => true, 'message' => 'docker daemon is reachable', 'duration_ms' => 2],
                'panel' => ['status' => 'fail', 'critical' => false, 'message' => 'panel is not reachable'],
            ],
        ]);
        $health = NodeDaemonObservability::interpretHealth('wings', ['state' => 'fulfilled', 'value' => new Response(200, [], $body)], microtime(true));

        $this->assertSame('degraded', $health['overall']);
        $this->assertTrue($health['supported']);
        $this->assertTrue($health['detailed']);
        $this->assertSame(['panel'], $health['failing']);
        $this->assertSame('docker', $health['checks'][0]['name']);

        $unavailable = (string) json_encode(['status' => 'unavailable', 'checks' => ['docker' => ['status' => 'fail', 'critical' => true]]]);
        $health = NodeDaemonObservability::interpretHealth('wings', ['state' => 'fulfilled', 'value' => new Response(503, [], $unavailable)], microtime(true));
        $this->assertSame('unhealthy', $health['overall']);
        $this->assertFalse($health['detailed'], 'anonymous answers carry no messages');
    }

    public function testQuilldHealthStatusMapping(): void
    {
        $body = (string) json_encode([
            'status' => 'healthy',
            'checks' => ['reverse_proxy' => ['status' => 'healthy', 'description' => 'caddy is running.', 'duration_ms' => 0.4, 'data' => ['provider' => 'caddy', 'nested' => ['x']], 'error' => null]],
            'version' => '1.0.4',
        ]);
        $health = NodeDaemonObservability::interpretHealth('web', ['state' => 'fulfilled', 'value' => new Response(200, [], $body)], microtime(true));

        $this->assertSame('healthy', $health['overall']);
        $this->assertSame('1.0.4', $health['version']);
        $this->assertSame('caddy is running.', $health['checks'][0]['message']);
        $this->assertSame(['provider' => 'caddy'], $health['checks'][0]['data'], 'only scalar data is kept');
    }

    public function testOldDaemonAndUnreachable(): void
    {
        $old = NodeDaemonObservability::interpretHealth('wings', ['state' => 'fulfilled', 'value' => new Response(404, [], '404 page not found')], microtime(true));
        $this->assertSame('unsupported', $old['overall']);
        $this->assertTrue($old['reachable']);

        $proxy = NodeDaemonObservability::interpretHealth('wings', ['state' => 'fulfilled', 'value' => new Response(502, [], '<html>Bad Gateway</html>')], microtime(true));
        $this->assertSame('unreachable', $proxy['overall']);

        $down = NodeDaemonObservability::interpretHealth('web', ['state' => 'rejected', 'reason' => new \RuntimeException('cURL error 7: Failed to connect to 10.0.0.9 port 8989 (see https://curl.haxx.se)')], microtime(true));
        $this->assertSame('unreachable', $down['overall']);
        $this->assertSame('cURL error 7: Failed to connect to 10.0.0.9 port 8989', $down['error']);
    }

    public function testMetricsStates(): void
    {
        $ok = static fn (int $code, string $body = '') => ['state' => 'fulfilled', 'value' => new Response($code, [], $body)];

        $this->assertSame('unauthorized', NodeDaemonObservability::interpretMetrics('wings', $ok(401), 'none', false)['state']);
        $this->assertSame('forbidden', NodeDaemonObservability::interpretMetrics('wings', $ok(403), 'metrics_token', false)['state']);
        $this->assertSame('not_enabled', NodeDaemonObservability::interpretMetrics('wings', $ok(404), 'none', false)['state']);
        $this->assertSame('error', NodeDaemonObservability::interpretMetrics('wings', $ok(500), 'none', false)['state']);
        $this->assertSame('unsupported', NodeDaemonObservability::interpretMetrics('wings', $ok(200, "go_goroutines 3\n"), 'none', false)['state']);
        $good = NodeDaemonObservability::interpretMetrics('wings', $ok(200, self::WINGS_SCRAPE), 'metrics_token', false);
        $this->assertSame('ok', $good['state']);
        $this->assertInstanceOf(PrometheusParser::class, $good['parser']);
    }

    public function testCredentials(): void
    {
        $wings = ['fqdn' => 'node1.example.com', 'daemon_token_id' => 'abc', 'daemon_token' => 'secret'];
        $this->assertSame('secret', NodeDaemonObservability::nodeBearer('wings', $wings));
        $this->assertSame('abc.secret', NodeDaemonObservability::nodeBearer('web', $wings));
        $this->assertNull(NodeDaemonObservability::nodeBearer('web', ['daemon_token' => 'secret']));

        // Wings never gets its node token on /metrics.
        $this->assertSame(['token' => null, 'source' => 'none'], NodeDaemonObservability::metricsBearer('wings', $wings, ['metrics_url' => null, 'metrics_token' => null]));
        $this->assertSame(['token' => 'scrape', 'source' => 'metrics_token'], NodeDaemonObservability::metricsBearer('wings', $wings, ['metrics_url' => null, 'metrics_token' => 'scrape']));
        // Quilld falls back to the node token, but only on the node's own host.
        $this->assertSame('node_token', NodeDaemonObservability::metricsBearer('web', $wings, ['metrics_url' => null, 'metrics_token' => null])['source']);
        $this->assertSame('node_token', NodeDaemonObservability::metricsBearer('web', $wings, ['metrics_url' => 'http://NODE1.example.com:9464/metrics', 'metrics_token' => null])['source']);
        $this->assertSame('none', NodeDaemonObservability::metricsBearer('web', $wings, ['metrics_url' => 'http://prometheus.example.com/metrics', 'metrics_token' => null])['source']);
    }

    public function testMetricsUrlValidation(): void
    {
        $this->assertNull(NodeMetricsSetting::validateUrl('http://10.0.0.5:9101/metrics'));
        $this->assertNull(NodeMetricsSetting::validateUrl('https://node1.example.com/metrics'));
        $this->assertNotNull(NodeMetricsSetting::validateUrl('ftp://10.0.0.5/metrics'));
        $this->assertNotNull(NodeMetricsSetting::validateUrl('10.0.0.5:9101/metrics'));
        $this->assertNotNull(NodeMetricsSetting::validateUrl('http://user:pass@10.0.0.5/metrics'));
        $this->assertNotNull(NodeMetricsSetting::validateUrl('http://10.0.0.5/metrics#x'));
    }
}
