<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\CloudFlare;

class CloudFlareRealIP
{
    /**
     * List of Cloudflare IPv4 and IPv6 ranges.
     */
    private static $cloudflareRanges = [
        // IPv4
        '173.245.48.0/20',
        '103.21.244.0/22',
        '103.22.200.0/22',
        '103.31.4.0/22',
        '141.101.64.0/18',
        '108.162.192.0/18',
        '190.93.240.0/20',
        '188.114.96.0/20',
        '197.234.240.0/22',
        '198.41.128.0/17',
        '162.158.0.0/15',
        '104.16.0.0/13',
        '104.24.0.0/14',
        '172.64.0.0/13',
        '131.0.72.0/22',
        // IPv6
        '2400:cb00::/32',
        '2606:4700::/32',
        '2803:f800::/32',
        '2405:b500::/32',
        '2405:8100::/32',
        '2a06:98c0::/29',
        '2c0f:f248::/32',
    ];

    /**
     * Get the real client IP address, considering Cloudflare and Nginx proxy headers.
     *
     * Order of precedence:
     * 1. HTTP_CF_CONNECTING_IP (Cloudflare)
     * 3. HTTP_X_REAL_IP (set by Nginx)
     * 4. REMOTE_ADDR (fallback)
     *
     * @return string Real client IP address
     */
    public static function getRealIP()
    {
        $remoteAddr = $_SERVER['REMOTE_ADDR'] ?? '';
        if (!empty($_SERVER['HTTP_CF_CONNECTING_IP']) && self::isFromCloudflare($remoteAddr)) {
            return $_SERVER['HTTP_CF_CONNECTING_IP'];
        }
        if (!empty($_SERVER['HTTP_X_REAL_IP'])) {
            return $_SERVER['HTTP_X_REAL_IP'];
        }

        return $remoteAddr;
    }

    /**
     * Check if an IP is in a given CIDR range.
     */
    private static function ipInRange($ip, $cidr)
    {
        if (strpos($cidr, ':') !== false) {
            // IPv6
            return self::ipv6InRange($ip, $cidr);
        }
        // IPv4
        list($subnet, $mask) = explode('/', $cidr);

        return (ip2long($ip) & ~((1 << (32 - $mask)) - 1)) == ip2long($subnet);

    }

    /**
     * Check if an IPv6 address is in a given CIDR range.
     */
    private static function ipv6InRange($ip, $cidr)
    {
        list($subnet, $mask) = explode('/', $cidr);
        $ip_bin = inet_pton($ip);
        $subnet_bin = inet_pton($subnet);
        $mask = (int) $mask;
        $ip_bits = unpack('H*', $ip_bin)[1];
        $subnet_bits = unpack('H*', $subnet_bin)[1];
        $ip_bits = base_convert($ip_bits, 16, 2);
        $subnet_bits = base_convert($subnet_bits, 16, 2);

        return substr($ip_bits, 0, $mask) === substr($subnet_bits, 0, $mask);
    }

    /**
     * Check if an IP is from Cloudflare.
     */
    private static function isFromCloudflare($ip)
    {
        foreach (self::$cloudflareRanges as $range) {
            if (self::ipInRange($ip, $range)) {
                return true;
            }
        }

        return false;
    }
}
