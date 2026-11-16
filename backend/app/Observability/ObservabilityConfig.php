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

/**
 * Observability settings (Prometheus metrics, structured JSON logs, Loki push).
 *
 * Values live in featherpanel_settings like every other panel setting. They are read
 * once per request (and at most every few seconds in long-running CLI/cron processes)
 * and never throw: the logger depends on them, so a missing database simply means
 * "everything off" (or whatever the FEATHERPANEL_LOG_* environment overrides say).
 */
final class ObservabilityConfig
{
    public const METRICS_ENABLED = 'observability_metrics_enabled';
    /** token (bearer token, plus the IP allowlist when one is set) or ip (allowlist only). */
    public const METRICS_AUTH_MODE = 'observability_metrics_auth_mode';
    public const METRICS_TOKEN_HASH = 'observability_metrics_token_hash';
    public const METRICS_TOKEN_HINT = 'observability_metrics_token_hint';
    public const METRICS_TOKEN_CREATED_AT = 'observability_metrics_token_created_at';
    public const METRICS_ALLOWED_IPS = 'observability_metrics_allowed_ips';
    public const METRICS_NODE_PROBES = 'observability_metrics_node_probes';

    public const LOG_JSON_ENABLED = 'observability_log_json_enabled';
    /** file (storage/logs/featherpanel.json.log), stderr (container logs) or both. */
    public const LOG_JSON_TARGET = 'observability_log_json_target';
    public const LOG_ACCESS_ENABLED = 'observability_log_access_enabled';
    public const LOG_MIN_LEVEL = 'observability_log_min_level';

    public const LOKI_ENABLED = 'observability_loki_enabled';
    public const LOKI_URL = 'observability_loki_url';
    public const LOKI_USERNAME = 'observability_loki_username';
    public const LOKI_PASSWORD = 'observability_loki_password';
    public const LOKI_TENANT = 'observability_loki_tenant';
    /** Extra static stream labels, one key=value per line. */
    public const LOKI_LABELS = 'observability_loki_labels';

    public const AUTH_MODES = ['token', 'ip'];
    public const JSON_TARGETS = ['file', 'stderr', 'both'];
    public const LEVELS = ['debug' => 10, 'info' => 20, 'warning' => 30, 'error' => 40, 'critical' => 50];

    /** Every key managed by the admin page, in display order. */
    public const KEYS = [
        self::METRICS_ENABLED,
        self::METRICS_AUTH_MODE,
        self::METRICS_TOKEN_HASH,
        self::METRICS_TOKEN_HINT,
        self::METRICS_TOKEN_CREATED_AT,
        self::METRICS_ALLOWED_IPS,
        self::METRICS_NODE_PROBES,
        self::LOG_JSON_ENABLED,
        self::LOG_JSON_TARGET,
        self::LOG_ACCESS_ENABLED,
        self::LOG_MIN_LEVEL,
        self::LOKI_ENABLED,
        self::LOKI_URL,
        self::LOKI_USERNAME,
        self::LOKI_PASSWORD,
        self::LOKI_TENANT,
        self::LOKI_LABELS,
    ];

    private const MAX_AGE_SECONDS = 10.0;

    /** @var array<string, mixed>|null */
    private static ?array $snapshot = null;

    private static float $loadedAt = 0.0;

    private static bool $loading = false;

    /**
     * Forget the cached values (called before every request).
     */
    public static function reset(): void
    {
        self::$snapshot = null;
        self::$loadedAt = 0.0;
    }

    /**
     * Normalized settings. Never throws.
     *
     * @return array{
     *     metrics_enabled: bool,
     *     metrics_auth_mode: string,
     *     metrics_token_hash: string,
     *     metrics_token_hint: string,
     *     metrics_token_created_at: string,
     *     metrics_allowed_ips: string,
     *     metrics_node_probes: bool,
     *     log_json_enabled: bool,
     *     log_json_target: string,
     *     log_access_enabled: bool,
     *     log_min_level: string,
     *     loki_enabled: bool,
     *     loki_url: string,
     *     loki_username: string,
     *     loki_password: string,
     *     loki_tenant: string,
     *     loki_labels: array<string, string>,
     *     loaded_from_database: bool
     * }
     */
    public static function get(): array
    {
        if (self::$snapshot !== null && microtime(true) - self::$loadedAt < self::MAX_AGE_SECONDS) {
            return self::$snapshot;
        }
        if (self::$loading) {
            // Re-entered while loading (e.g. the settings query logged something).
            return self::$snapshot ?? self::normalize([], false);
        }

        self::$loading = true;
        try {
            $raw = [];
            $fromDb = false;
            try {
                $config = App::getInstance(true)->getConfig();
                foreach (self::KEYS as $key) {
                    $raw[$key] = $config->getSetting($key, null);
                }
                $fromDb = true;
            } catch (\Throwable) {
                $raw = [];
            }
            self::$snapshot = self::normalize($raw, $fromDb);
            self::$loadedAt = microtime(true);
        } finally {
            self::$loading = false;
        }

        return self::$snapshot;
    }

    public static function metricsEnabled(): bool
    {
        return self::get()['metrics_enabled'];
    }

    /**
     * Turn raw setting strings into typed values, applying environment overrides.
     *
     * @param array<string, string|null> $raw
     *
     * @return array<string, mixed>
     */
    public static function normalize(array $raw, bool $fromDb): array
    {
        $bool = static fn (?string $v, bool $default = false): bool => $v === null || $v === '' ? $default : in_array(strtolower($v), ['1', 'true', 'yes', 'on'], true);
        $str = static fn (string $key): string => trim((string) ($raw[$key] ?? ''));

        $authMode = $str(self::METRICS_AUTH_MODE);
        if (!in_array($authMode, self::AUTH_MODES, true)) {
            $authMode = 'token';
        }
        $target = $str(self::LOG_JSON_TARGET);
        if (!in_array($target, self::JSON_TARGETS, true)) {
            $target = 'file';
        }
        $level = strtolower($str(self::LOG_MIN_LEVEL));
        if (!isset(self::LEVELS[$level])) {
            $level = 'info';
        }

        $jsonEnabled = $bool($raw[self::LOG_JSON_ENABLED] ?? null);
        $accessEnabled = $bool($raw[self::LOG_ACCESS_ENABLED] ?? null);

        // Environment overrides let containers ship JSON logs before the database is reachable.
        $envFormat = strtolower(trim((string) App::env('FEATHERPANEL_LOG_FORMAT', '')));
        if ($envFormat === 'json') {
            $jsonEnabled = true;
        }
        $envTarget = strtolower(trim((string) App::env('FEATHERPANEL_LOG_JSON_TARGET', '')));
        if (in_array($envTarget, self::JSON_TARGETS, true)) {
            $target = $envTarget;
        }

        return [
            'metrics_enabled' => $bool($raw[self::METRICS_ENABLED] ?? null),
            'metrics_auth_mode' => $authMode,
            'metrics_token_hash' => $str(self::METRICS_TOKEN_HASH),
            'metrics_token_hint' => $str(self::METRICS_TOKEN_HINT),
            'metrics_token_created_at' => $str(self::METRICS_TOKEN_CREATED_AT),
            'metrics_allowed_ips' => $str(self::METRICS_ALLOWED_IPS),
            'metrics_node_probes' => $bool($raw[self::METRICS_NODE_PROBES] ?? null, true),
            'log_json_enabled' => $jsonEnabled,
            'log_json_target' => $target,
            'log_access_enabled' => $accessEnabled,
            'log_min_level' => $level,
            'loki_enabled' => $bool($raw[self::LOKI_ENABLED] ?? null) && $str(self::LOKI_URL) !== '',
            'loki_url' => $str(self::LOKI_URL),
            'loki_username' => $str(self::LOKI_USERNAME),
            'loki_password' => (string) ($raw[self::LOKI_PASSWORD] ?? ''),
            'loki_tenant' => $str(self::LOKI_TENANT),
            'loki_labels' => self::parseLabels($str(self::LOKI_LABELS)),
            'loaded_from_database' => $fromDb,
        ];
    }

    /**
     * Parse "key=value" lines (or comma separated pairs) into valid Loki label pairs.
     * Invalid names are skipped; reserved names used by the panel itself are ignored.
     *
     * @return array<string, string>
     */
    public static function parseLabels(string $raw): array
    {
        $labels = [];
        foreach (preg_split('/[\r\n,]+/', $raw, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $pair) {
            $parts = explode('=', $pair, 2);
            if (count($parts) !== 2) {
                continue;
            }
            $name = trim($parts[0]);
            $value = trim(trim($parts[1]), '"\'');
            if (preg_match('/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/', $name) !== 1 || $value === '' || strlen($value) > 128) {
                continue;
            }
            if (in_array($name, ['app', 'level', 'instance', 'job', 'stream'], true)) {
                continue;
            }
            $labels[$name] = $value;
            if (count($labels) >= 10) {
                break;
            }
        }

        return $labels;
    }

    /**
     * Validation error for a label list, or null when every line is valid.
     */
    public static function validateLabels(string $raw): ?string
    {
        foreach (preg_split('/[\r\n,]+/', $raw, -1, PREG_SPLIT_NO_EMPTY) ?: [] as $pair) {
            $pair = trim($pair);
            if ($pair === '') {
                continue;
            }
            $parts = explode('=', $pair, 2);
            if (count($parts) !== 2 || preg_match('/^[a-zA-Z_][a-zA-Z0-9_]{0,63}$/', trim($parts[0])) !== 1 || trim($parts[1]) === '') {
                return 'Invalid label "' . mb_substr($pair, 0, 80) . '": use name=value with a name made of letters, digits and underscores';
            }
            if (in_array(trim($parts[0]), ['app', 'level', 'instance', 'job', 'stream'], true)) {
                return 'The label "' . trim($parts[0]) . '" is set by the panel and cannot be overridden';
            }
        }

        return null;
    }
}
