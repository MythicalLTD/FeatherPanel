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
 * Fetch remote URLs without exposing the panel to SSRF.
 *
 * Only http(s) URLs whose hostname resolves exclusively to public IP addresses
 * are fetched. Each hop connects to the IP that was validated for that URL
 * (no second DNS lookup). Redirects are followed manually and every hop is
 * re-validated and re-pinned; the raw body is capped by a byte limit.
 */
class SafeUrlFetcher
{
    public const DEFAULT_MAX_BYTES = 52428800; // 50 MiB
    public const DEFAULT_TIMEOUT = 30;
    public const MAX_REDIRECTS = 3;

    /**
     * Download a URL body, or return false when the URL is not allowed / the request fails.
     */
    public static function fetch(string $url, int $maxBytes = self::DEFAULT_MAX_BYTES, int $timeoutSeconds = self::DEFAULT_TIMEOUT): string | false
    {
        if ($maxBytes <= 0) {
            $maxBytes = self::DEFAULT_MAX_BYTES;
        }
        if ($timeoutSeconds <= 0) {
            $timeoutSeconds = self::DEFAULT_TIMEOUT;
        }

        $currentUrl = $url;
        for ($redirect = 0; $redirect <= self::MAX_REDIRECTS; ++$redirect) {
            $pinned = self::pinAllowedUrl($currentUrl);
            if ($pinned === null) {
                return false;
            }

            $context = stream_context_create([
                'http' => [
                    'timeout' => $timeoutSeconds,
                    'ignore_errors' => true,
                    'follow_location' => 0,
                    'max_redirects' => 0,
                    'user_agent' => 'FeatherPanel/1.0',
                    'header' => 'Host: ' . $pinned['host_header'] . "\r\n",
                ],
                'ssl' => [
                    'verify_peer' => true,
                    'verify_peer_name' => true,
                    'peer_name' => $pinned['tls_peer_name'],
                ],
            ]);

            $handle = @fopen($pinned['url'], 'rb', false, $context);
            if ($handle === false) {
                return false;
            }

            $body = '';
            while (!feof($handle)) {
                $chunk = fread($handle, 8192);
                if ($chunk === false) {
                    break;
                }
                $body .= $chunk;
                if (strlen($body) > $maxBytes) {
                    fclose($handle);

                    return false;
                }
            }
            fclose($handle);

            $status = self::parseStatusCode($http_response_header ?? []);
            $location = self::parseLocation($http_response_header ?? []);

            if ($status >= 300 && $status < 400 && $location !== null) {
                // Resolve against the original (hostname) URL so relative redirects keep the host.
                $currentUrl = self::resolveRedirect($currentUrl, $location);
                if ($currentUrl === null) {
                    return false;
                }

                continue;
            }

            if ($status !== 0 && ($status < 200 || $status >= 300)) {
                return false;
            }

            return $body;
        }

        return false;
    }

    /**
     * Whether the URL uses http(s) and its host resolves only to public IPs.
     */
    public static function isAllowedUrl(string $url): bool
    {
        return self::pinAllowedUrl($url) !== null;
    }

    /**
     * Validate the URL and return a connection target pinned to a validated IP.
     *
     * @return array{url: string, host_header: string, tls_peer_name: string}|null
     */
    private static function pinAllowedUrl(string $url): ?array
    {
        $parts = parse_url($url);
        if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
            return null;
        }

        $scheme = strtolower((string) $parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            return null;
        }

        if (isset($parts['user']) || isset($parts['pass'])) {
            return null;
        }

        $host = (string) $parts['host'];
        $ips = self::resolveHost($host);
        if ($ips === []) {
            return null;
        }

        foreach ($ips as $ip) {
            if (!self::isPublicIp($ip)) {
                return null;
            }
        }

        // Prefer IPv4 when available; otherwise use the first validated address.
        $connectIp = $ips[0];
        foreach ($ips as $ip) {
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
                $connectIp = $ip;
                break;
            }
        }

        $port = isset($parts['port']) ? (int) $parts['port'] : ($scheme === 'https' ? 443 : 80);
        $path = $parts['path'] ?? '/';
        if (isset($parts['query'])) {
            $path .= '?' . $parts['query'];
        }

        $authority = filter_var($connectIp, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false
            ? '[' . $connectIp . ']'
            : $connectIp;

        $hostHeader = $host;
        $defaultPort = $scheme === 'https' ? 443 : 80;
        if ($port !== $defaultPort) {
            $hostHeader .= ':' . $port;
        }

        return [
            'url' => $scheme . '://' . $authority . ':' . $port . $path,
            'host_header' => $hostHeader,
            'tls_peer_name' => trim($host, '[]'),
        ];
    }

    /**
     * Resolve a hostname (or IP literal) to a list of IP addresses.
     *
     * @return list<string>
     */
    private static function resolveHost(string $host): array
    {
        $host = trim($host, '[]');
        if ($host === '') {
            return [];
        }

        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return [$host];
        }

        $ips = [];
        $ipv4 = @gethostbynamel($host);
        if (is_array($ipv4)) {
            $ips = array_merge($ips, $ipv4);
        }

        $aaaaRecords = @dns_get_record($host, DNS_AAAA);
        if (is_array($aaaaRecords)) {
            foreach ($aaaaRecords as $record) {
                if (!empty($record['ipv6'])) {
                    $ips[] = (string) $record['ipv6'];
                }
            }
        }

        return array_values(array_unique($ips));
    }

    /**
     * Reject loopback, private, link-local, CGNAT and other reserved ranges.
     * IPv4-mapped / IPv4-compatible IPv6 forms are unwrapped and checked as IPv4.
     */
    private static function isPublicIp(string $ip): bool
    {
        $ip = trim($ip, '[]');
        if (filter_var($ip, FILTER_VALIDATE_IP) === false) {
            return false;
        }

        $embedded = self::unwrapIpv4MappedOrCompatible($ip);
        if ($embedded !== null) {
            return self::isPublicIpv4($embedded);
        }

        // Public/global only: excludes private + reserved ranges (IPv4 and IPv6).
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }

        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            return self::isPublicIpv4($ip);
        }

        return true;
    }

    private static function isPublicIpv4(string $ip): bool
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4 | FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) === false) {
            return false;
        }

        // CGNAT 100.64.0.0/10 is not covered by the reserved-range flag on every PHP build.
        $long = ip2long($ip);
        if ($long !== false && ($long & 0xFFC00000) === ip2long('100.64.0.0')) {
            return false;
        }

        return true;
    }

    /**
     * Extract the embedded IPv4 from IPv4-mapped (::ffff:a.b.c.d) or
     * IPv4-compatible (::a.b.c.d) addresses. Returns null for other forms.
     */
    private static function unwrapIpv4MappedOrCompatible(string $ip): ?string
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) === false) {
            return null;
        }

        $binary = @inet_pton($ip);
        if ($binary === false || strlen($binary) !== 16) {
            return null;
        }

        // IPv4-mapped: ::ffff:0:0/96 → first 12 bytes are 00..00 ffff
        if (substr($binary, 0, 12) === "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\xff\xff") {
            $v4 = inet_ntop(substr($binary, 12));

            return is_string($v4) ? $v4 : null;
        }

        // IPv4-compatible (deprecated): ::a.b.c.d → first 12 bytes zero, last 4 not all zero
        if (substr($binary, 0, 12) === "\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00\x00") {
            $last4 = substr($binary, 12);
            if ($last4 !== "\x00\x00\x00\x00" && $last4 !== "\x00\x00\x00\x01") {
                $v4 = inet_ntop($last4);

                return is_string($v4) ? $v4 : null;
            }
        }

        return null;
    }

    /**
     * @param list<string> $headers
     */
    private static function parseStatusCode(array $headers): int
    {
        foreach ($headers as $header) {
            if (preg_match('#^HTTP/\S+\s+(\d{3})#i', $header, $matches) === 1) {
                $status = (int) $matches[1];
            }
        }

        return $status ?? 0;
    }

    /**
     * @param list<string> $headers
     */
    private static function parseLocation(array $headers): ?string
    {
        foreach ($headers as $header) {
            if (stripos($header, 'location:') === 0) {
                $value = trim(substr($header, strlen('location:')));
                if ($value !== '') {
                    return $value;
                }
            }
        }

        return null;
    }

    private static function resolveRedirect(string $baseUrl, string $location): ?string
    {
        // Absolute URL
        if (preg_match('#^https?://#i', $location) === 1) {
            return $location;
        }

        $parts = parse_url($baseUrl);
        if (!is_array($parts) || empty($parts['scheme']) || empty($parts['host'])) {
            return null;
        }

        $scheme = $parts['scheme'];
        $host = $parts['host'];
        $port = isset($parts['port']) ? ':' . $parts['port'] : '';

        if (str_starts_with($location, '//')) {
            return $scheme . ':' . $location;
        }

        if (str_starts_with($location, '/')) {
            return $scheme . '://' . $host . $port . $location;
        }

        $basePath = $parts['path'] ?? '/';
        $directory = substr($basePath, 0, (int) strrpos($basePath, '/') + 1);

        return $scheme . '://' . $host . $port . $directory . $location;
    }
}
