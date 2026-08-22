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

use App\App;
use App\Config\ConfigInterface;
use Symfony\Component\Yaml\Yaml;

/**
 * FeatherQuilld config: minimal join/bootstrap YAML + runtime YAML fetched from the panel.
 */
class FeatherQuilldConfigBuilder
{
    public const DEFAULT_PORT = 8989;

    /** Panel route for runtime config (FeatherQuilld only — not /api/remote/config). */
    public const REMOTE_CONFIG_PATH = '/api/quilld-remote/config';

    /** Panel route for panel health checks from FeatherQuilld. */
    public const REMOTE_HEALTH_PATH = '/api/quilld-remote/health';

    private const DEFAULT_UPLOAD = 100;

    private const DEFAULT_SCHEME = 'https';

    private const DEFAULT_REMOTE_TIMEOUT = 30;

    private const DEFAULT_REMOTE_RETRY_LIMIT = 10;

    private const DEFAULT_SFTP_KEY_ALGORITHM = 'ssh-ed25519';

    private const DEFAULT_SFTP_PORT = 2222;

    /**
     * Bootstrap config embedded in --join-data (panel URL, credentials, headers, API port).
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
            'remote' => self::buildRemoteSection($node, $panelUrl),
        ];
    }

    /**
     * Runtime config served at GET /api/quilld-remote/config after the daemon joins.
     *
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    public static function buildRuntimeConfigArray(array $node, string $panelUrl): array
    {
        $config = [
            'remote' => self::buildRemoteSection($node, $panelUrl),
        ];

        $api = self::buildApiSection($node, includePort: false);
        if ($api !== []) {
            $config['api'] = $api;
        }

        $system = self::buildSystemSection($node);
        if ($system !== []) {
            $config['system'] = $system;
        }

        $plugins = self::buildPluginsSection($node);
        if ($plugins !== []) {
            $config['plugins'] = $plugins;
        }

        $sftp = self::buildSftpSection($node);
        if ($sftp !== []) {
            $config['sftp'] = $sftp;
        }

        $overrides = self::parseOverrides($node['quilldConfigOverrides'] ?? null);
        if ($overrides !== []) {
            $config = self::mergeConfig($config, $overrides);
        }

        return $config;
    }

    /**
     * Full merged view for admin inspection.
     *
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    public static function buildConfigArray(array $node, string $panelUrl): array
    {
        return self::mergeConfig(
            self::buildJoinConfigArray($node, $panelUrl),
            self::buildRuntimeConfigArray($node, $panelUrl),
        );
    }

    /**
     * @param array<string, mixed> $node
     */
    public static function buildJoinConfigYaml(array $node, string $panelUrl): string
    {
        return self::dumpYaml(self::buildJoinConfigArray($node, $panelUrl));
    }

    /**
     * @param array<string, mixed> $node
     */
    public static function buildRuntimeConfigYaml(array $node, string $panelUrl): string
    {
        return self::dumpYaml(self::buildRuntimeConfigArray($node, $panelUrl));
    }

    /**
     * @param array<string, mixed> $node
     */
    public static function buildConfigYaml(array $node, string $panelUrl): string
    {
        return self::dumpYaml(self::buildConfigArray($node, $panelUrl));
    }

    /**
     * @param array<string, mixed> $config
     */
    private static function dumpYaml(array $config): string
    {
        return Yaml::dump(
            $config,
            6,
            2,
            Yaml::DUMP_EMPTY_ARRAY_AS_SEQUENCE | Yaml::DUMP_OBJECT_AS_MAP,
        );
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    private static function buildApiSection(array $node, bool $includePort = true): array
    {
        $api = [];
        $port = (int) ($node['daemonListen'] ?? self::DEFAULT_PORT);

        if ($includePort && $port !== self::DEFAULT_PORT) {
            $api['port'] = $port;
        }

        $scheme = (string) ($node['scheme'] ?? self::DEFAULT_SCHEME);
        if ($scheme !== self::DEFAULT_SCHEME) {
            $api['ssl'] = [
                'enabled' => false,
                'cert' => 'cert.pem',
                'key' => 'key.pem',
            ];
        }

        $uploadLimit = (int) ($node['upload_size'] ?? self::DEFAULT_UPLOAD);
        if ($uploadLimit !== self::DEFAULT_UPLOAD) {
            $api['upload_limit'] = $uploadLimit;
        }

        return $api;
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    private static function buildSystemSection(array $node): array
    {
        $system = [];
        $defaultBase = rtrim(FeatherQuilldCapabilities::defaults()['daemon_base'], '/');
        $base = rtrim((string) ($node['daemonBase'] ?? $defaultBase), '/');

        if ($base !== $defaultBase) {
            $system['root_directory'] = $base;
        }

        if (self::hasExplicitPath($node, 'websitesPath')) {
            $system['data'] = self::normalizePath((string) $node['websitesPath']);
        }

        if (self::hasExplicitPath($node, 'backupsPath')) {
            $system['backup_directory'] = self::normalizePath((string) $node['backupsPath']);
        }

        return $system;
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    private static function buildPluginsSection(array $node): array
    {
        if (!self::hasExplicitPath($node, 'addonsPath')) {
            return [];
        }

        return [
            'directory' => self::normalizePath((string) $node['addonsPath']),
        ];
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    private static function buildRemoteSection(array $node, string $panelUrl): array
    {
        $remote = [
            'panel' => rtrim($panelUrl, '/'),
            'config_path' => self::REMOTE_CONFIG_PATH,
            'health_path' => self::REMOTE_HEALTH_PATH,
            'app_name' => self::resolvePanelAppName(),
            'timeout' => (int) ($node['remoteTimeout'] ?? self::DEFAULT_REMOTE_TIMEOUT),
            'retry_limit' => (int) ($node['remoteRetryLimit'] ?? self::DEFAULT_REMOTE_RETRY_LIMIT),
        ];

        $headers = WebNodeCustomHeaders::toConfigMap(
            is_string($node['remoteCustomHeaders'] ?? null) ? $node['remoteCustomHeaders'] : null,
        );
        $remote['custom_headers'] = $headers !== [] ? $headers : new \stdClass();

        return $remote;
    }

    /**
     * @param array<string, mixed> $node
     *
     * @return array<string, mixed>
     */
    private static function buildSftpSection(array $node): array
    {
        $enabled = filter_var($node['sftpEnabled'] ?? true, FILTER_VALIDATE_BOOLEAN);
        $keyAlgorithm = (string) ($node['sftpKeyAlgorithm'] ?? self::DEFAULT_SFTP_KEY_ALGORITHM);
        $port = (int) ($node['sftpPort'] ?? self::DEFAULT_SFTP_PORT);
        $disablePassword = filter_var($node['sftpDisablePasswordAuth'] ?? false, FILTER_VALIDATE_BOOLEAN);

        $sftp = [
            'enabled' => $enabled,
        ];

        if ($enabled) {
            $sftp['port'] = $port > 0 ? $port : self::DEFAULT_SFTP_PORT;

            if ($keyAlgorithm !== '') {
                $sftp['key_algorithm'] = $keyAlgorithm;
            }
        }

        if ($disablePassword) {
            $sftp['disable_password_auth'] = true;
        }

        return $sftp;
    }

    private static function resolvePanelAppName(): string
    {
        try {
            $name = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
            $name = is_string($name) ? trim($name) : '';

            return $name !== '' ? $name : 'FeatherPanel';
        } catch (\Throwable) {
            return 'FeatherPanel';
        }
    }

    /**
     * @param array<string, mixed> $node
     */
    private static function hasExplicitPath(array $node, string $field): bool
    {
        if (!isset($node[$field]) || !is_string($node[$field])) {
            return false;
        }

        return trim($node[$field]) !== '';
    }

    private static function normalizePath(string $path): string
    {
        return rtrim(trim($path), '/');
    }

    /**
     * @return array<string, mixed>
     */
    private static function parseOverrides(mixed $raw): array
    {
        if (!is_string($raw) || trim($raw) === '') {
            return [];
        }

        $decoded = json_decode(trim($raw), true);

        return is_array($decoded) ? $decoded : [];
    }

    /**
     * @param array<string, mixed> $base
     * @param array<string, mixed> $overrides
     *
     * @return array<string, mixed>
     */
    private static function mergeConfig(array $base, array $overrides): array
    {
        foreach ($overrides as $key => $value) {
            if (
                is_array($value)
                && isset($base[$key])
                && is_array($base[$key])
                && self::isAssociativeArray($value)
                && self::isAssociativeArray($base[$key])
            ) {
                $base[$key] = self::mergeConfig($base[$key], $value);
            } else {
                $base[$key] = $value;
            }
        }

        return $base;
    }

    /**
     * @param array<mixed> $array
     */
    private static function isAssociativeArray(array $array): bool
    {
        if ($array === []) {
            return true;
        }

        return array_keys($array) !== range(0, count($array) - 1);
    }
}
