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

namespace App\Services\Spells;

class SpellConfiguration
{
    /** Convert egg file parsers into Wings configuration without dropping parser options. */
    public static function files(array | object $configs, callable $replace): array
    {
        $files = [];
        foreach ($configs as $file => $config) {
            if (is_object($config)) {
                $config = get_object_vars($config);
            }
            if (
                !is_string($file) || !is_array($config)
                || (!is_array($config['find'] ?? null) && !is_object($config['find'] ?? null))
            ) {
                continue;
            }

            $entry = array_merge($config, ['file' => $file, 'replace' => []]);
            $entry['parser'] = $config['parser'] ?? 'properties';
            unset($entry['find']);
            foreach ($config['find'] as $match => $replacement) {
                if (is_object($replacement) || (is_array($replacement) && !array_is_list($replacement))) {
                    foreach ($replacement as $condition => $value) {
                        $entry['replace'][] = [
                            'match' => (string) $match,
                            'if_value' => (string) $condition,
                            'replace_with' => self::replaceValue($value, $replace),
                        ];
                    }
                } else {
                    $entry['replace'][] = [
                        'match' => (string) $match,
                        'replace_with' => self::replaceValue($replacement, $replace),
                    ];
                }
            }
            $files[] = $entry;
        }

        return $files;
    }

    public static function placeholders(string $value, array $server, array $allocation, array $environment): string
    {
        $structure = [
            'uuid' => $server['uuid'] ?? '',
            'build' => array_intersect_key($server, array_flip(['memory', 'swap', 'io', 'cpu', 'threads', 'disk', 'image', 'oom_disabled']))
                + ['default' => $allocation, 'env' => $environment],
            'service' => ['skip_scripts' => $server['skip_scripts'] ?? false],
            'suspended' => $server['suspended'] ?? false,
        ];

        return preg_replace_callback('/{{([\w.-]+)}}/', static function (array $match) use ($structure, $environment): string {
            $key = $match[1];
            if ($key === 'config.docker.interface') {
                return '{{config.docker.network.interface}}';
            }
            if (str_starts_with($key, 'env.')) {
                $replacement = $environment[substr($key, 4)] ?? '';
            } elseif (str_starts_with($key, 'server.')) {
                $replacement = $structure;
                foreach (explode('.', substr($key, 7)) as $segment) {
                    $replacement = is_array($replacement) ? ($replacement[$segment] ?? '') : '';
                }
            } else {
                return $match[0];
            }

            return is_scalar($replacement) ? (string) $replacement : '';
        }, $value) ?? $value;
    }

    public static function stop(mixed $stop): array
    {
        if (
            is_array($stop) && in_array($stop['type'] ?? null, ['command', 'signal'], true)
            && (is_string($stop['value'] ?? null) || is_numeric($stop['value'] ?? null))
        ) {
            return ['type' => $stop['type'], 'value' => $stop['value']];
        }

        $stop = is_string($stop) ? $stop : 'stop';

        return str_starts_with($stop, '^')
            ? ['type' => 'signal', 'value' => strtoupper(substr($stop, 1))]
            : ['type' => 'command', 'value' => $stop];
    }

    private static function replaceValue(mixed $value, callable $replace): mixed
    {
        if (is_object($value)) {
            $value = clone $value;
            foreach ($value as $key => $item) {
                $value->{$key} = self::replaceValue($item, $replace);
            }

            return $value;
        }
        if (is_array($value)) {
            foreach ($value as $key => $item) {
                $value[$key] = self::replaceValue($item, $replace);
            }

            return $value;
        }

        return is_string($value) ? $replace($value) : $value;
    }
}
