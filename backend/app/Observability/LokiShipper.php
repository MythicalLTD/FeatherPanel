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

use GuzzleHttp\Client;

/**
 * Direct push of structured logs to Grafana Loki, without a log agent.
 *
 * Requests never talk to Loki. Log lines are buffered in memory while a request runs
 * and appended to a capped Redis list once the response is sent (one pipelined round
 * trip); without Redis they go to a capped spool file. The LokiLogShipper timed task
 * drains the queue every minute and pushes batches to /loki/api/v1/push. A failed push
 * puts the batch back and is retried on the next run; when Loki stays down the oldest
 * lines are dropped once the queue holds MAX_QUEUE lines, so memory use stays bounded.
 */
final class LokiShipper
{
    public const QUEUE_KEY = 'featherpanel:obs:loki:queue';
    public const STATS_KEY = 'featherpanel:obs:loki:stats';
    public const MAX_QUEUE = 20000;
    public const BATCH_SIZE = 1000;
    private const SPOOL_FILE = 'loki-spool.ndjson';
    private const MAX_SPOOL_BYTES = 20971520;
    private const MAX_BUFFER = 500;

    /** @var list<string> encoded queue items waiting for flush() */
    private static array $buffer = [];

    private static bool $shutdownRegistered = false;

    /**
     * Queue one line (called by StructuredLog).
     */
    public static function enqueue(string $level, string $timestampNs, string $line): void
    {
        self::$buffer[] = (string) json_encode([$timestampNs, $level, $line], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
        if (!self::$shutdownRegistered) {
            self::$shutdownRegistered = true;
            register_shutdown_function([self::class, 'flush']);
        }
        if (count(self::$buffer) >= self::MAX_BUFFER) {
            self::flush();
        }
    }

    /**
     * Move buffered lines to the shared queue. Cheap no-op when nothing was logged.
     */
    public static function flush(): void
    {
        if (self::$buffer === []) {
            return;
        }
        $items = self::$buffer;
        self::$buffer = [];

        try {
            $redis = ObservabilityRedis::connection();
            if ($redis !== null) {
                $pipe = $redis->multi(\Redis::PIPELINE);
                $pipe->rPush(self::QUEUE_KEY, ...$items);
                $pipe->lTrim(self::QUEUE_KEY, -self::MAX_QUEUE, -1);
                $result = $pipe->exec();
                $length = is_array($result) ? (int) ($result[0] ?? 0) : 0;
                if ($length > self::MAX_QUEUE) {
                    $redis->hIncrBy(self::STATS_KEY, 'dropped_total', min(count($items), $length - self::MAX_QUEUE));
                }

                return;
            }
        } catch (\Throwable) {
        }

        self::spool($items);
    }

    /**
     * Push queued lines to Loki (called by the timed task).
     *
     * @return array{pushed: int, failed: bool, error: string|null, skipped: bool}
     */
    public static function drain(int $maxBatches = 30): array
    {
        $config = ObservabilityConfig::get();
        $redis = ObservabilityRedis::connection();
        if (!$config['loki_enabled']) {
            // Disabled: forget whatever was queued so it does not pile up.
            try {
                $redis?->del(self::QUEUE_KEY);
            } catch (\Throwable) {
            }
            @unlink(self::spoolPath());

            return ['pushed' => 0, 'failed' => false, 'error' => null, 'skipped' => true];
        }

        $pushed = 0;
        $spooled = self::takeSpool();
        if ($spooled !== []) {
            $result = self::pushItems($spooled, $config);
            if (!$result['ok']) {
                self::spool($spooled);

                return ['pushed' => 0, 'failed' => true, 'error' => $result['error'], 'skipped' => false];
            }
            $pushed += count($spooled);
        }

        if ($redis === null) {
            return ['pushed' => $pushed, 'failed' => false, 'error' => null, 'skipped' => false];
        }

        for ($i = 0; $i < $maxBatches; ++$i) {
            $tx = $redis->multi(\Redis::MULTI);
            $tx->lRange(self::QUEUE_KEY, 0, self::BATCH_SIZE - 1);
            $tx->lTrim(self::QUEUE_KEY, self::BATCH_SIZE, -1);
            $res = $tx->exec();
            $items = is_array($res) && is_array($res[0] ?? null) ? $res[0] : [];
            if ($items === []) {
                break;
            }
            $result = self::pushItems($items, $config);
            if (!$result['ok']) {
                // Put the batch back at the head (original order) and retry on the next run.
                $redis->lPush(self::QUEUE_KEY, ...array_reverse($items));
                $redis->lTrim(self::QUEUE_KEY, -self::MAX_QUEUE, -1);

                return ['pushed' => $pushed, 'failed' => true, 'error' => $result['error'], 'skipped' => false];
            }
            $pushed += count($items);
            if (count($items) < self::BATCH_SIZE) {
                break;
            }
        }

        return ['pushed' => $pushed, 'failed' => false, 'error' => null, 'skipped' => false];
    }

    /**
     * Send one test line right away (admin "Send test log" button).
     *
     * @param array<string, mixed>|null $config
     *
     * @return array{ok: bool, status: int|null, error: string|null, took_ms: int}
     */
    public static function test(?array $config = null): array
    {
        $config ??= ObservabilityConfig::get();
        $entry = StructuredLog::entry('info', 'FeatherPanel Loki connection test', ['type' => 'test'], 'observability');
        $item = (string) json_encode([(string) $entry['_ts_ns'], 'info', StructuredLog::encode($entry)]);

        return self::pushItems([$item], $config, false);
    }

    /**
     * @return array{queue_length: int, pushed_total: int, failures_total: int, dropped_total: int, last_success_at: int, last_error: string|null, last_error_at: int, backend: string}
     */
    public static function stats(): array
    {
        $stats = ['queue_length' => 0, 'pushed_total' => 0, 'failures_total' => 0, 'dropped_total' => 0, 'last_success_at' => 0, 'last_error' => null, 'last_error_at' => 0, 'backend' => 'file'];
        try {
            $redis = ObservabilityRedis::connection();
            if ($redis !== null) {
                $stats['backend'] = 'redis';
                $stats['queue_length'] = (int) $redis->lLen(self::QUEUE_KEY);
                $raw = $redis->hGetAll(self::STATS_KEY) ?: [];
                foreach (['pushed_total', 'failures_total', 'dropped_total', 'last_success_at', 'last_error_at'] as $key) {
                    $stats[$key] = (int) ($raw[$key] ?? 0);
                }
                $stats['last_error'] = isset($raw['last_error']) && $raw['last_error'] !== '' ? (string) $raw['last_error'] : null;
            }
        } catch (\Throwable) {
        }

        return $stats;
    }

    /**
     * The push endpoint for a configured URL: a base URL (http://loki:3100) gets
     * /loki/api/v1/push appended, a full push URL is kept as-is.
     */
    public static function pushUrl(string $url): string
    {
        $url = rtrim(trim($url), '/');
        if ($url === '' || str_ends_with($url, '/loki/api/v1/push') || str_ends_with($url, '/api/prom/push')) {
            return $url;
        }

        return $url . '/loki/api/v1/push';
    }

    /**
     * Build the Loki push payload from queue items (exposed for tests).
     *
     * @param list<string> $items json [timestamp_ns, level, line]
     * @param array<string, string> $extraLabels
     *
     * @return array{streams: list<array{stream: array<string, string>, values: list<array{0: string, 1: string}>}>}
     */
    public static function buildPayload(array $items, array $extraLabels, string $instance): array
    {
        $byLevel = [];
        foreach ($items as $item) {
            $decoded = json_decode((string) $item, true);
            if (!is_array($decoded) || count($decoded) !== 3) {
                continue;
            }
            [$ts, $level, $line] = $decoded;
            $ts = preg_match('/^\d{1,20}$/', (string) $ts) === 1 ? (string) $ts : sprintf('%d000000000', time());
            $byLevel[StructuredLog::normalizeLevel((string) $level)][] = [$ts, (string) $line];
        }

        $streams = [];
        foreach ($byLevel as $level => $values) {
            usort($values, static fn (array $a, array $b): int => strcmp(str_pad($a[0], 20, '0', STR_PAD_LEFT), str_pad($b[0], 20, '0', STR_PAD_LEFT)));
            $streams[] = [
                'stream' => ['app' => 'featherpanel', 'job' => 'featherpanel', 'instance' => $instance, 'level' => $level] + $extraLabels,
                'values' => $values,
            ];
        }

        return ['streams' => $streams];
    }

    /**
     * @param list<string> $items
     * @param array<string, mixed> $config
     *
     * @return array{ok: bool, status: int|null, error: string|null, took_ms: int}
     */
    private static function pushItems(array $items, array $config, bool $recordStats = true): array
    {
        $start = microtime(true);
        $url = self::pushUrl((string) $config['loki_url']);
        if ($url === '' || preg_match('#^https?://#i', $url) !== 1) {
            return ['ok' => false, 'status' => null, 'error' => 'Loki URL is not set or is not an http(s) URL', 'took_ms' => 0];
        }

        $payload = self::buildPayload($items, (array) $config['loki_labels'], (string) (getenv('FEATHERPANEL_INSTANCE') ?: gethostname() ?: 'featherpanel'));
        if ($payload['streams'] === []) {
            return ['ok' => true, 'status' => null, 'error' => null, 'took_ms' => 0];
        }

        $headers = ['Content-Type' => 'application/json', 'User-Agent' => 'FeatherPanel/' . (defined('APP_VERSION') ? APP_VERSION : 'dev')];
        if ((string) $config['loki_tenant'] !== '') {
            $headers['X-Scope-OrgID'] = (string) $config['loki_tenant'];
        }
        $options = [
            'headers' => $headers,
            'body' => (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE),
            'timeout' => 5,
            'connect_timeout' => 3,
            'http_errors' => false,
            'allow_redirects' => false,
        ];
        if ((string) $config['loki_username'] !== '' || (string) $config['loki_password'] !== '') {
            $options['auth'] = [(string) $config['loki_username'], (string) $config['loki_password']];
        }

        $status = null;
        $error = null;
        try {
            $response = (new Client())->post($url, $options);
            $status = $response->getStatusCode();
            if ($status < 200 || $status >= 300) {
                $error = 'Loki answered HTTP ' . $status . ': ' . mb_substr(trim((string) $response->getBody()), 0, 200);
            }
        } catch (\Throwable $e) {
            $error = mb_substr($e->getMessage(), 0, 300);
        }

        $ok = $error === null;
        if ($recordStats) {
            self::recordResult($ok, count($items), $error);
        }

        return ['ok' => $ok, 'status' => $status, 'error' => $error, 'took_ms' => (int) round((microtime(true) - $start) * 1000)];
    }

    private static function recordResult(bool $ok, int $lines, ?string $error): void
    {
        try {
            $redis = ObservabilityRedis::connection();
            if ($redis === null) {
                return;
            }
            if ($ok) {
                $redis->hIncrBy(self::STATS_KEY, 'pushed_total', $lines);
                $redis->hSet(self::STATS_KEY, 'last_success_at', (string) time());
            } else {
                $redis->hIncrBy(self::STATS_KEY, 'failures_total', 1);
                $redis->hMSet(self::STATS_KEY, ['last_error' => (string) $error, 'last_error_at' => (string) time()]);
            }
        } catch (\Throwable) {
        }
    }

    private static function spoolPath(): string
    {
        $dir = defined('APP_LOGS_DIR') ? (string) APP_LOGS_DIR : dirname(__DIR__, 2) . '/storage/logs';

        return rtrim($dir, '/') . '/' . self::SPOOL_FILE;
    }

    /** @param list<string> $items */
    private static function spool(array $items): void
    {
        $path = self::spoolPath();
        clearstatcache(true, $path);
        $size = @filesize($path);
        if ($size !== false && $size > self::MAX_SPOOL_BYTES) {
            return;
        }
        @file_put_contents($path, implode("\n", $items) . "\n", FILE_APPEND | LOCK_EX);
    }

    /** @return list<string> */
    private static function takeSpool(): array
    {
        $path = self::spoolPath();
        if (!is_file($path)) {
            return [];
        }
        $processing = $path . '.processing';
        if (!@rename($path, $processing)) {
            return [];
        }
        $lines = @file($processing, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES) ?: [];
        @unlink($processing);

        return array_values(array_slice($lines, -self::MAX_QUEUE));
    }
}
