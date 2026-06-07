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
 * Builds Wings base URLs respecting the node's reverse-proxy configuration.
 */
class WingsUrlHelper
{
    /**
     * Whether the node is configured to sit behind a reverse proxy (nginx, etc.).
     */
    public static function isBehindProxy(array $node): bool
    {
        return filter_var($node['behind_proxy'] ?? false, FILTER_VALIDATE_BOOLEAN);
    }

    /**
     * Build the Wings API base URL for a node row.
     */
    public static function buildFromNode(array $node): string
    {
        return self::buildBaseUrl(
            (string) ($node['scheme'] ?? 'http'),
            (string) ($node['fqdn'] ?? 'localhost'),
            (int) ($node['daemonListen'] ?? 8443),
            self::isBehindProxy($node),
        );
    }

    /**
     * Build the Wings API base URL.
     *
     * When behind a reverse proxy, omit the port so standard 443/80 is used.
     */
    public static function buildBaseUrl(string $scheme, string $host, int $port, bool $behindProxy = false): string
    {
        $host = rtrim($host, '/');

        if ($behindProxy) {
            return "{$scheme}://{$host}";
        }

        return "{$scheme}://{$host}:{$port}";
    }

    /**
     * Convert an HTTP(S) Wings base URL to the matching WS(S) base URL.
     */
    public static function toWebSocketBaseUrl(string $httpBaseUrl): string
    {
        return str_replace(['https://', 'http://'], ['wss://', 'ws://'], $httpBaseUrl);
    }
}
