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

use App\App;
use App\Chat\Database;
use App\Realtime\Mercure;
use App\Runtime\WorkerRestart;
use App\Runtime\RequestContext;
use Symfony\Component\HttpFoundation\JsonResponse;

/**
 * Liveness and readiness probes for orchestrators and load balancers.
 *
 * /api/health/live  answers as long as PHP runs (no database, no Redis).
 * /api/health/ready checks every dependency and answers 503 when the panel cannot
 *                   serve traffic (database, storage or disk failing). Redis and
 *                   Mercure failures degrade the panel but keep it ready.
 *
 * Both are public and unauthenticated, so they only report check names, status and
 * latency; error details stay in the server logs.
 */
final class HealthProbe
{
    /** Readiness fails below this share of free disk and warns below WARN. */
    private const DISK_FAIL_PERCENT = 2.0;
    private const DISK_WARN_PERCENT = 10.0;

    public static function live(): JsonResponse
    {
        return self::respond([
            'status' => 'ok',
            'checks' => ['php' => ['status' => 'ok']],
        ], 200);
    }

    /**
     * @param \Throwable|null $databaseBootError set when the database could not even be connected
     */
    public static function ready(?\Throwable $databaseBootError = null): JsonResponse
    {
        $checks = [
            'database' => $databaseBootError !== null
                ? ['status' => 'fail', 'critical' => true, 'message' => 'unreachable', 'latency_ms' => null]
                : self::run(true, fn () => self::database()),
            'redis' => self::run(false, fn () => self::redis()),
            'mercure' => self::run(false, fn () => self::mercure()),
            'storage' => self::run(true, fn () => self::storage()),
            'disk' => self::run(true, fn () => self::disk()),
        ];

        $status = 'ok';
        foreach ($checks as $check) {
            if ($check['status'] === 'fail' && $check['critical']) {
                $status = 'fail';
                break;
            }
            if ($check['status'] === 'fail' || $check['status'] === 'warn') {
                $status = 'degraded';
            }
        }

        return self::respond(['status' => $status, 'checks' => $checks], $status === 'fail' ? 503 : 200);
    }

    /**
     * @param callable(): array{status: string, message?: string} $fn
     *
     * @return array{status: string, critical: bool, latency_ms: float|null, message?: string}
     */
    private static function run(bool $critical, callable $fn): array
    {
        $start = microtime(true);
        try {
            $result = $fn();
        } catch (\Throwable $e) {
            error_log('[health] readiness check failed: ' . $e->getMessage());
            $result = ['status' => 'fail', 'message' => 'unreachable'];
        }

        return ['status' => $result['status'], 'critical' => $critical, 'latency_ms' => round((microtime(true) - $start) * 1000, 2)]
            + (isset($result['message']) ? ['message' => $result['message']] : []);
    }

    private static function database(): array
    {
        Database::getPdoConnection()->query('SELECT 1')->fetchColumn();

        return ['status' => 'ok'];
    }

    private static function redis(): array
    {
        $redis = ObservabilityRedis::connection();
        if ($redis === null) {
            return ['status' => 'fail', 'message' => 'unreachable'];
        }
        $redis->ping();

        return ['status' => 'ok'];
    }

    private static function mercure(): array
    {
        if (!Mercure::isEnabled()) {
            return ['status' => 'skipped', 'message' => 'disabled'];
        }
        if (function_exists('mercure_publish')) {
            // The hub runs inside FrankenPHP: if PHP answers, the hub is up.
            return ['status' => 'ok'];
        }
        $url = trim((string) App::env('MERCURE_PUBLISH_URL', ''));
        if ($url === '') {
            return ['status' => 'warn', 'message' => 'no hub to publish to'];
        }
        $ch = curl_init($url);
        curl_setopt_array($ch, [CURLOPT_NOBODY => true, CURLOPT_RETURNTRANSFER => true, CURLOPT_CONNECTTIMEOUT => 2, CURLOPT_TIMEOUT => 3]);
        curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);

        // Any HTTP answer (the hub refuses an unauthenticated HEAD) means it is reachable.
        return $code > 0 ? ['status' => 'ok'] : ['status' => 'fail', 'message' => 'unreachable'];
    }

    private static function storage(): array
    {
        $base = defined('APP_STORAGE_DIR') ? rtrim((string) APP_STORAGE_DIR, '/') : dirname(__DIR__, 2) . '/storage';
        foreach (['logs', 'caches'] as $dir) {
            $path = $base . '/' . $dir;
            if (!is_dir($path) || !is_writable($path)) {
                return ['status' => 'fail', 'message' => $dir . ' is not writable'];
            }
        }
        $probe = $base . '/caches/.health-' . RequestContext::id();
        if (@file_put_contents($probe, 'ok') !== 2) {
            return ['status' => 'fail', 'message' => 'caches is not writable'];
        }
        @unlink($probe);

        return ['status' => 'ok'];
    }

    private static function disk(): array
    {
        $base = defined('APP_STORAGE_DIR') ? (string) APP_STORAGE_DIR : dirname(__DIR__, 2) . '/storage';
        $total = @disk_total_space($base);
        $free = @disk_free_space($base);
        if ($total === false || $free === false || $total <= 0) {
            return ['status' => 'warn', 'message' => 'unknown'];
        }
        $freePercent = $free / $total * 100;
        if ($freePercent < self::DISK_FAIL_PERCENT) {
            return ['status' => 'fail', 'message' => 'disk almost full'];
        }
        if ($freePercent < self::DISK_WARN_PERCENT) {
            return ['status' => 'warn', 'message' => 'low disk space'];
        }

        return ['status' => 'ok'];
    }

    /**
     * @param array<string, mixed> $body
     */
    private static function respond(array $body, int $status): JsonResponse
    {
        $body += [
            'version' => defined('APP_VERSION') ? (string) APP_VERSION : null,
            'php_mode' => WorkerRestart::isWorkerMode() ? 'worker' : 'classic',
            'request_id' => RequestContext::id(),
            'checked_at' => gmdate('c'),
        ];
        $response = new JsonResponse($body, $status);
        $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate');
        $response->headers->set('X-Request-ID', RequestContext::id());

        return $response;
    }
}
