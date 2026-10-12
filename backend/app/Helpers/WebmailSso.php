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

namespace App\Helpers;

/**
 * Short-lived signed Roundcube SSO tokens (HMAC + AES-256-GCM password).
 * Compatible with FeatherQuilld node webmail token.php and panel Roundcube token.php.
 */
final class WebmailSso
{
    public const DEFAULT_TTL_SECONDS = 60;

    /**
     * @param array{
     *   user: string,
     *   pass: string,
     *   host: string,
     *   port?: int,
     *   enc?: string,
     * } $creds
     */
    public static function mintToken(string $secret, array $creds, int $ttlSeconds = self::DEFAULT_TTL_SECONDS): string
    {
        $secret = trim($secret);
        if ($secret === '') {
            throw new \InvalidArgumentException('SSO secret is empty');
        }

        $user = trim($creds['user']);
        $pass = $creds['pass'];
        $host = trim($creds['host']);
        $port = (int) ($creds['port'] ?? 993);
        $enc = strtolower(trim((string) ($creds['enc'] ?? 'ssl')));

        if ($user === '' || $pass === '' || $host === '') {
            throw new \InvalidArgumentException('SSO credentials incomplete');
        }

        $payload = [
            'u' => $user,
            'p' => self::encryptPass($pass, $secret),
            'h' => $host,
            'o' => $port > 0 ? $port : 993,
            'e' => in_array($enc, ['ssl', 'tls', 'starttls', 'none'], true) ? $enc : 'ssl',
            'exp' => time() + max(15, $ttlSeconds),
        ];

        $payloadB64 = self::b64url(json_encode($payload, JSON_UNESCAPED_SLASHES) ?: '{}');
        $sig = self::b64url(hash_hmac('sha256', $payloadB64, $secret, true));

        return $payloadB64 . '.' . $sig;
    }

    public static function buildLoginUrl(string $webmailBaseUrl, string $token): string
    {
        $base = rtrim(trim($webmailBaseUrl), '/');
        if ($base === '') {
            throw new \InvalidArgumentException('webmail URL is empty');
        }

        return $base . '/token.php?token=' . rawurlencode($token);
    }

    /**
     * Ensure panel Roundcube has a durable SSO secret under storage/config.
     */
    public static function ensurePanelSecret(): string
    {
        $path = self::panelSecretPath();
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0750, true);
        }

        if (is_readable($path)) {
            $existing = trim((string) file_get_contents($path));
            if (strlen($existing) >= 32) {
                return $existing;
            }
        }

        $secret = bin2hex(random_bytes(32));
        file_put_contents($path, $secret . "\n");
        @chmod($path, 0600);

        return $secret;
    }

    public static function panelSecretPath(): string
    {
        return dirname(__DIR__, 2) . '/storage/config/webmail.sso.secret';
    }

    /**
     * Ensure the SSO secret exists under storage/config (never under public/).
     * Removes any legacy public/webmail/sso.secret that could be web-served.
     */
    public static function panelSecretForTokenPhp(): string
    {
        $secret = self::ensurePanelSecret();

        // Legacy path was web-readable via nginx try_files — delete if present.
        $legacyPublic = dirname(__DIR__, 2) . '/public/webmail/sso.secret';
        if (is_file($legacyPublic)) {
            @unlink($legacyPublic);
        }

        return $secret;
    }

    private static function encryptPass(string $pass, string $secret): string
    {
        $key = hash('sha256', $secret, true);
        $iv = random_bytes(12);
        $tag = '';
        $cipher = openssl_encrypt($pass, 'aes-256-gcm', $key, OPENSSL_RAW_DATA, $iv, $tag, '', 16);
        if ($cipher === false || strlen($tag) !== 16) {
            throw new \RuntimeException('Failed to encrypt mailbox password for SSO token');
        }

        return self::b64url($iv . $tag . $cipher);
    }

    private static function b64url(string $raw): string
    {
        return rtrim(strtr(base64_encode($raw), '+/', '-_'), '=');
    }
}
