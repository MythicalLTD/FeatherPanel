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

use App\Chat\Node;
use App\Chat\Allocation;
use App\Chat\ServerVariable;
use App\Chat\ServerCustomVariable;

/**
 * Builds container environment maps and replaces {{env.KEY}} placeholders.
 */
class ServerEnvPlaceholderHelper
{
    /**
     * Build the same environment map Wings receives for the server container.
     *
     * @param array<string, mixed> $server
     * @param array<string, mixed>|null $node
     * @param array<string, mixed>|null $allocation
     *
     * @return array<string, string|int>
     */
    public static function buildEnvironment(array $server, ?array $node = null, ?array $allocation = null): array
    {
        $serverId = (int) ($server['id'] ?? 0);
        if ($serverId <= 0) {
            return [];
        }

        if ($node === null && isset($server['node_id'])) {
            $node = Node::getNodeById((int) $server['node_id']) ?: null;
        }

        if ($allocation === null && isset($server['allocation_id'])) {
            $allocation = Allocation::getAllocationById((int) $server['allocation_id']) ?: null;
        }

        $environment = [];

        foreach (ServerVariable::getServerVariablesWithDetails($serverId) as $variable) {
            if (!isset($variable['env_variable'])) {
                continue;
            }
            $environment[(string) $variable['env_variable']] = $variable['variable_value'] ?? '';
        }

        foreach (ServerCustomVariable::getEnvironmentVariablesByServerId($serverId) as $envVariable => $value) {
            $environment[(string) $envVariable] = $value;
        }

        $environment['P_SERVER_LOCATION'] = $node['location_id'] ?? '';
        $environment['P_SERVER_UUID'] = $server['uuid'] ?? '';
        $environment['P_SERVER_UUID_SHORT'] = $server['uuidShort'] ?? '';
        $environment['P_SERVER_ID'] = $serverId;
        $environment['P_SERVER_ALLOCATION_LIMIT'] = $server['allocation_limit'] ?? 0;
        $environment['SERVER_MEMORY'] = ((int) ($server['memory'] ?? 0)) > 0 ? $server['memory'] : 1024;

        if (is_array($allocation)) {
            $environment['SERVER_IP'] = $allocation['ip'] ?? '';
            $environment['SERVER_PORT'] = $allocation['port'] ?? '';
        }

        return $environment;
    }

    /**
     * Recursively replace {{env.KEY}} / {{server.build.env.KEY}} in strings.
     *
     * @param array<string, mixed> $environment
     * @param array<string, mixed> $server
     * @param array<string, mixed>|null $allocation
     */
    public static function replaceInValue(mixed $value, array $environment, array $server = [], ?array $allocation = null): mixed
    {
        if (is_string($value)) {
            return self::replaceInString($value, $environment, $server, $allocation);
        }

        if (!is_array($value)) {
            return $value;
        }

        $out = [];
        foreach ($value as $key => $item) {
            $out[$key] = self::replaceInValue($item, $environment, $server, $allocation);
        }

        return $out;
    }

    /**
     * Replace environment placeholders in a single string.
     *
     * @param array<string, mixed> $environment
     * @param array<string, mixed> $server
     * @param array<string, mixed>|null $allocation
     */
    public static function replaceInString(string $value, array $environment, array $server = [], ?array $allocation = null): string
    {
        if ($value === '' || !str_contains($value, '{{')) {
            return $value;
        }

        $memoryValue = (int) ($server['memory'] ?? 0);
        $memoryForPlaceholders = $memoryValue > 0 ? $memoryValue : 1024;

        $static = [];
        if (is_array($allocation)) {
            $static['{{server.build.default.port}}'] = (string) ($allocation['port'] ?? '');
            $static['{{server.build.default.ip}}'] = (string) ($allocation['ip'] ?? '');
            $static['{{server.build.env.SERVER_PORT}}'] = (string) ($allocation['port'] ?? '');
            $static['{{env.SERVER_PORT}}'] = (string) ($allocation['port'] ?? '');
            $static['{{server.build.env.SERVER_IP}}'] = (string) ($allocation['ip'] ?? '');
            $static['{{env.SERVER_IP}}'] = (string) ($allocation['ip'] ?? '');
        }
        $static['{{server.build.memory}}'] = (string) $memoryForPlaceholders;
        $static['{{server.build.env.SERVER_MEMORY}}'] = (string) $memoryForPlaceholders;
        $static['{{env.SERVER_MEMORY}}'] = (string) $memoryForPlaceholders;

        foreach ($static as $placeholder => $replacement) {
            if (str_contains($value, $placeholder)) {
                $value = str_replace($placeholder, $replacement, $value);
            }
        }

        foreach ($environment as $envKey => $envValue) {
            if (!is_string($envKey)) {
                continue;
            }
            if (!is_string($envValue) && !is_numeric($envValue)) {
                continue;
            }

            $envValueStr = (string) $envValue;
            if ($envKey === 'SERVER_MEMORY' && (int) $envValue === 0) {
                $envValueStr = (string) $memoryForPlaceholders;
            }

            foreach (['{{server.build.env.' . $envKey . '}}', '{{env.' . $envKey . '}}'] as $ph) {
                if (str_contains($value, $ph)) {
                    $value = str_replace($ph, $envValueStr, $value);
                }
            }
        }

        return $value;
    }
}
