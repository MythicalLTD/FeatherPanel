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

/**
 * HTTP request counters and latency histograms, shared by every PHP thread/process
 * through Redis (classic mode starts a fresh process per request, worker mode keeps
 * one per thread, so in-memory counters would be wrong in both).
 *
 * One pipelined round trip per request: request counter, one (non-cumulative)
 * latency bucket and the latency sum. Labels are the HTTP method, the matched route
 * template (never the raw path, to keep cardinality bounded) and the status code.
 */
final class HttpMetrics
{
    /** Latency bucket upper bounds in seconds. */
    public const BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0];

    public const KEY_REQUESTS = 'featherpanel:obs:http:requests';
    public const KEY_BUCKETS = 'featherpanel:obs:http:buckets';
    public const KEY_SUMS = 'featherpanel:obs:http:sums';
    public const KEY_STARTED = 'featherpanel:obs:http:started_at';

    /** Safety net against unbounded label growth (e.g. a plugin with dynamic route names). */
    private const MAX_SERIES = 20000;

    private const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

    public static function record(string $method, ?string $route, int $status, float $seconds): void
    {
        if (!ObservabilityConfig::metricsEnabled()) {
            return;
        }
        $redis = ObservabilityRedis::connection();
        if ($redis === null) {
            return;
        }

        $method = self::normalizeMethod($method);
        $route = self::normalizeRoute($route);
        $bucket = self::bucketIndex($seconds);
        $series = $method . "\t" . $route;

        try {
            $redis->multi(\Redis::PIPELINE)
                ->hIncrBy(self::KEY_REQUESTS, $series . "\t" . $status, 1)
                ->hIncrBy(self::KEY_BUCKETS, $series . "\t" . $bucket, 1)
                ->hIncrByFloat(self::KEY_SUMS, $series, round(max(0.0, $seconds), 6))
                ->hSetNx(self::KEY_STARTED, 'ts', (string) time())
                ->exec();
        } catch (\Throwable) {
            // Metrics must never break a request.
        }
    }

    public static function normalizeMethod(string $method): string
    {
        $method = strtoupper($method);

        return in_array($method, self::METHODS, true) ? $method : 'OTHER';
    }

    public static function normalizeRoute(?string $route): string
    {
        if ($route === null || $route === '') {
            return 'unmatched';
        }

        return mb_substr($route, 0, 200);
    }

    public static function bucketIndex(float $seconds): int
    {
        foreach (self::BUCKETS as $i => $bound) {
            if ($seconds <= $bound) {
                return $i;
            }
        }

        return count(self::BUCKETS);
    }

    /**
     * Append every HTTP series to the exposition.
     */
    public static function export(PrometheusText $out, \Redis $redis): void
    {
        $requests = $redis->hGetAll(self::KEY_REQUESTS) ?: [];
        $buckets = $redis->hGetAll(self::KEY_BUCKETS) ?: [];
        $sums = $redis->hGetAll(self::KEY_SUMS) ?: [];

        if (count($requests) > self::MAX_SERIES || count($buckets) > self::MAX_SERIES) {
            // Something produced far too many label combinations: start over instead of
            // serving (and storing) an ever-growing payload.
            $redis->del(self::KEY_REQUESTS, self::KEY_BUCKETS, self::KEY_SUMS, self::KEY_STARTED);
            $requests = $buckets = $sums = [];
        }

        ksort($requests);
        foreach ($requests as $field => $count) {
            $parts = explode("\t", (string) $field);
            if (count($parts) !== 3) {
                continue;
            }
            $out->counter('featherpanel_http_requests_total', 'HTTP requests handled by the panel API, by method, route template and status code.', (int) $count, [
                'method' => $parts[0],
                'route' => $parts[1],
                'status' => $parts[2],
                'status_class' => substr($parts[2], 0, 1) . 'xx',
            ]);
        }

        $series = [];
        foreach ($buckets as $field => $count) {
            $parts = explode("\t", (string) $field);
            if (count($parts) !== 3) {
                continue;
            }
            $series[$parts[0] . "\t" . $parts[1]][(int) $parts[2]] = (int) $count;
        }
        ksort($series);
        foreach ($series as $key => $counts) {
            [$method, $route] = explode("\t", $key, 2);
            $out->histogram(
                'featherpanel_http_request_duration_seconds',
                'Time spent handling panel API requests, by method and route template.',
                self::BUCKETS,
                $counts,
                (float) ($sums[$key] ?? 0.0),
                ['method' => $method, 'route' => $route]
            );
        }

        $started = $redis->hGet(self::KEY_STARTED, 'ts');
        if (is_numeric($started)) {
            $out->gauge('featherpanel_http_metrics_started_timestamp_seconds', 'When the shared HTTP counters were started (counters reset when this changes).', (int) $started);
        }
    }
}
