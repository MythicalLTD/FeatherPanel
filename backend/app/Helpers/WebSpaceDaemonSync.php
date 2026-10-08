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

class WebSpaceDaemonSync
{
    /**
     * Sync panel WebSpace settings to FeatherQuilld and optionally recreate runtime when image changed.
     *
     * @param array<string, mixed> $webNode
     * @param array<string, mixed> $space hydrated webspace row
     * @param array<string, mixed> $previousSpace space row before update (for image diff)
     *
     * @return array{ok: bool, sync: array<string, mixed>, recreate?: array<string, mixed>, error?: string}
     */
    public static function syncAfterUpdate(array $webNode, array $space, array $previousSpace, ?array $previousPlateOverride = null): array
    {
        $sync = FeatherQuilldClient::syncWebSpace($webNode, (string) $space['uuid']);
        if (!$sync['ok']) {
            return [
                'ok' => false,
                'sync' => $sync,
                'error' => $sync['error'] ?? 'Daemon sync failed',
            ];
        }

        $previousImage = trim((string) ($previousSpace['image'] ?? ''));
        $newImage = trim((string) ($space['image'] ?? ''));
        $runtime = self::resolveRuntime($space);
        $previousPlateRef = $previousPlateOverride !== null
            ? self::plateRefFromRow($previousPlateOverride)
            : self::plateRefForSpace($previousSpace);
        $currentPlateRef = self::plateRefForSpace($space);

        $needRecreate = $runtime !== 'static' && $newImage !== '' && strcasecmp($newImage, $previousImage) !== 0;
        if (!$needRecreate && $runtime !== 'static' && self::plateRuntimeFieldsChanged($previousPlateRef, $currentPlateRef)) {
            $needRecreate = true;
        }
        if (!$needRecreate && $runtime === 'php' && self::addonRootsChanged($previousSpace, $space)) {
            $needRecreate = true;
        }
        if (!$needRecreate && $runtime !== 'static' && self::resourceLimitsChanged($previousSpace, $space)) {
            $needRecreate = true;
        }

        if ($needRecreate) {
            $recreate = FeatherQuilldClient::recreateRuntime($webNode, (string) $space['uuid']);
            if (!$recreate['ok']) {
                return [
                    'ok' => false,
                    'sync' => $sync,
                    'recreate' => $recreate,
                    'error' => 'Daemon sync succeeded but runtime recreate failed: ' . ($recreate['error'] ?? 'unknown'),
                ];
            }

            return ['ok' => true, 'sync' => $sync, 'recreate' => $recreate];
        }

        return ['ok' => true, 'sync' => $sync];
    }

    /**
     * @param array<string, mixed> $space
     */
    private static function resolveRuntime(array $space): string
    {
        $runtime = strtolower(trim((string) ($space['webplate_runtime'] ?? '')));
        if ($runtime === '' && !empty($space['webplate_id'])) {
            $plate = WebPlate::getById((int) $space['webplate_id']);
            $runtime = strtolower(trim((string) ($plate['runtime'] ?? 'static')));
        }

        return $runtime;
    }

    /**
     * @param array<string, mixed> $plate
     *
     * @return array{startup: string, container_port: int, docker_image: string}
     */
    private static function plateRefFromRow(array $plate): array
    {
        $ref = WebPlate::toDaemonRef($plate);

        return [
            'startup' => trim((string) ($ref['startup'] ?? '')),
            'container_port' => (int) ($ref['container_port'] ?? 0),
            'docker_image' => trim((string) ($ref['docker_image'] ?? '')),
        ];
    }

    /**
     * @param array<string, mixed> $space
     *
     * @return array{startup: string, container_port: int, docker_image: string}
     */
    private static function plateRefForSpace(array $space): array
    {
        $plateId = (int) ($space['webplate_id'] ?? 0);
        if ($plateId <= 0) {
            return ['startup' => '', 'container_port' => 0, 'docker_image' => ''];
        }

        $plate = WebPlate::getById($plateId);
        if (!$plate) {
            return ['startup' => '', 'container_port' => 0, 'docker_image' => ''];
        }

        return self::plateRefFromRow($plate);
    }

    /**
     * @param array{startup: string, container_port: int, docker_image: string} $previous
     * @param array{startup: string, container_port: int, docker_image: string} $current
     */
    private static function plateRuntimeFieldsChanged(array $previous, array $current): bool
    {
        if ($previous['startup'] !== $current['startup']) {
            return true;
        }
        if ($previous['container_port'] !== $current['container_port']) {
            return true;
        }

        return $previous['docker_image'] !== ''
            && $current['docker_image'] !== ''
            && strcasecmp($previous['docker_image'], $current['docker_image']) !== 0;
    }

    /**
     * @param array<string, mixed> $previous
     * @param array<string, mixed> $current
     */
    private static function addonRootsChanged(array $previous, array $current): bool
    {
        return self::routeRootSignature($previous) !== self::routeRootSignature($current);
    }

    /**
     * @param array<string, mixed> $previous
     * @param array<string, mixed> $current
     */
    private static function resourceLimitsChanged(array $previous, array $current): bool
    {
        $prevCpu = (float) ($previous['cpu_limit'] ?? 0);
        $currCpu = (float) ($current['cpu_limit'] ?? 0);
        $prevMem = (int) ($previous['memory_limit'] ?? 0);
        $currMem = (int) ($current['memory_limit'] ?? 0);

        return abs($prevCpu - $currCpu) > 0.0001 || $prevMem !== $currMem;
    }

    /**
     * @param array<string, mixed> $space
     */
    private static function routeRootSignature(array $space): string
    {
        $routes = $space['domain_routes'] ?? [];
        if (!is_array($routes)) {
            return '';
        }

        $parts = [];
        foreach ($routes as $route) {
            if (!is_array($route)) {
                continue;
            }
            $domain = strtolower(trim((string) ($route['domain'] ?? '')));
            $root = WebPlate::normalizeDocumentRoot($route['document_root'] ?? '');
            $parts[] = $domain . '=' . $root;
        }
        sort($parts);

        return implode('|', $parts);
    }
}
