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

use App\Runtime\RequestContext;
use PHPUnit\Framework\TestCase;
use App\Observability\HttpMetrics;
use App\Observability\LokiShipper;
use App\Observability\MetricsAuth;
use App\Observability\StructuredLog;
use App\Observability\PrometheusText;
use App\Observability\MetricsCollector;
use App\Observability\ObservabilityConfig;
use Symfony\Component\HttpFoundation\Request;

class ObservabilityTest extends TestCase
{
    public function testPrometheusTextRendersFamiliesOnceWithEscapedLabels(): void
    {
        $out = new PrometheusText();
        $out->gauge('fp_test', 'A "test" gauge.', 1, ['name' => "we\"ird\\label\n"]);
        $out->gauge('fp_test', 'A "test" gauge.', 2.5, ['name' => 'b']);
        $out->counter('fp_hits_total', 'Hits.', 3);
        $text = $out->render();

        $this->assertSame(1, substr_count($text, '# TYPE fp_test gauge'));
        $this->assertStringContainsString('fp_test{name="we\\"ird\\\\label\\n"} 1', $text);
        $this->assertStringContainsString('fp_test{name="b"} 2.5', $text);
        $this->assertStringContainsString("# TYPE fp_hits_total counter\nfp_hits_total 3\n", $text);
    }

    public function testHistogramIsCumulative(): void
    {
        $out = new PrometheusText();
        $out->histogram('fp_latency_seconds', 'Latency.', [0.1, 1.0], [0 => 2, 1 => 3, 2 => 1], 4.2, ['route' => '/x']);
        $text = $out->render();

        $this->assertStringContainsString('fp_latency_seconds_bucket{route="/x",le="0.1"} 2', $text);
        $this->assertStringContainsString('fp_latency_seconds_bucket{route="/x",le="1"} 5', $text);
        $this->assertStringContainsString('fp_latency_seconds_bucket{route="/x",le="+Inf"} 6', $text);
        $this->assertStringContainsString('fp_latency_seconds_count{route="/x"} 6', $text);
        $this->assertStringContainsString('fp_latency_seconds_sum{route="/x"} 4.2', $text);
    }

    public function testValueFormatting(): void
    {
        $this->assertSame('3', PrometheusText::value(3));
        $this->assertSame('3', PrometheusText::value(3.0));
        $this->assertSame('0.000453', PrometheusText::value(0.000453));
        $this->assertSame('NaN', PrometheusText::value(NAN));
        $this->assertSame('+Inf', PrometheusText::value(INF));
    }

    public function testHttpMetricsLabelsStayBounded(): void
    {
        $this->assertSame('GET', HttpMetrics::normalizeMethod('get'));
        $this->assertSame('OTHER', HttpMetrics::normalizeMethod('PROPFIND'));
        $this->assertSame('unmatched', HttpMetrics::normalizeRoute(null));
        $this->assertSame('/api/user/servers/{uuidShort}', HttpMetrics::normalizeRoute('/api/user/servers/{uuidShort}'));
        $this->assertSame(0, HttpMetrics::bucketIndex(0.001));
        $this->assertSame(4, HttpMetrics::bucketIndex(0.1));
        $this->assertSame(count(HttpMetrics::BUCKETS), HttpMetrics::bucketIndex(60.0));
    }

    public function testMetricsTokenIsHashedAndComparedSafely(): void
    {
        $token = MetricsAuth::generateToken();
        $this->assertStringStartsWith(MetricsAuth::TOKEN_PREFIX, $token);
        $this->assertSame(52, strlen($token));
        $hash = MetricsAuth::hashToken($token);
        $this->assertNotSame($token, $hash);
        $this->assertTrue(MetricsAuth::tokenMatches($token, $hash));
        $this->assertFalse(MetricsAuth::tokenMatches($token . 'x', $hash));
        $this->assertFalse(MetricsAuth::tokenMatches($token, ''));
    }

    public function testBearerTokenParsing(): void
    {
        $request = Request::create('/api/system/metrics', 'GET', [], [], [], ['HTTP_AUTHORIZATION' => 'Bearer fpm_abc']);
        $this->assertSame('fpm_abc', MetricsAuth::bearerToken($request));
        $this->assertNull(MetricsAuth::bearerToken(Request::create('/api/system/metrics')));
        $basic = Request::create('/api/system/metrics', 'GET', [], [], [], ['HTTP_AUTHORIZATION' => 'Basic Zm9vOmJhcg==']);
        $this->assertNull(MetricsAuth::bearerToken($basic));
    }

    public function testIncomingRequestIdIsValidated(): void
    {
        $this->assertSame('trace-abc-12345678', RequestContext::sanitizeIncomingId('trace-abc-12345678'));
        $this->assertSame('0af7651916cd43dd8448eb211c80319c', RequestContext::sanitizeIncomingId(' 0af7651916cd43dd8448eb211c80319c '));
        $this->assertNull(RequestContext::sanitizeIncomingId('short'));
        $this->assertNull(RequestContext::sanitizeIncomingId('bad id<script>alert(1)</script>'));
        $this->assertNull(RequestContext::sanitizeIncomingId(str_repeat('a', 200)));
        $this->assertNull(RequestContext::sanitizeIncomingId(null));

        RequestContext::begin(null, 'gateway-request-0001');
        $this->assertSame('gateway-request-0001', RequestContext::id());
        RequestContext::begin(null, "evil\r\nX-Injected: 1");
        $this->assertMatchesRegularExpression('/^[a-f0-9]{32}$/', RequestContext::id());
    }

    public function testConfigNormalizationDefaultsToSafeValues(): void
    {
        $config = ObservabilityConfig::normalize([], false);
        $this->assertFalse($config['metrics_enabled']);
        $this->assertSame('token', $config['metrics_auth_mode']);
        $this->assertTrue($config['metrics_node_probes']);
        $this->assertSame('file', $config['log_json_target']);
        $this->assertSame('info', $config['log_min_level']);
        $this->assertFalse($config['loki_enabled']);

        $config = ObservabilityConfig::normalize([
            ObservabilityConfig::METRICS_AUTH_MODE => 'nonsense',
            ObservabilityConfig::LOKI_ENABLED => 'true',
            ObservabilityConfig::LOKI_URL => '',
        ], true);
        $this->assertSame('token', $config['metrics_auth_mode']);
        $this->assertFalse($config['loki_enabled'], 'Loki push needs a URL');
    }

    public function testLokiLabelsParsingAndValidation(): void
    {
        $this->assertSame(['env' => 'prod', 'region' => 'eu'], ObservabilityConfig::parseLabels("env=prod\nregion=\"eu\"\nbad-name=x\nlevel=debug"));
        $this->assertNull(ObservabilityConfig::validateLabels("env=prod\nregion=eu"));
        $this->assertNotNull(ObservabilityConfig::validateLabels('1abc=x'));
        $this->assertNotNull(ObservabilityConfig::validateLabels('level=x'));
        $this->assertNotNull(ObservabilityConfig::validateLabels('novalue'));
    }

    public function testLokiPushUrlAndPayload(): void
    {
        $this->assertSame('http://loki:3100/loki/api/v1/push', LokiShipper::pushUrl('http://loki:3100/'));
        $this->assertSame('https://logs.example.com/loki/api/v1/push', LokiShipper::pushUrl('https://logs.example.com/loki/api/v1/push'));

        $items = [
            json_encode(['1700000000000000002', 'error', '{"m":"b"}']),
            json_encode(['1700000000000000001', 'error', '{"m":"a"}']),
            json_encode(['1700000000000000003', 'warn', '{"m":"c"}']),
            'not json',
        ];
        $payload = LokiShipper::buildPayload($items, ['env' => 'prod'], 'panel-1');
        $this->assertCount(2, $payload['streams']);
        $error = $payload['streams'][0];
        $this->assertSame(['app' => 'featherpanel', 'job' => 'featherpanel', 'instance' => 'panel-1', 'level' => 'error', 'env' => 'prod'], $error['stream']);
        $this->assertSame([['1700000000000000001', '{"m":"a"}'], ['1700000000000000002', '{"m":"b"}']], $error['values']);
        $this->assertSame('warning', $payload['streams'][1]['stream']['level']);
    }

    public function testStructuredLogEntryShape(): void
    {
        RequestContext::begin(null, 'entry-shape-test-01');
        RequestContext::setRoute('/api/admin/observability');
        RequestContext::setUserUuid('00000000-0000-0000-0000-000000000001');
        $entry = StructuredLog::entry('warning', 'hello', ['k' => 'v'], 'test');
        $line = StructuredLog::encode($entry);
        $decoded = json_decode($line, true);

        $this->assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/', $decoded['timestamp']);
        $this->assertSame('warning', $decoded['level']);
        $this->assertSame('hello', $decoded['message']);
        $this->assertSame('entry-shape-test-01', $decoded['request_id']);
        $this->assertSame('/api/admin/observability', $decoded['route']);
        $this->assertSame('00000000-0000-0000-0000-000000000001', $decoded['user_id']);
        $this->assertSame(['k' => 'v'], $decoded['context']);
        $this->assertArrayNotHasKey('_ts_ns', $decoded);
        $this->assertMatchesRegularExpression('/^\d{19}$/', $entry['_ts_ns']);
        $this->assertStringNotContainsString("\n", $line);
        $this->assertSame('warning', StructuredLog::normalizeLevel('WARN'));
        $this->assertSame('critical', StructuredLog::normalizeLevel('fatal'));
        $this->assertSame('info', StructuredLog::normalizeLevel('whatever'));
    }

    public function testMemoryLimitParsing(): void
    {
        $this->assertSame(536870912, MetricsCollector::bytes('512M'));
        $this->assertSame(1073741824, MetricsCollector::bytes('1G'));
        $this->assertSame(-1, MetricsCollector::bytes('-1'));
    }
}
