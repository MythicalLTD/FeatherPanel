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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use OpenApi\Attributes as OA;
use App\Helpers\IpAddressMatcher;
use App\Observability\LokiShipper;
use App\Observability\MetricsAuth;
use App\CloudFlare\CloudFlareRealIP;
use App\Observability\StructuredLog;
use App\Observability\ObservabilityRedis;
use App\Observability\ObservabilityConfig;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin > Observability: Prometheus metrics access, structured JSON logs and Loki push.
 */
class ObservabilityController
{
    #[OA\Get(
        path: '/api/admin/observability',
        summary: 'Observability settings and status',
        description: 'Metrics, logging and Loki settings (secrets are never returned) plus queue and endpoint status.',
        tags: ['Admin - Observability'],
        responses: [new OA\Response(response: 200, description: 'Settings and status')]
    )]
    public function show(Request $request): Response
    {
        return ApiResponse::success($this->payload(), 'Observability settings loaded');
    }

    #[OA\Patch(
        path: '/api/admin/observability',
        summary: 'Update observability settings',
        tags: ['Admin - Observability'],
        responses: [
            new OA\Response(response: 200, description: 'Saved'),
            new OA\Response(response: 422, description: 'Invalid value'),
        ]
    )]
    public function update(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $current = ObservabilityConfig::get();
        $changes = [];

        foreach (
            [
                'metrics_enabled' => ObservabilityConfig::METRICS_ENABLED,
                'metrics_node_probes' => ObservabilityConfig::METRICS_NODE_PROBES,
                'log_json_enabled' => ObservabilityConfig::LOG_JSON_ENABLED,
                'log_access_enabled' => ObservabilityConfig::LOG_ACCESS_ENABLED,
                'loki_enabled' => ObservabilityConfig::LOKI_ENABLED,
            ] as $field => $key
        ) {
            if (array_key_exists($field, $data)) {
                if (!is_bool($data[$field])) {
                    return ApiResponse::error('Expected true or false for ' . $field, 'OBSERVABILITY_INVALID_VALUE', 422);
                }
                $changes[$key] = $data[$field] ? 'true' : 'false';
            }
        }

        foreach (
            [
                'metrics_auth_mode' => [ObservabilityConfig::METRICS_AUTH_MODE, ObservabilityConfig::AUTH_MODES],
                'log_json_target' => [ObservabilityConfig::LOG_JSON_TARGET, ObservabilityConfig::JSON_TARGETS],
                'log_min_level' => [ObservabilityConfig::LOG_MIN_LEVEL, array_keys(ObservabilityConfig::LEVELS)],
            ] as $field => [$key, $allowed]
        ) {
            if (array_key_exists($field, $data)) {
                if (!is_string($data[$field]) || !in_array($data[$field], $allowed, true)) {
                    return ApiResponse::error('Invalid value for ' . $field . ' (allowed: ' . implode(', ', $allowed) . ')', 'OBSERVABILITY_INVALID_VALUE', 422);
                }
                $changes[$key] = $data[$field];
            }
        }

        if (array_key_exists('metrics_allowed_ips', $data)) {
            $raw = is_string($data['metrics_allowed_ips']) ? $data['metrics_allowed_ips'] : '';
            $error = IpAddressMatcher::validateAllowedIpsInput($raw);
            if ($error !== null) {
                return ApiResponse::error($error, 'OBSERVABILITY_INVALID_VALUE', 422);
            }
            $changes[ObservabilityConfig::METRICS_ALLOWED_IPS] = IpAddressMatcher::normalizeAllowedIpsInput($raw);
        }

        if (array_key_exists('loki_url', $data)) {
            $url = is_string($data['loki_url']) ? trim($data['loki_url']) : '';
            if ($url !== '' && !self::isHttpUrl($url)) {
                return ApiResponse::error('The Loki URL must be an http:// or https:// URL', 'OBSERVABILITY_INVALID_VALUE', 422);
            }
            $changes[ObservabilityConfig::LOKI_URL] = $url;
        }
        if (array_key_exists('loki_username', $data)) {
            $username = is_string($data['loki_username']) ? trim($data['loki_username']) : '';
            if (mb_strlen($username) > 255) {
                return ApiResponse::error('The Loki username is too long', 'OBSERVABILITY_INVALID_VALUE', 422);
            }
            $changes[ObservabilityConfig::LOKI_USERNAME] = $username;
        }
        if (!empty($data['loki_password_clear'])) {
            $changes[ObservabilityConfig::LOKI_PASSWORD] = null;
        } elseif (isset($data['loki_password']) && is_string($data['loki_password']) && $data['loki_password'] !== '') {
            if (strlen($data['loki_password']) > 2048) {
                return ApiResponse::error('The Loki password is too long', 'OBSERVABILITY_INVALID_VALUE', 422);
            }
            $changes[ObservabilityConfig::LOKI_PASSWORD] = $data['loki_password'];
        }
        if (array_key_exists('loki_tenant', $data)) {
            $tenant = is_string($data['loki_tenant']) ? trim($data['loki_tenant']) : '';
            if ($tenant !== '' && preg_match('/^[A-Za-z0-9_.|\-]{1,150}$/', $tenant) !== 1) {
                return ApiResponse::error('The Loki tenant may only contain letters, digits, ".", "_", "-" and "|"', 'OBSERVABILITY_INVALID_VALUE', 422);
            }
            $changes[ObservabilityConfig::LOKI_TENANT] = $tenant;
        }
        if (array_key_exists('loki_labels', $data)) {
            $labels = is_string($data['loki_labels']) ? trim($data['loki_labels']) : '';
            if (strlen($labels) > 2000) {
                return ApiResponse::error('Too many Loki labels', 'OBSERVABILITY_INVALID_VALUE', 422);
            }
            $error = ObservabilityConfig::validateLabels($labels);
            if ($error !== null) {
                return ApiResponse::error($error, 'OBSERVABILITY_INVALID_VALUE', 422);
            }
            $changes[ObservabilityConfig::LOKI_LABELS] = $labels;
        }

        // Cross-field checks against the resulting configuration.
        $lokiEnabled = ($changes[ObservabilityConfig::LOKI_ENABLED] ?? ($current['loki_enabled'] ? 'true' : 'false')) === 'true';
        $lokiUrl = $changes[ObservabilityConfig::LOKI_URL] ?? $current['loki_url'];
        if ($lokiEnabled && $lokiUrl === '') {
            return ApiResponse::error('Set a Loki URL before enabling the Loki push', 'OBSERVABILITY_LOKI_URL_REQUIRED', 422);
        }
        $metricsEnabled = ($changes[ObservabilityConfig::METRICS_ENABLED] ?? ($current['metrics_enabled'] ? 'true' : 'false')) === 'true';
        $mode = $changes[ObservabilityConfig::METRICS_AUTH_MODE] ?? $current['metrics_auth_mode'];
        $allowlist = $changes[ObservabilityConfig::METRICS_ALLOWED_IPS] ?? $current['metrics_allowed_ips'];
        if ($metricsEnabled && $mode === 'ip' && trim($allowlist) === '') {
            return ApiResponse::error('IP-only metrics access needs at least one allowed IP or CIDR', 'OBSERVABILITY_ALLOWLIST_REQUIRED', 422);
        }

        if ($changes === []) {
            return ApiResponse::success($this->payload(), 'Nothing to update');
        }

        $config = App::getInstance(true)->getConfig();
        foreach ($changes as $key => $value) {
            $config->setSetting($key, $value);
        }
        ObservabilityConfig::reset();

        $this->audit($request, 'update_observability_settings', 'Updated observability settings: ' . implode(', ', array_map(
            static fn (string $key): string => str_replace('observability_', '', $key),
            array_keys($changes)
        )));

        return ApiResponse::success($this->payload(), 'Observability settings saved');
    }

    #[OA\Post(
        path: '/api/admin/observability/metrics-token',
        summary: 'Generate or rotate the metrics token',
        description: 'Creates a new bearer token for /api/system/metrics and invalidates the previous one. The token is only returned in this response.',
        tags: ['Admin - Observability'],
        responses: [new OA\Response(response: 200, description: 'New token (shown once)')]
    )]
    public function rotateToken(Request $request): Response
    {
        $token = MetricsAuth::generateToken();
        $config = App::getInstance(true)->getConfig();
        $config->setSetting(ObservabilityConfig::METRICS_TOKEN_HASH, MetricsAuth::hashToken($token));
        $config->setSetting(ObservabilityConfig::METRICS_TOKEN_HINT, substr($token, -4));
        $config->setSetting(ObservabilityConfig::METRICS_TOKEN_CREATED_AT, gmdate('c'));
        ObservabilityConfig::reset();

        $this->audit($request, 'rotate_metrics_token', 'Generated a new Prometheus metrics token');

        return ApiResponse::success(['token' => $token] + $this->payload(), 'Metrics token generated');
    }

    #[OA\Delete(
        path: '/api/admin/observability/metrics-token',
        summary: 'Revoke the metrics token',
        tags: ['Admin - Observability'],
        responses: [new OA\Response(response: 200, description: 'Revoked')]
    )]
    public function revokeToken(Request $request): Response
    {
        $config = App::getInstance(true)->getConfig();
        foreach ([ObservabilityConfig::METRICS_TOKEN_HASH, ObservabilityConfig::METRICS_TOKEN_HINT, ObservabilityConfig::METRICS_TOKEN_CREATED_AT] as $key) {
            $config->setSetting($key, null);
        }
        ObservabilityConfig::reset();

        $this->audit($request, 'revoke_metrics_token', 'Revoked the Prometheus metrics token');

        return ApiResponse::success($this->payload(), 'Metrics token revoked');
    }

    #[OA\Post(
        path: '/api/admin/observability/loki-test',
        summary: 'Send a test line to Loki',
        description: 'Pushes one log line synchronously. Unsaved url, username, password, tenant and labels in the body override the saved values for this test only.',
        tags: ['Admin - Observability'],
        responses: [new OA\Response(response: 200, description: 'Result of the push')]
    )]
    public function testLoki(Request $request): Response
    {
        $data = json_decode($request->getContent() ?: '{}', true);
        $data = is_array($data) ? $data : [];
        $config = ObservabilityConfig::get();

        if (isset($data['loki_url']) && is_string($data['loki_url']) && trim($data['loki_url']) !== '') {
            $config['loki_url'] = trim($data['loki_url']);
        }
        if (isset($data['loki_username']) && is_string($data['loki_username'])) {
            $config['loki_username'] = trim($data['loki_username']);
        }
        if (isset($data['loki_password']) && is_string($data['loki_password']) && $data['loki_password'] !== '') {
            $config['loki_password'] = $data['loki_password'];
        }
        if (isset($data['loki_tenant']) && is_string($data['loki_tenant'])) {
            $config['loki_tenant'] = trim($data['loki_tenant']);
        }
        if (isset($data['loki_labels']) && is_string($data['loki_labels'])) {
            $config['loki_labels'] = ObservabilityConfig::parseLabels($data['loki_labels']);
        }
        if ($config['loki_url'] === '' || !self::isHttpUrl($config['loki_url'])) {
            return ApiResponse::error('Set a valid Loki URL first', 'OBSERVABILITY_LOKI_URL_REQUIRED', 422);
        }

        $result = LokiShipper::test($config);
        $this->audit($request, 'test_loki_push', 'Sent a Loki test line (' . ($result['ok'] ? 'ok' : 'failed') . ')');

        return ApiResponse::success([
            'ok' => $result['ok'],
            'status' => $result['status'],
            'error' => $result['error'],
            'took_ms' => $result['took_ms'],
            'push_url' => LokiShipper::pushUrl($config['loki_url']),
        ], $result['ok'] ? 'Test line delivered to Loki' : 'Loki push failed');
    }

    /**
     * @return array<string, mixed>
     */
    private function payload(): array
    {
        $config = ObservabilityConfig::get();
        try {
            $baseUrl = AppUrlHelper::baseUrl();
        } catch (\Throwable) {
            $baseUrl = '';
        }
        $jsonFile = StructuredLog::filePath();
        clearstatcache(true, $jsonFile);
        $redis = ObservabilityRedis::connection();

        return [
            'settings' => [
                'metrics_enabled' => $config['metrics_enabled'],
                'metrics_auth_mode' => $config['metrics_auth_mode'],
                'metrics_allowed_ips' => $config['metrics_allowed_ips'],
                'metrics_node_probes' => $config['metrics_node_probes'],
                'metrics_token' => [
                    'exists' => $config['metrics_token_hash'] !== '',
                    'hint' => $config['metrics_token_hint'] !== '' ? $config['metrics_token_hint'] : null,
                    'created_at' => $config['metrics_token_created_at'] !== '' ? $config['metrics_token_created_at'] : null,
                ],
                'log_json_enabled' => $config['log_json_enabled'],
                'log_json_target' => $config['log_json_target'],
                'log_access_enabled' => $config['log_access_enabled'],
                'log_min_level' => $config['log_min_level'],
                'loki_enabled' => $config['loki_enabled'],
                'loki_url' => $config['loki_url'],
                'loki_username' => $config['loki_username'],
                'loki_has_password' => $config['loki_password'] !== '',
                'loki_tenant' => $config['loki_tenant'],
                'loki_labels' => implode("\n", array_map(static fn (string $k, string $v): string => $k . '=' . $v, array_keys($config['loki_labels']), $config['loki_labels'])),
            ],
            'status' => [
                'redis_available' => $redis !== null,
                'json_log_file' => $jsonFile,
                'json_log_file_bytes' => is_file($jsonFile) ? (int) filesize($jsonFile) : 0,
                'json_log_env_override' => strtolower(trim((string) App::env('FEATHERPANEL_LOG_FORMAT', ''))) === 'json',
                'loki' => LokiShipper::stats(),
                'loki_push_url' => $config['loki_url'] !== '' ? LokiShipper::pushUrl($config['loki_url']) : null,
            ],
            'endpoints' => [
                'base_url' => $baseUrl,
                'metrics' => $baseUrl . '/api/system/metrics',
                'health_live' => $baseUrl . '/api/health/live',
                'health_ready' => $baseUrl . '/api/health/ready',
            ],
        ];
    }

    private function audit(Request $request, string $name, string $context): void
    {
        try {
            Activity::createActivity([
                'user_uuid' => $request->attributes->get('user')['uuid'] ?? null,
                'name' => $name,
                'context' => $context,
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        } catch (\Throwable) {
        }
    }

    private static function isHttpUrl(string $url): bool
    {
        if (filter_var($url, FILTER_VALIDATE_URL) === false) {
            return false;
        }
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));

        return in_array($scheme, ['http', 'https'], true) && (string) parse_url($url, PHP_URL_HOST) !== '';
    }
}
