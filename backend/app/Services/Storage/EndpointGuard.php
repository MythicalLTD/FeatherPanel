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

namespace App\Services\Storage;

use App\App;
use App\Helpers\SafeUrlFetcher;

/**
 * SSRF guard for user-supplied storage endpoints.
 *
 * Endpoints must be https and every address the host resolves to must be public
 * (no loopback, private, link-local, CGNAT or reserved ranges). The check runs
 * again each time the endpoint is used and the resulting addresses are pinned
 * into cURL, so a DNS change after validation cannot redirect the panel.
 */
final class EndpointGuard
{
    /** Local development only: FEATHERPANEL_BYO_ALLOW_PRIVATE_ENDPOINTS=true lifts the https/public-IP rule. */
    public const ENV_ALLOW_PRIVATE = 'FEATHERPANEL_BYO_ALLOW_PRIVATE_ENDPOINTS';

    /** @var (callable(string): list<string>)|null test seam for DNS */
    public static $resolver;

    public static function allowPrivate(): bool
    {
        $v = App::env(self::ENV_ALLOW_PRIVATE, '') ?? '';

        return in_array(strtolower((string) $v), ['1', 'true', 'yes'], true);
    }

    /**
     * Validate the URL shape (no DNS). Used when a destination is saved.
     */
    public static function assertShape(string $url): void
    {
        $parts = parse_url($url);
        if (!is_array($parts) || empty($parts['host']) || empty($parts['scheme'])) {
            throw new StorageException('Endpoint must be a full URL such as https://s3.example.com', 'ENDPOINT_INVALID', 422);
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new StorageException('Endpoint must not contain credentials', 'ENDPOINT_INVALID', 422);
        }
        $scheme = strtolower((string) $parts['scheme']);
        if ($scheme !== 'https' && !($scheme === 'http' && self::allowPrivate())) {
            throw new StorageException('Endpoint must use https', 'ENDPOINT_NOT_HTTPS', 422);
        }
    }

    /**
     * Resolve the hosts and return Guzzle options pinning them to the checked addresses.
     *
     * @param list<string> $urls every URL whose host the client will contact
     *
     * @return array<string, mixed>
     */
    public static function pin(array $urls): array
    {
        $resolve = [];
        foreach ($urls as $url) {
            self::assertShape($url);
            $host = trim((string) parse_url($url, PHP_URL_HOST), '[]');
            $scheme = strtolower((string) parse_url($url, PHP_URL_SCHEME));
            $port = (int) (parse_url($url, PHP_URL_PORT) ?: ($scheme === 'https' ? 443 : 80));
            $ips = self::$resolver !== null ? (self::$resolver)($host) : SafeUrlFetcher::resolveHost($host);
            if ($ips === []) {
                throw new StorageException('Endpoint host ' . $host . ' does not resolve', 'ENDPOINT_UNRESOLVABLE', 422);
            }
            foreach ($ips as $ip) {
                if (!SafeUrlFetcher::isPublicIp($ip) && !self::allowPrivate()) {
                    throw new StorageException('Endpoint ' . $host . ' resolves to a private or reserved address', 'ENDPOINT_PRIVATE_ADDRESS', 422);
                }
            }
            if (filter_var($host, FILTER_VALIDATE_IP) === false) {
                $resolve[] = $host . ':' . $port . ':' . implode(',', array_map(
                    static fn (string $ip): string => str_contains($ip, ':') ? '[' . $ip . ']' : $ip,
                    $ips
                ));
            }
        }

        return $resolve === [] ? [] : ['curl' => [CURLOPT_RESOLVE => array_values(array_unique($resolve))]];
    }
}
