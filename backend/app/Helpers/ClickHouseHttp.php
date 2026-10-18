<?php

declare(strict_types=1);

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
 * Minimal client for the ClickHouse HTTP(S) interface.
 *
 * Credentials are only ever sent to non-local hosts over verified HTTPS.
 * Plain HTTP is limited to local hosts: loopback, a private/link-local IP
 * literal or a single-label name such as a Docker service (`clickhouse`).
 *
 * The scheme can be forced with an `https://` / `http://` prefix on the
 * configured host. Without a prefix, local hosts use HTTP (ClickHouse's
 * default 8123 setup) and every other host uses HTTPS.
 */
class ClickHouseHttp
{
    /**
     * Builds the base URL for a ClickHouse host.
     *
     * @throws \InvalidArgumentException when the host is empty or plain HTTP is requested for a non-local host
     */
    public static function endpoint(string $host, int $port): string
    {
        $host = trim($host);
        $scheme = null;
        if (preg_match('#^(https?)://#i', $host, $m)) {
            $scheme = strtolower($m[1]);
            $host = substr($host, strlen($m[0]));
        }
        $host = rtrim($host, '/');
        if ($host === '' || preg_match('#[/\s@?\#]#', $host)) {
            throw new \InvalidArgumentException('Invalid ClickHouse host');
        }
        $scheme ??= self::isLocalHost($host) ? 'http' : 'https';
        if ($scheme === 'http' && !self::isLocalHost($host)) {
            throw new \InvalidArgumentException(
                'ClickHouse credentials are only sent over HTTPS. Use https:// (port 8443) or a local/private host for plain HTTP.'
            );
        }
        $hostPart = str_contains($host, ':') && !str_starts_with($host, '[') ? '[' . $host . ']' : $host;

        return $scheme . '://' . $hostPart . ':' . ($port > 0 ? $port : ($scheme === 'https' ? 8443 : 8123)) . '/';
    }

    /**
     * Whether plain HTTP to this host stays on the local/private network.
     */
    public static function isLocalHost(string $host): bool
    {
        $bare = trim($host, '[]');
        if (strcasecmp($bare, 'localhost') === 0) {
            return true;
        }
        if (filter_var($bare, FILTER_VALIDATE_IP) !== false) {
            // Private (RFC1918 / ULA) or reserved (loopback, link-local) ranges are local.
            return filter_var($bare, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false;
        }

        // Single-label names (Docker / compose service names) never resolve on the public internet.
        return preg_match('/^[a-z0-9]([a-z0-9_-]*[a-z0-9])?$/i', $bare) === 1;
    }

    /**
     * Sends one statement and returns the HTTP status, body and ClickHouse exception code (if any).
     *
     * @return array{code: int, body: string, exception: ?string, error: string}
     */
    public static function request(
        string $host,
        int $port,
        string $username,
        string $password,
        string $body,
        int $timeout = 30,
    ): array {
        $url = self::endpoint($host, $port);
        $exceptionCode = null;

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_TIMEOUT => $timeout,
            CURLOPT_CONNECTTIMEOUT => min(10, $timeout),
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $body,
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTPS | CURLPROTO_HTTP,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_SSL_VERIFYHOST => 2,
            CURLOPT_HTTPHEADER => [
                'X-ClickHouse-User: ' . $username,
                'X-ClickHouse-Key: ' . $password,
                'Content-Type: text/plain; charset=utf-8',
            ],
            CURLOPT_HEADERFUNCTION => static function ($curl, string $header) use (&$exceptionCode): int {
                if (stripos($header, 'X-ClickHouse-Exception-Code:') === 0) {
                    $exceptionCode = trim(substr($header, strlen('X-ClickHouse-Exception-Code:')));
                }

                return strlen($header);
            },
        ]);
        $response = curl_exec($ch);
        $code = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);

        return [
            'code' => $code,
            'body' => $response === false ? '' : (string) $response,
            'exception' => $exceptionCode !== null && $exceptionCode !== '' ? $exceptionCode : null,
            'error' => $response === false ? ($error !== '' ? $error : 'request failed') : '',
        ];
    }

    /**
     * Runs a statement and returns the body, failing on anything but a clean HTTP 200.
     *
     * ClickHouse may already have sent `200 OK` when a query fails mid-stream;
     * it then appends the exception to the body, so the tail is checked too.
     *
     * @throws \RuntimeException
     */
    public static function query(string $host, int $port, string $username, string $password, string $body, int $timeout = 30): string
    {
        $res = self::request($host, $port, $username, $password, $body, $timeout);
        if ($res['error'] !== '') {
            throw new \RuntimeException('ClickHouse query failed: ' . $res['error']);
        }
        if ($res['code'] !== 200 || $res['exception'] !== null || self::bodyHasException($res['body'])) {
            throw new \RuntimeException('ClickHouse query failed (HTTP ' . $res['code'] . '): ' . self::shorten($res['body']));
        }

        return $res['body'];
    }

    /**
     * Detects an exception block ClickHouse appends to an already-started response.
     */
    public static function bodyHasException(string $body): bool
    {
        $tail = strlen($body) > 8192 ? substr($body, -8192) : $body;

        return preg_match('/(^|\n)\s*(Code: \d+\. DB::Exception:|__exception__)/', $tail) === 1;
    }

    private static function shorten(string $body): string
    {
        $body = trim($body);

        return strlen($body) > 500 ? substr($body, 0, 500) . '…' : $body;
    }
}
