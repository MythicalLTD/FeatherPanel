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

use App\Helpers\LogRedactor;
use App\Runtime\RequestContext;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Structured (one JSON object per line) logging for Promtail / Grafana Alloy / Loki.
 *
 * Runs next to the classic .fplog files (which the panel log viewer reads), never instead
 * of them. Every entry carries the request id, user, route and method of the current
 * request. Output goes to storage/logs/featherpanel.json.log, to stderr (container logs)
 * or both, and is queued for the direct Loki push when that is enabled.
 *
 * Nothing here may throw or call the panel logger: a broken log pipeline must never
 * break a request.
 */
final class StructuredLog
{
    public const FILE_NAME = 'featherpanel.json.log';

    /** The JSON file is rotated to .1 once it grows past this size. */
    private const MAX_FILE_BYTES = 52428800;

    private static bool $writing = false;

    private static int $writesSinceSizeCheck = 0;

    /** @var resource|null */
    private static $stderr;

    /**
     * Log one application event.
     *
     * @param array<string, mixed> $context
     */
    public static function log(string $level, string $message, array $context = [], ?string $logger = null): void
    {
        if (self::$writing) {
            return;
        }
        self::$writing = true;
        try {
            $config = ObservabilityConfig::get();
            if (!$config['log_json_enabled'] && !$config['loki_enabled']) {
                return;
            }
            $level = self::normalizeLevel($level);
            if (ObservabilityConfig::LEVELS[$level] < ObservabilityConfig::LEVELS[$config['log_min_level']]) {
                return;
            }

            $entry = self::entry($level, LogRedactor::redactText($message), $context === [] ? [] : LogRedactor::redact($context), $logger ?? 'app');
            self::emit($entry, $config);
        } catch (\Throwable) {
        } finally {
            self::$writing = false;
        }
    }

    /**
     * One access log line per HTTP request (when enabled).
     */
    public static function access(Request $request, Response $response, float $seconds): void
    {
        if (self::$writing) {
            return;
        }
        self::$writing = true;
        try {
            $config = ObservabilityConfig::get();
            if (!$config['log_access_enabled'] || (!$config['log_json_enabled'] && !$config['loki_enabled'])) {
                return;
            }
            $status = $response->getStatusCode();
            $level = $status >= 500 ? 'error' : ($status >= 400 ? 'warning' : 'info');
            if (ObservabilityConfig::LEVELS[$level] < ObservabilityConfig::LEVELS[$config['log_min_level']]) {
                return;
            }
            $path = $request->getPathInfo();
            $entry = self::entry($level, $request->getMethod() . ' ' . $path . ' ' . $status, [
                'type' => 'access',
                'path' => mb_substr($path, 0, 512),
                'status' => $status,
                'duration_ms' => round($seconds * 1000, 2),
                'ip' => (string) CloudFlareRealIP::getRealIP(),
                'user_agent' => mb_substr((string) $request->headers->get('User-Agent', ''), 0, 256),
                'bytes' => (int) strlen((string) $response->getContent()),
            ], 'http');
            self::emit($entry, $config);
        } catch (\Throwable) {
        } finally {
            self::$writing = false;
        }
    }

    /**
     * Build the JSON entry (exposed for tests).
     *
     * @param array<string, mixed> $context
     *
     * @return array<string, mixed>
     */
    public static function entry(string $level, string $message, array $context, string $logger): array
    {
        $now = microtime(true);
        $seconds = (int) floor($now);
        $micro = (int) round(($now - $seconds) * 1000000);
        if ($micro >= 1000000) {
            ++$seconds;
            $micro = 0;
        }

        $entry = [
            'timestamp' => gmdate('Y-m-d\TH:i:s', $seconds) . '.' . sprintf('%06d', $micro) . 'Z',
            'level' => $level,
            'message' => $message,
            'logger' => $logger,
            'app' => 'featherpanel',
            'version' => defined('APP_VERSION') ? (string) APP_VERSION : null,
            'instance' => self::instance(),
            'request_id' => RequestContext::id(),
            'user_id' => RequestContext::userUuid(),
            'route' => RequestContext::route(),
            'method' => PHP_SAPI === 'cli' ? null : ($_SERVER['REQUEST_METHOD'] ?? null),
            'context' => $context === [] ? new \stdClass() : $context,
            '_ts_ns' => sprintf('%d%06d000', $seconds, $micro),
        ];
        if (RequestContext::isImpersonating()) {
            $entry['impersonator_id'] = RequestContext::impersonatorUuid();
        }

        return $entry;
    }

    public static function normalizeLevel(string $level): string
    {
        $level = strtolower(trim($level));

        return match ($level) {
            'warn' => 'warning',
            'fatal', 'emergency', 'alert' => 'critical',
            'notice' => 'info',
            default => isset(ObservabilityConfig::LEVELS[$level]) ? $level : 'info',
        };
    }

    public static function encode(array $entry): string
    {
        unset($entry['_ts_ns']);

        return (string) json_encode($entry, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE | JSON_PARTIAL_OUTPUT_ON_ERROR);
    }

    public static function filePath(): string
    {
        $dir = defined('APP_LOGS_DIR') ? (string) APP_LOGS_DIR : dirname(__DIR__, 2) . '/storage/logs';
        $dir = realpath($dir) ?: $dir;

        return rtrim($dir, '/') . '/' . self::FILE_NAME;
    }

    /**
     * @param array<string, mixed> $entry
     * @param array<string, mixed> $config
     */
    private static function emit(array $entry, array $config): void
    {
        $line = self::encode($entry);

        if ($config['log_json_enabled']) {
            $target = $config['log_json_target'];
            if ($target === 'file' || $target === 'both') {
                self::writeFile($line);
            }
            if ($target === 'stderr' || $target === 'both') {
                self::writeStderr($line);
            }
        }

        if ($config['loki_enabled']) {
            LokiShipper::enqueue((string) $entry['level'], (string) $entry['_ts_ns'], $line);
        }
    }

    private static function writeFile(string $line): void
    {
        $path = self::filePath();
        if (++self::$writesSinceSizeCheck >= 200) {
            self::$writesSinceSizeCheck = 0;
            clearstatcache(true, $path);
            $size = @filesize($path);
            if ($size !== false && $size > self::MAX_FILE_BYTES) {
                @rename($path, $path . '.1');
            }
        }
        @file_put_contents($path, $line . "\n", FILE_APPEND | LOCK_EX);
    }

    private static function writeStderr(string $line): void
    {
        if (self::$stderr === null) {
            $handle = defined('STDERR') ? STDERR : @fopen('php://stderr', 'w');
            if ($handle === false) {
                return;
            }
            self::$stderr = $handle;
        }
        @fwrite(self::$stderr, $line . "\n");
    }

    private static function instance(): string
    {
        static $instance = null;
        if ($instance === null) {
            $instance = (string) (getenv('FEATHERPANEL_INSTANCE') ?: gethostname() ?: 'featherpanel');
        }

        return $instance;
    }
}
