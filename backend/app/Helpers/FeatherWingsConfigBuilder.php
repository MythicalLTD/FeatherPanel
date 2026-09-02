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

use Symfony\Component\Yaml\Yaml;

/**
 * FeatherWings config: minimal join/bootstrap YAML + runtime YAML fetched from the panel.
 */
class FeatherWingsConfigBuilder
{
    public const DEFAULT_PORT = 8443;

    /**
     * Bootstrap config embedded in --join-data (panel URL, credentials, API port).
     *
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    public static function buildJoinConfigArray(array $node, string $panelUrl): array
    {
        $port = (int) ($node['daemonListen'] ?? self::DEFAULT_PORT);

        return [
            'uuid' => $node['uuid'] ?? '',
            'token_id' => $node['daemon_token_id'] ?? '',
            'token' => $node['daemon_token'] ?? '',
            'api' => [
                'port' => $port > 0 ? $port : self::DEFAULT_PORT,
            ],
            'remote' => rtrim($panelUrl, '/'),
        ];
    }

    /**
     * @param array<string, mixed> $node
     */
    public static function buildJoinConfigYaml(array $node, string $panelUrl): string
    {
        return Yaml::dump(
            self::buildJoinConfigArray($node, $panelUrl),
            3,
            2,
            Yaml::DUMP_EMPTY_ARRAY_AS_SEQUENCE | Yaml::DUMP_OBJECT_AS_MAP,
        );
    }
}
