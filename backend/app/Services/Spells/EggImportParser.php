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

use Symfony\Component\Yaml\Yaml;
use Symfony\Component\Yaml\Exception\ParseException;

/**
 * Turns an egg file (Pterodactyl PTDL or Pelican PLCN, JSON or YAML) into the
 * PTDL_v2 shaped array the spell importer understands.
 *
 * Pelican fields a spell cannot hold (extra startup commands, tags, icon) are
 * dropped and reported as warnings instead of failing the import.
 */
class EggImportParser
{
    public const PTDL_VERSIONS = ['PTDL_v1', 'PTDL_v2'];
    public const PELICAN_VERSIONS = ['PLCN_v1', 'PLCN_v2', 'PLCN_v3'];

    /** Largest egg accepted from a URL (eggs with an embedded icon are ~100 KiB). */
    public const MAX_URL_BYTES = 2097152;
    /** Seconds allowed for downloading an egg from a URL. */
    public const URL_TIMEOUT = 10;
    public const MAX_URL_LENGTH = 2048;

    /**
     * Pelican config placeholders and the names FeatherPanel resolves for Wings.
     */
    private const PLACEHOLDER_MAP = [
        'server.allocations.default.ip' => 'server.build.default.ip',
        'server.allocations.default.port' => 'server.build.default.port',
        'server.build.memory_limit' => 'server.build.memory',
        'server.environment.' => 'server.build.env.',
    ];

    /**
     * Parse egg file content.
     *
     * @throws EggImportException
     *
     * @return array{data: array<string, mixed>, warnings: list<string>, format: string, syntax: string}
     */
    public static function parse(string $content): array
    {
        $content = (string) preg_replace('/^\xEF\xBB\xBF/', '', $content);
        $trimmed = ltrim($content);
        if ($trimmed === '') {
            throw new EggImportException('The egg file is empty.', 'INVALID_EGG');
        }

        if (str_starts_with($trimmed, '<')) {
            throw new EggImportException('This is a web page, not an egg file. Use the raw file link.', 'INVALID_EGG');
        }

        if (str_starts_with($trimmed, '{') || str_starts_with($trimmed, '[')) {
            $syntax = 'json';
            try {
                $data = json_decode($content, true, 512, JSON_THROW_ON_ERROR);
                $objects = json_decode($content, false, 512, JSON_THROW_ON_ERROR);
            } catch (\JsonException $e) {
                throw new EggImportException('Invalid JSON format', 'INVALID_JSON', $e);
            }
        } else {
            $syntax = 'yaml';
            try {
                $data = Yaml::parse($content);
                $objects = Yaml::parse($content, Yaml::PARSE_OBJECT_FOR_MAP);
            } catch (ParseException $e) {
                throw new EggImportException('Invalid YAML format: ' . $e->getMessage(), 'INVALID_YAML', $e);
            }
        }

        if (!is_array($data) || array_is_list($data)) {
            throw new EggImportException('Egg file must contain an object.', 'INVALID_EGG');
        }

        // Keep config objects as objects so `{}` does not turn into `[]`.
        if (is_object($objects) && isset($objects->config) && is_object($objects->config) && is_array($data['config'] ?? null)) {
            foreach (['files', 'startup', 'logs'] as $field) {
                if (isset($objects->config->{$field}) && is_object($objects->config->{$field})) {
                    $data['config'][$field] = $objects->config->{$field};
                }
            }
        }

        $version = is_array($data['meta'] ?? null) ? ($data['meta']['version'] ?? null) : null;
        $warnings = [];
        if ($version === null) {
            $format = isset($data['config']) || isset($data['scripts']) ? 'PTDL_v2' : 'featherpanel';
        } elseif (is_string($version) && in_array($version, self::PELICAN_VERSIONS, true)) {
            $format = $version;
            [$data, $warnings] = self::convertPelican($data);
        } elseif (is_string($version) && in_array($version, self::PTDL_VERSIONS, true)) {
            $format = $version;
        } else {
            throw new EggImportException(
                'Unsupported egg format version. Supported: ' . implode(', ', array_merge(self::PTDL_VERSIONS, self::PELICAN_VERSIONS)) . '.',
                'INVALID_EGG'
            );
        }

        if (isset($data['variables']) && is_array($data['variables'])) {
            $data['variables'] = self::normalizeVariables($data['variables']);
        }

        return ['data' => $data, 'warnings' => $warnings, 'format' => $format, 'syntax' => $syntax];
    }

    /**
     * Validate an egg URL and rewrite GitHub page links to their raw file.
     *
     * @throws EggImportException
     */
    public static function normalizeUrl(mixed $url): string
    {
        if (!is_string($url) || trim($url) === '' || strlen(trim($url)) > self::MAX_URL_LENGTH) {
            throw new EggImportException('A valid egg URL is required.', 'INVALID_EGG_URL');
        }
        $url = trim($url);
        $parts = parse_url($url);
        $scheme = strtolower((string) ($parts['scheme'] ?? ''));
        if (!is_array($parts) || !in_array($scheme, ['http', 'https'], true) || empty($parts['host'])) {
            throw new EggImportException('Only http and https egg URLs are supported.', 'INVALID_EGG_URL');
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new EggImportException('Egg URLs must not contain credentials.', 'INVALID_EGG_URL');
        }

        $url = (string) preg_replace('/#.*$/', '', $url);
        if (
            strtolower((string) $parts['host']) === 'github.com'
            && preg_match('#^/([^/]+)/([^/]+)/blob/(.+)$#', (string) ($parts['path'] ?? ''), $m)
        ) {
            $url = 'https://raw.githubusercontent.com/' . $m[1] . '/' . $m[2] . '/' . $m[3];
        }

        return $url;
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array{0: array<string, mixed>, 1: list<string>}
     */
    private static function convertPelican(array $data): array
    {
        $warnings = [];

        if (array_key_exists('startup_commands', $data)) {
            $commands = $data['startup_commands'];
            unset($data['startup_commands']);
            if (!is_array($commands)) {
                throw new EggImportException('Egg startup_commands must be a map of names to commands.', 'INVALID_EGG');
            }
            $commands = array_filter($commands, static fn ($command) => is_string($command) && trim($command) !== '');
            if ($commands !== []) {
                $defaultKey = array_key_first($commands);
                foreach (array_keys($commands) as $key) {
                    if (strcasecmp((string) $key, 'Default') === 0) {
                        $defaultKey = $key;
                        break;
                    }
                }
                $data['startup'] = $commands[$defaultKey];
                foreach ($commands as $key => $command) {
                    if ($key !== $defaultKey) {
                        $warnings[] = 'Startup command "' . $key . '" was not imported; spells keep a single startup command ("' . $defaultKey . '" was used).';
                    }
                }
            }
        }

        if (isset($data['config']['files'])) {
            $files = $data['config']['files'];
            if (is_array($files) || is_object($files)) {
                $files = json_encode($files, JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR);
            }
            if (is_string($files)) {
                $data['config']['files'] = str_replace(array_keys(self::PLACEHOLDER_MAP), array_values(self::PLACEHOLDER_MAP), $files);
            }
        }

        if (is_array($data['file_denylist'] ?? null)) {
            $data['file_denylist'] = array_values(array_filter($data['file_denylist'], static fn ($entry) => !is_string($entry) || trim($entry) !== ''));
        }

        $tags = is_array($data['tags'] ?? null) ? array_filter($data['tags'], 'is_string') : [];
        if ($tags !== []) {
            $warnings[] = 'Egg tags are not stored on spells: ' . implode(', ', $tags) . '.';
        }
        $icon = $data['icon'] ?? null;
        if (!is_string($icon) && is_string($data['image'] ?? null) && str_starts_with($data['image'], 'data:')) {
            $icon = $data['image'];
        }
        if (is_string($icon) && $icon !== '') {
            $warnings[] = 'The egg icon was not imported; set a spell banner instead.';
        }
        unset($data['tags'], $data['icon'], $data['image'], $data['exported_at']);

        $data['meta']['version'] = 'PTDL_v2';

        return [$data, $warnings];
    }

    /**
     * Order variables by Pelican `sort`, join rule lists and stringify YAML scalars.
     *
     * @param array<array-key, mixed> $variables
     *
     * @return array<array-key, mixed>
     */
    private static function normalizeVariables(array $variables): array
    {
        if (!array_is_list($variables)) {
            return $variables;
        }

        $hasSort = false;
        foreach ($variables as $variable) {
            if (is_array($variable) && is_numeric($variable['sort'] ?? null)) {
                $hasSort = true;
                break;
            }
        }
        if ($hasSort) {
            usort($variables, static function ($a, $b): int {
                $sa = is_array($a) && is_numeric($a['sort'] ?? null) ? (int) $a['sort'] : PHP_INT_MAX;
                $sb = is_array($b) && is_numeric($b['sort'] ?? null) ? (int) $b['sort'] : PHP_INT_MAX;

                return $sa <=> $sb;
            });
        }

        foreach ($variables as $index => $variable) {
            if (!is_array($variable)) {
                continue;
            }
            unset($variable['sort']);
            if (is_array($variable['rules'] ?? null)) {
                $variable['rules'] = implode('|', array_map('strval', array_filter($variable['rules'], 'is_scalar')));
            }
            if (is_bool($variable['default_value'] ?? null)) {
                $variable['default_value'] = $variable['default_value'] ? 'true' : 'false';
            } elseif (is_int($variable['default_value'] ?? null) || is_float($variable['default_value'] ?? null)) {
                $variable['default_value'] = (string) $variable['default_value'];
            }
            $variables[$index] = $variable;
        }

        return $variables;
    }
}
