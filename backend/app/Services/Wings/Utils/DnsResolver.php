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

namespace App\Services\Wings\Utils;

use App\App;

/**
 * DNS Resolver utility class for handling DNS resolution with caching and fallback.
 */
class DnsResolver
{
    private static array $dnsCache = [];
    private static int $cacheTimeout = 300; // 5 minutes

    /**
     * Resolve hostname to IP address with caching.
     *
     * @param string $hostname The hostname to resolve
     * @param bool $useIpv6 Whether to prefer IPv6 addresses
     *
     * @return string|null The resolved IP address or null if resolution fails
     */
    public static function resolve(string $hostname, bool $useIpv6 = false): ?string
    {
        $cacheKey = $hostname . ($useIpv6 ? '_ipv6' : '_ipv4');

        // Check cache first
        if (isset(self::$dnsCache[$cacheKey])) {
            $cached = self::$dnsCache[$cacheKey];
            if (time() - $cached['timestamp'] < self::$cacheTimeout) {
                return $cached['ip'];
            }
            unset(self::$dnsCache[$cacheKey]);
        }

        $ip = null;

        try {
            if ($useIpv6) {
                // Try IPv6 first
                $records = dns_get_record($hostname, DNS_AAAA);
                if (!empty($records)) {
                    $ip = $records[0]['ipv6'] ?? null;
                }

                // Fallback to IPv4 if IPv6 fails
                if (!$ip) {
                    $ip = gethostbyname($hostname);
                    if ($ip === $hostname) {
                        $ip = null;
                    }
                }
            } else {
                // Try IPv4 first
                $ip = gethostbyname($hostname);
                if ($ip === $hostname) {
                    $ip = null;

                    // Fallback to IPv6 if IPv4 fails
                    $records = dns_get_record($hostname, DNS_AAAA);
                    if (!empty($records)) {
                        $ip = $records[0]['ipv6'] ?? null;
                    }
                }
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('DNS resolution failed for ' . $hostname . ': ' . $e->getMessage());
            $ip = null;
        }

        // Cache the result
        if ($ip) {
            self::$dnsCache[$cacheKey] = [
                'ip' => $ip,
                'timestamp' => time(),
            ];
        }

        return $ip;
    }

    /**
     * Get all available IP addresses for a hostname.
     *
     * @param string $hostname The hostname to resolve
     *
     * @return array Array of IP addresses
     */
    public static function resolveAll(string $hostname): array
    {
        $ips = [];

        try {
            // Get IPv4 addresses
            $ipv4Records = dns_get_record($hostname, DNS_A);
            foreach ($ipv4Records as $record) {
                if (isset($record['ip'])) {
                    $ips[] = $record['ip'];
                }
            }

            // Get IPv6 addresses
            $ipv6Records = dns_get_record($hostname, DNS_AAAA);
            foreach ($ipv6Records as $record) {
                if (isset($record['ipv6'])) {
                    $ips[] = $record['ipv6'];
                }
            }
        } catch (\Exception $e) {
            App::getInstance(true)->getLogger()->error('DNS resolution failed for ' . $hostname . ': ' . $e->getMessage());
        }

        return array_unique($ips);
    }

    /**
     * Test DNS resolution with detailed results.
     *
     * @param string $hostname The hostname to test
     *
     * @return array Detailed resolution results
     */
    public static function testResolution(string $hostname): array
    {
        $results = [
            'hostname' => $hostname,
            'ipv4' => null,
            'ipv6' => null,
            'all_ips' => [],
            'resolution_time' => null,
            'success' => false,
            'errors' => [],
        ];

        $startTime = microtime(true);

        try {
            // Test IPv4
            $ipv4 = gethostbyname($hostname);
            if ($ipv4 !== $hostname) {
                $results['ipv4'] = $ipv4;
                $results['success'] = true;
            }
        } catch (\Exception $e) {
            $results['errors']['ipv4'] = $e->getMessage();
        }

        try {
            // Test IPv6
            $records = dns_get_record($hostname, DNS_AAAA);
            if (!empty($records) && isset($records[0]['ipv6'])) {
                $results['ipv6'] = $records[0]['ipv6'];
                $results['success'] = true;
            }
        } catch (\Exception $e) {
            $results['errors']['ipv6'] = $e->getMessage();
        }

        // Get all IPs
        $results['all_ips'] = self::resolveAll($hostname);
        if (!empty($results['all_ips'])) {
            $results['success'] = true;
        }

        $results['resolution_time'] = round((microtime(true) - $startTime) * 1000, 2); // in milliseconds

        return $results;
    }

    /**
     * Clear DNS cache.
     */
    public static function clearCache(): void
    {
        self::$dnsCache = [];
    }

    /**
     * Get cache statistics.
     *
     * @return array Cache statistics
     */
    public static function getCacheStats(): array
    {
        $now = time();
        $validEntries = 0;
        $expiredEntries = 0;

        foreach (self::$dnsCache as $entry) {
            if ($now - $entry['timestamp'] < self::$cacheTimeout) {
                ++$validEntries;
            } else {
                ++$expiredEntries;
            }
        }

        return [
            'total_entries' => count(self::$dnsCache),
            'valid_entries' => $validEntries,
            'expired_entries' => $expiredEntries,
            'cache_timeout' => self::$cacheTimeout,
        ];
    }

    /**
     * Set cache timeout.
     *
     * @param int $timeout Cache timeout in seconds
     */
    public static function setCacheTimeout(int $timeout): void
    {
        self::$cacheTimeout = $timeout;
    }
}
