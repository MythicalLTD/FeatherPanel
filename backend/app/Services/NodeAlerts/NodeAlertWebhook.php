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

namespace App\Services\NodeAlerts;

use App\App;
use GuzzleHttp\Client;
use App\Helpers\SafeUrlFetcher;

/**
 * Sends node alerts to the admin-configured webhook. The URL must be https and resolve only
 * to public addresses; the request is pinned to the checked addresses (no DNS rebinding) and
 * redirects are not followed. The JSON body is signed with HMAC-SHA256 over "timestamp.body".
 */
class NodeAlertWebhook
{
    /** Local development only: lifts the https/public-address rule. */
    public const ENV_ALLOW_PRIVATE = 'FEATHERPANEL_NODE_ALERTS_ALLOW_PRIVATE_WEBHOOK';

    public static function allowPrivate(): bool
    {
        $v = App::env(self::ENV_ALLOW_PRIVATE, '') ?? '';

        return in_array(strtolower((string) $v), ['1', 'true', 'yes'], true);
    }

    /** @return string|null error code when the URL is not acceptable (no DNS lookup) */
    public static function shapeError(string $url): ?string
    {
        if ($url === '') {
            return null;
        }
        $parts = parse_url($url);
        if (!is_array($parts) || empty($parts['host']) || empty($parts['scheme'])) {
            return 'NODE_ALERT_WEBHOOK_INVALID';
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            return 'NODE_ALERT_WEBHOOK_INVALID';
        }
        $scheme = strtolower((string) $parts['scheme']);
        if ($scheme !== 'https' && !($scheme === 'http' && self::allowPrivate())) {
            return 'NODE_ALERT_WEBHOOK_NOT_HTTPS';
        }

        return null;
    }

    /**
     * Resolve the host and return curl pinning options.
     *
     * @return array{0: array<string, mixed>|null, 1: string|null} [guzzle options, error code]
     */
    public static function pin(string $url): array
    {
        $shape = self::shapeError($url);
        if ($shape !== null) {
            return [null, $shape];
        }
        $host = trim((string) parse_url($url, PHP_URL_HOST), '[]');
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $port = (int) (parse_url($url, PHP_URL_PORT) ?: ($scheme === 'https' ? 443 : 80));
        $ips = SafeUrlFetcher::resolveHost($host);
        if ($ips === []) {
            return [null, 'NODE_ALERT_WEBHOOK_UNRESOLVABLE'];
        }
        foreach ($ips as $ip) {
            if (!self::allowPrivate() && !SafeUrlFetcher::isPublicIp($ip)) {
                return [null, 'NODE_ALERT_WEBHOOK_PRIVATE_ADDRESS'];
            }
        }
        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return [[], null];
        }
        $list = implode(',', array_map(static fn (string $ip): string => str_contains($ip, ':') ? '[' . $ip . ']' : $ip, $ips));

        return [['curl' => [CURLOPT_RESOLVE => [$host . ':' . $port . ':' . $list]]], null];
    }

    public static function sign(string $secret, int $timestamp, string $body): string
    {
        return 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret);
    }

    /**
     * POST the payload. Returns null on success or an error string.
     */
    public static function send(string $url, string $secret, array $payload): ?string
    {
        [$pin, $error] = self::pin($url);
        if ($pin === null) {
            return $error;
        }
        $body = (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $ts = time();
        $headers = [
            'Content-Type' => 'application/json',
            'User-Agent' => 'FeatherPanel-NodeAlerts/1.0',
            'X-FeatherPanel-Event' => (string) ($payload['event'] ?? 'node_alert'),
            'X-FeatherPanel-Timestamp' => (string) $ts,
        ];
        if ($secret !== '') {
            $headers['X-FeatherPanel-Signature'] = self::sign($secret, $ts, $body);
        }
        try {
            $response = (new Client(['timeout' => 6, 'connect_timeout' => 4, 'allow_redirects' => false, 'http_errors' => false]))
                ->post($url, $pin + ['headers' => $headers, 'body' => $body]);
            $status = $response->getStatusCode();
            if ($status < 200 || $status >= 300) {
                return 'HTTP ' . $status;
            }

            return null;
        } catch (\Throwable $e) {
            return mb_substr($e->getMessage(), 0, 200);
        }
    }
}
