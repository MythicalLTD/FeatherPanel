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

use App\Chat\WebPlate;

/**
 * Runtime-aware catalog for WebSpace installable apps and container mount paths.
 *
 * Mirrors FeatherQuilld WebSpaceRuntime.MountTarget.
 */
final class WebSpaceAppsCatalog
{
    public const APP_WORDPRESS = 'wordpress';
    public const APP_GIT_DEPLOY = 'git-deploy';
    public const APP_LARAVEL = 'laravel';
    public const APP_JOOMLA = 'joomla';
    public const APP_DRUPAL = 'drupal';
    public const APP_PRESTASHOP = 'prestashop';
    public const APP_MAGENTO = 'magento';
    public const APP_GHOST = 'ghost';
    public const APP_NODE_STARTER = 'node-starter';
    public const APP_PYTHON_STARTER = 'python-starter';

    /** @var array<string, list<string>> */
    private const APPS_BY_RUNTIME = [
        'static' => [],
        'php' => [self::APP_WORDPRESS, self::APP_GIT_DEPLOY, self::APP_LARAVEL, self::APP_JOOMLA, self::APP_DRUPAL, self::APP_PRESTASHOP, self::APP_MAGENTO],
        'node' => [self::APP_GIT_DEPLOY, self::APP_NODE_STARTER, self::APP_GHOST],
        'python' => [self::APP_GIT_DEPLOY, self::APP_PYTHON_STARTER],
        'custom' => [self::APP_GIT_DEPLOY],
    ];

    /**
     * @return list<string>
     */
    public static function availableForRuntime(string $runtime): array
    {
        $key = strtolower(trim($runtime));

        return self::APPS_BY_RUNTIME[$key] ?? [];
    }

    public static function supportsApp(string $runtime, string $app): bool
    {
        return in_array($app, self::availableForRuntime($runtime), true);
    }

    public static function hasAnyApps(string $runtime): bool
    {
        return self::availableForRuntime($runtime) !== [];
    }

    /**
     * Container mount root for a runtime (matches FeatherQuilld).
     */
    public static function mountPath(string $runtime): string
    {
        return strtolower(trim($runtime)) === 'php' ? '/var/www/html' : '/home/container';
    }

    /**
     * Absolute container path for a user directory under the runtime mount.
     */
    public static function containerPath(string $runtime, string $directory): string
    {
        $mount = self::mountPath($runtime);
        $rel = trim($directory, '/');
        if ($rel === '') {
            return $mount;
        }

        return $mount . '/' . $rel;
    }

    /**
     * Resolve runtime from a hydrated WebSpace row.
     */
    public static function resolveRuntime(array $space): string
    {
        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime !== '') {
            return $runtime;
        }
        $plate = WebPlate::getById((int) ($space['webplate_id'] ?? 0));

        return strtolower(trim((string) ($plate['runtime'] ?? 'static')));
    }

    /**
     * @return list<string>
     */
    public static function availableForSpace(array $space): array
    {
        return self::availableForRuntime(self::resolveRuntime($space));
    }

    /**
     * @param array<string, mixed> $space
     */
    public static function requireApp(array $space, string $app): void
    {
        $runtime = self::resolveRuntime($space);
        if (!self::supportsApp($runtime, $app)) {
            throw new \InvalidArgumentException(
                sprintf('App "%s" is not available for %s WebSpaces', $app, $runtime === '' ? 'unknown' : $runtime),
            );
        }
    }
}
