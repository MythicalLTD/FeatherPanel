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

namespace App\Realtime;

use App\App;
use Firebase\JWT\JWT;

/**
 * Live updates through the Mercure hub that ships inside FrankenPHP.
 *
 * The panel publishes small "something changed" events (never the data
 * itself) to private topics; the frontend subscribes with a short-lived,
 * topic-scoped JWT and refetches through the normal, permission-checked
 * API. When the hub is not configured every method degrades to a no-op
 * and the frontend keeps polling, so classic / php-fpm installs keep
 * working unchanged.
 *
 * Environment:
 *  - FEATHERPANEL_MERCURE=on        set by caddy/frankenphp-env.sh when the hub is mounted
 *  - MERCURE_SUBSCRIBER_JWT_KEY     HS256 secret for subscriber tokens (hub + panel)
 *  - MERCURE_PUBLISHER_JWT_KEY      HS256 secret for publisher tokens (only used by the HTTP fallback)
 *  - MERCURE_PUBLISH_URL            optional; hub URL to POST to when mercure_publish() is unavailable
 *  - MERCURE_PUBLIC_URL             optional; hub URL handed to browsers (default /api/mercure)
 *
 * Tokens follow the Mercure 1.0 / RFC 9068 profile the hub enforces:
 * typ at+jwt, iss/aud matching caddy/mercure-on.caddyfile and
 * authorization_details listing the exact topics.
 */
final class Mercure
{
    public const TOPIC_NOTIFICATIONS = '/notifications';
    public const TOPIC_ADMIN_WEBSPACES = '/admin/webspaces';

    /** Subscriber tokens are valid for one hour; the client refreshes on reconnect. */
    public const TOKEN_TTL = 3600;

    /** Must match the issuer / resource_identifier in caddy/mercure-on.caddyfile. */
    public const ISSUER = 'https://featherpanel.internal';
    public const AUDIENCE = 'https://featherpanel.internal/.well-known/mercure';

    private const AUTHORIZATION_DETAIL = 'https://mercure.rocks/authorization-detail';

    public static function serverTopic(string $uuidShort): string
    {
        return '/servers/' . $uuidShort;
    }

    public static function userTopic(string $userUuid): string
    {
        return '/users/' . $userUuid;
    }

    public static function isEnabled(): bool
    {
        $flag = strtolower(trim((string) self::env('FEATHERPANEL_MERCURE', 'off')));
        if (!in_array($flag, ['on', '1', 'true', 'yes'], true)) {
            return false;
        }

        return self::secret('MERCURE_SUBSCRIBER_JWT_KEY') !== null;
    }

    public static function publicUrl(): string
    {
        $url = trim((string) self::env('MERCURE_PUBLIC_URL', ''));

        return $url !== '' ? $url : '/api/mercure';
    }

    /**
     * Publish a private update. Never throws: realtime is best-effort and must
     * not break the request that triggered it.
     *
     * @param string|list<string> $topics
     * @param array<string, mixed> $data
     */
    public static function publish(string | array $topics, string $type, array $data = []): bool
    {
        if (!self::isEnabled()) {
            return false;
        }

        $topics = array_values(array_unique(array_filter((array) $topics, static fn (string $t) => $t !== '')));
        if ($topics === []) {
            return false;
        }

        try {
            $payload = json_encode(['type' => $type, 'topics' => $topics, 'data' => $data], JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);

            if (function_exists('mercure_publish')) {
                mercure_publish($topics, $payload, true);

                return true;
            }

            $publishUrl = trim((string) self::env('MERCURE_PUBLISH_URL', ''));
            if ($publishUrl !== '') {
                return self::publishOverHttp($publishUrl, $topics, $payload);
            }
        } catch (\Throwable $e) {
            try {
                App::getInstance(true)->getLogger()->debug('Mercure publish failed: ' . $e->getMessage());
            } catch (\Throwable) {
            }
        }

        return false;
    }

    /**
     * Sign a subscriber token limited to exactly the given (already authorised) topics.
     *
     * @param list<string> $topics
     */
    public static function subscriberToken(array $topics, string $subject, int $ttl = self::TOKEN_TTL): ?string
    {
        return self::sign('MERCURE_SUBSCRIBER_JWT_KEY', 'subscribe', $topics, $subject, $ttl);
    }

    /**
     * @param list<string> $topics
     */
    private static function sign(string $keyEnv, string $action, array $topics, string $subject, int $ttl): ?string
    {
        $secret = self::secret($keyEnv);
        if ($secret === null || $topics === []) {
            return null;
        }
        $now = time();

        return JWT::encode([
            'iss' => self::ISSUER,
            'aud' => self::AUDIENCE,
            'sub' => $subject,
            'client_id' => self::ISSUER,
            'iat' => $now,
            'exp' => $now + $ttl,
            'jti' => 'urn:uuid:' . self::uuid4(),
            'authorization_details' => [[
                'type' => self::AUTHORIZATION_DETAIL,
                'actions' => [$action],
                'topics' => array_map(static fn (string $t) => ['match' => $t], array_values($topics)),
            ]],
        ], $secret, 'HS256', null, ['typ' => 'at+jwt']);
    }

    private static function uuid4(): string
    {
        $b = random_bytes(16);
        $b[6] = chr((ord($b[6]) & 0x0F) | 0x40);
        $b[8] = chr((ord($b[8]) & 0x3F) | 0x80);

        return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
    }

    /**
     * @param list<string> $topics
     */
    private static function publishOverHttp(string $url, array $topics, string $payload): bool
    {
        $token = self::sign('MERCURE_PUBLISHER_JWT_KEY', 'publish', $topics, 'featherpanel', 60);
        if ($token === null || !function_exists('curl_init')) {
            return false;
        }

        $fields = ['data=' . rawurlencode($payload), 'private=on'];
        foreach ($topics as $topic) {
            $fields[] = 'topic=' . rawurlencode($topic);
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => implode('&', $fields),
            CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/x-www-form-urlencoded'],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT_MS => 300,
            CURLOPT_TIMEOUT_MS => 1000,
        ]);
        curl_exec($ch);
        $status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);

        return $status >= 200 && $status < 300;
    }

    private static function secret(string $keyEnv): ?string
    {
        $secret = (string) self::env($keyEnv, '');

        // HS256 secrets shorter than 256 bits are rejected by the hub.
        return strlen($secret) >= 32 ? $secret : null;
    }

    private static function env(string $key, string $default): string
    {
        $value = $_SERVER[$key] ?? $_ENV[$key] ?? getenv($key);
        if ($value === false || $value === '') {
            return $default;
        }

        return (string) $value;
    }
}
