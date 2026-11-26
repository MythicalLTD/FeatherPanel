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

namespace App\Services\Webhooks;

use App\App;
use GuzzleHttp\Client;
use App\Config\ConfigInterface;
use App\Helpers\SafeUrlFetcher;

/**
 * Sends one webhook request. The target host is resolved first and must be public unless
 * the admin allows private targets; the request is then pinned to the checked addresses
 * (no DNS rebinding) and redirects are not followed. JSON bodies are signed with
 * HMAC-SHA256 over "timestamp.body" in X-FeatherPanel-Signature.
 */
final class WebhookSender
{
    public const FORMAT_JSON = 'json';
    public const FORMAT_DISCORD = 'discord';
    public const FORMATS = [self::FORMAT_JSON, self::FORMAT_DISCORD];

    /** Local development: same as the admin setting, read from the environment. */
    public const ENV_ALLOW_PRIVATE = 'FEATHERPANEL_WEBHOOKS_ALLOW_PRIVATE';

    public const SNIPPET_BYTES = 1024;

    /** Overridable in tests. */
    public static ?bool $allowPrivateOverride = null;

    public static function allowPrivate(): bool
    {
        if (self::$allowPrivateOverride !== null) {
            return self::$allowPrivateOverride;
        }
        $env = strtolower((string) (App::env(self::ENV_ALLOW_PRIVATE, '') ?? ''));
        if (in_array($env, ['1', 'true', 'yes'], true)) {
            return true;
        }
        try {
            $value = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::WEBHOOKS_ALLOW_PRIVATE_TARGETS, 'false');

            return in_array(strtolower((string) $value), ['1', 'true', 'yes'], true);
        } catch (\Throwable) {
            return false;
        }
    }

    /** @return string|null error code when the URL shape is not acceptable (no DNS lookup) */
    public static function shapeError(string $url): ?string
    {
        if ($url === '' || strlen($url) > 2048) {
            return 'WEBHOOK_URL_INVALID';
        }
        $parts = parse_url($url);
        if (!is_array($parts) || empty($parts['host']) || empty($parts['scheme'])) {
            return 'WEBHOOK_URL_INVALID';
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            return 'WEBHOOK_URL_INVALID';
        }
        if (!in_array(strtolower((string) $parts['scheme']), ['http', 'https'], true)) {
            return 'WEBHOOK_URL_INVALID';
        }

        return null;
    }

    /**
     * Whether an address may be contacted. Link-local (cloud metadata) and unspecified
     * addresses stay blocked even when private targets are allowed.
     */
    public static function addressAllowed(string $ip, bool $allowPrivate): bool
    {
        $ip = trim($ip, '[]');
        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }
        if (SafeUrlFetcher::isPublicIp($ip)) {
            return true;
        }
        if (!$allowPrivate) {
            return false;
        }
        $lower = strtolower($ip);
        if ($ip === '0.0.0.0' || $lower === '::' || str_starts_with($ip, '169.254.') || str_starts_with($lower, 'fe80:') || $lower === 'fd00:ec2::254') {
            return false;
        }

        return true;
    }

    /**
     * Resolve the host and return Guzzle options pinning the connection to the checked addresses.
     *
     * @return array{0: array<string, mixed>|null, 1: string|null} [guzzle options, error code]
     */
    public static function pin(string $url, ?bool $allowPrivate = null): array
    {
        $shape = self::shapeError($url);
        if ($shape !== null) {
            return [null, $shape];
        }
        $allowPrivate ??= self::allowPrivate();
        $host = trim((string) parse_url($url, PHP_URL_HOST), '[]');
        $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
        $port = (int) (parse_url($url, PHP_URL_PORT) ?: ($scheme === 'https' ? 443 : 80));
        $ips = SafeUrlFetcher::resolveHost($host);
        if ($ips === []) {
            return [null, 'WEBHOOK_URL_UNRESOLVABLE'];
        }
        foreach ($ips as $ip) {
            if (!self::addressAllowed($ip, $allowPrivate)) {
                return [null, 'WEBHOOK_URL_PRIVATE_ADDRESS'];
            }
        }
        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return [[], null];
        }
        $list = implode(',', array_map(static fn (string $ip): string => str_contains($ip, ':') ? '[' . $ip . ']' : $ip, $ips));

        return [['curl' => [CURLOPT_RESOLVE => [$host . ':' . $port . ':' . $list]]], null];
    }

    public static function errorMessage(?string $code): string
    {
        return match ($code) {
            'WEBHOOK_URL_UNRESOLVABLE' => 'The webhook host does not resolve',
            'WEBHOOK_URL_PRIVATE_ADDRESS' => 'The webhook host resolves to a private, loopback or reserved address. Allow private targets in the webhook settings to use it.',
            default => 'The webhook URL must be a valid http(s) URL without credentials',
        };
    }

    public static function sign(string $secret, int $timestamp, string $body): string
    {
        return 'sha256=' . hash_hmac('sha256', $timestamp . '.' . $body, $secret);
    }

    /** Receivers can use this: constant-time check plus a freshness window. */
    public static function verify(string $secret, string $timestampHeader, string $body, string $signatureHeader, int $toleranceSeconds = 300, ?int $now = null): bool
    {
        if (!ctype_digit($timestampHeader)) {
            return false;
        }
        $now ??= time();
        if (abs($now - (int) $timestampHeader) > $toleranceSeconds) {
            return false;
        }

        return hash_equals(self::sign($secret, (int) $timestampHeader, $body), $signatureHeader);
    }

    /**
     * Turn a stored JSON payload into the request body for the webhook's format.
     *
     * @param array<string, mixed> $payload
     */
    public static function body(array $payload, string $format): string
    {
        if ($format === self::FORMAT_DISCORD) {
            $payload = self::discord($payload);
        }

        return (string) json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE);
    }

    /**
     * Discord-compatible message: one embed with the event, the main subject and a few fields.
     *
     * @param array<string, mixed> $payload
     *
     * @return array<string, mixed>
     */
    public static function discord(array $payload): array
    {
        $event = (string) ($payload['event'] ?? 'event');
        $data = is_array($payload['data'] ?? null) ? $payload['data'] : [];
        $appName = 'FeatherPanel';
        try {
            $appName = (string) (App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel') ?? 'FeatherPanel');
        } catch (\Throwable) {
        }

        $subject = $data;
        foreach (['server', 'user', 'vds', 'webspace'] as $key) {
            if (isset($data[$key]) && is_array($data[$key])) {
                $subject = $data[$key];
                break;
            }
        }
        $title = (string) ($subject['name'] ?? $subject['hostname'] ?? $subject['username'] ?? '');
        if (isset($data['backup']['name'])) {
            $title = (string) $data['backup']['name'] . ($title !== '' ? ' · ' . $title : '');
        }

        $fields = [];
        $add = static function (string $name, mixed $value) use (&$fields): void {
            if ($value === null || $value === '' || is_array($value) || count($fields) >= 10) {
                return;
            }
            $fields[] = ['name' => $name, 'value' => mb_substr(is_bool($value) ? ($value ? 'yes' : 'no') : (string) $value, 0, 1000), 'inline' => true];
        };
        $add('UUID', $subject['uuid'] ?? null);
        $add('External ID', $subject['external_id'] ?? null);
        $add('Status', $subject['status'] ?? null);
        $add('Email', $subject['email'] ?? null);
        $add('IP', $subject['ip_address'] ?? null);
        if (isset($subject['owner']) && is_array($subject['owner'])) {
            $add('Owner', $subject['owner']['username'] ?? $subject['owner']['email'] ?? null);
        }
        if (isset($data['actor']) && is_array($data['actor'])) {
            $add('By', $data['actor']['username'] ?? null);
        }
        $add('Reason', $data['reason'] ?? null);
        if (isset($data['backup']) && is_array($data['backup'])) {
            $add('Size', isset($data['backup']['bytes']) ? round(((int) $data['backup']['bytes']) / 1048576, 1) . ' MiB' : null);
        }

        $color = match (true) {
            str_ends_with($event, '.failed'), str_ends_with($event, '.deleted') => 0xEF4444,
            str_ends_with($event, '.suspended') => 0xF59E0B,
            str_ends_with($event, '.created'), str_ends_with($event, '.completed'), str_ends_with($event, '.unsuspended') => 0x22C55E,
            default => 0x3B82F6,
        };

        return [
            'username' => mb_substr($appName, 0, 80),
            'allowed_mentions' => ['parse' => []],
            'embeds' => [[
                'title' => mb_substr($event . ($title !== '' ? ': ' . $title : ''), 0, 256),
                'color' => $color,
                'fields' => $fields,
                'timestamp' => (string) ($payload['timestamp'] ?? gmdate('c')),
                'footer' => ['text' => mb_substr($appName . ' webhooks', 0, 2048)],
            ]],
        ];
    }

    /**
     * POST a stored payload to a webhook.
     *
     * @param array<string, mixed> $webhook row with url, format and the plain secret in "secret_plain"
     * @param array<string, mixed> $payload
     *
     * @return array{ok: bool, status_code: int|null, response: string|null, error: string|null, duration_ms: int}
     */
    public static function send(array $webhook, array $payload, string $deliveryId): array
    {
        $started = microtime(true);
        $result = static fn (bool $ok, ?int $code, ?string $response, ?string $error): array => [
            'ok' => $ok,
            'status_code' => $code,
            'response' => $response,
            'error' => $error !== null ? mb_substr($error, 0, 500) : null,
            'duration_ms' => (int) round((microtime(true) - $started) * 1000),
        ];

        $url = (string) ($webhook['url'] ?? '');
        [$pin, $error] = self::pin($url);
        if ($pin === null) {
            return $result(false, null, null, self::errorMessage($error));
        }
        $format = in_array($webhook['format'] ?? '', self::FORMATS, true) ? (string) $webhook['format'] : self::FORMAT_JSON;
        $body = self::body($payload, $format);
        $ts = time();
        $headers = [
            'Content-Type' => 'application/json',
            'User-Agent' => 'FeatherPanel-Webhooks/1.0',
            'X-FeatherPanel-Event' => (string) ($payload['event'] ?? ''),
            'X-FeatherPanel-Delivery' => $deliveryId,
            'X-FeatherPanel-Timestamp' => (string) $ts,
        ];
        $secret = (string) ($webhook['secret_plain'] ?? '');
        if ($secret !== '') {
            $headers['X-FeatherPanel-Signature'] = self::sign($secret, $ts, $body);
        }

        try {
            $response = (new Client([
                'timeout' => 10,
                'connect_timeout' => 5,
                'allow_redirects' => false,
                'http_errors' => false,
                'stream' => true,
            ]))->post($url, $pin + ['headers' => $headers, 'body' => $body]);
            $status = $response->getStatusCode();
            $snippet = '';
            $stream = $response->getBody();
            while (!$stream->eof() && strlen($snippet) < self::SNIPPET_BYTES) {
                $chunk = $stream->read(self::SNIPPET_BYTES - strlen($snippet));
                if ($chunk === '') {
                    break;
                }
                $snippet .= $chunk;
            }
            $stream->close();
            $snippet = mb_convert_encoding($snippet, 'UTF-8', 'UTF-8');
            $ok = $status >= 200 && $status < 300;

            return $result($ok, $status, $snippet, $ok ? null : 'HTTP ' . $status);
        } catch (\Throwable $e) {
            return $result(false, null, null, $e->getMessage());
        }
    }
}
