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

namespace App\Controllers\System;

use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\PluginFrontendScanner;
use App\Plugins\Events\Events\PluginUiEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PluginUiPacksController
{
    #[OA\Get(
        path: '/api/system/plugin-ui-packs',
        summary: 'List plugin UI packs',
        description: 'Aggregate Frontend/ui.json layout takeover packs from installed plugins.',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'UI packs retrieved successfully'),
        ]
    )]
    public function index(Request $request): Response
    {
        $packs = [];

        foreach (PluginFrontendScanner::listPluginIdentifiers() as $plugin) {
            $data = PluginFrontendScanner::readJsonFile($plugin, 'Frontend/ui.json');
            if ($data === null) {
                continue;
            }

            $items = [];
            if (isset($data['packs']) && is_array($data['packs'])) {
                $items = $data['packs'];
            } elseif (isset($data['id']) || isset($data['shell']) || isset($data['pages'])) {
                $items = [$data];
            }

            foreach ($items as $item) {
                if (!is_array($item)) {
                    continue;
                }
                $normalized = $this->normalizePack($plugin, $item);
                if ($normalized !== null) {
                    $packs[] = $normalized;
                }
            }
        }

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                PluginUiEvent::onUiPacksRetrieved(),
                ['packs' => $packs]
            );
        }

        return ApiResponse::success(
            ['packs' => $packs],
            'Providing plugin UI packs',
            200
        );
    }

    /**
     * @param array<string, mixed> $item
     *
     * @return array<string, mixed>|null
     */
    private function normalizePack(string $plugin, array $item): ?array
    {
        $packId = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string) ($item['id'] ?? 'default')) ?: 'default';
        $name = trim((string) ($item['name'] ?? $packId));
        if ($name === '') {
            $name = $packId;
        }

        $theme = null;
        if (isset($item['theme']) && is_string($item['theme']) && $item['theme'] !== '') {
            // Allow either bare pack id (resolved against this plugin) or plugin:id
            $theme = str_contains($item['theme'], ':')
                ? $item['theme']
                : ($plugin . ':' . $item['theme']);
        }

        $shellReplace = [];
        if (isset($item['shell']['replace']) && is_array($item['shell']['replace'])) {
            foreach ($item['shell']['replace'] as $slot => $spec) {
                if (!is_string($slot) || !$this->isValidSlotId($slot)) {
                    continue;
                }
                $normalized = $this->normalizeSlotSpec($plugin, $slot, is_array($spec) ? $spec : []);
                if ($normalized !== null) {
                    $shellReplace[$slot] = $normalized;
                }
            }
        }

        $pages = [];
        if (isset($item['pages']) && is_array($item['pages'])) {
            foreach ($item['pages'] as $page) {
                if (!is_array($page)) {
                    continue;
                }
                $match = trim((string) ($page['match'] ?? ''));
                if ($match === '' || !$this->isSafeRouteMatch($match)) {
                    continue;
                }
                $replace = null;
                if (isset($page['replace']) && is_array($page['replace'])) {
                    $replace = $this->normalizeSlotSpec($plugin, 'page.' . $match, $page['replace']);
                }
                if ($replace === null && empty($page['hide'])) {
                    continue;
                }
                $pages[] = [
                    'match' => $match,
                    'hide' => !empty($page['hide']),
                    'replace' => $replace,
                ];
            }
        }

        $hide = [];
        if (isset($item['hide']) && is_array($item['hide'])) {
            foreach ($item['hide'] as $slotId) {
                if (is_string($slotId) && $this->isValidSlotId($slotId)) {
                    $hide[] = $slotId;
                }
            }
        }

        $actions = [];
        if (isset($item['actions']) && is_array($item['actions'])) {
            foreach ($item['actions'] as $action) {
                if (!is_array($action)) {
                    continue;
                }
                $slot = trim((string) ($action['slot'] ?? ''));
                $label = trim((string) ($action['label'] ?? ''));
                if ($slot === '' || $label === '' || !$this->isValidSlotId($slot)) {
                    continue;
                }
                $row = [
                    'id' => (string) ($action['id'] ?? ($plugin . '-' . $packId . '-' . preg_replace('/[^a-zA-Z0-9]+/', '-', strtolower($label)))),
                    'slot' => $slot,
                    'label' => $label,
                    'icon' => is_string($action['icon'] ?? null) ? $action['icon'] : null,
                    'priority' => (int) ($action['priority'] ?? 0),
                    'plugin' => $plugin,
                    'component' => null,
                    'remote' => null,
                    'js' => is_string($action['js'] ?? null) ? $action['js'] : null,
                ];
                if (isset($action['component']) && is_string($action['component'])) {
                    $comp = ltrim(str_replace('\\', '/', $action['component']), '/');
                    if (!str_contains($comp, '..')) {
                        $row['component'] = $comp;
                        $row['componentUrl'] = PluginFrontendScanner::componentPublicUrl($plugin, $comp);
                    }
                }
                if (isset($action['remote']) && is_string($action['remote'])) {
                    $remote = ltrim(str_replace('\\', '/', $action['remote']), '/');
                    if (!str_contains($remote, '..')) {
                        $row['remote'] = $remote;
                        $row['remoteUrl'] = PluginFrontendScanner::componentPublicUrl($plugin, $remote);
                    }
                }
                $actions[] = $row;
            }
        }

        return [
            'id' => $plugin . ':' . $packId,
            'packId' => $packId,
            'plugin' => $plugin,
            'pluginName' => PluginFrontendScanner::pluginDisplayName($plugin),
            'name' => $name,
            'theme' => $theme,
            'shell' => ['replace' => $shellReplace],
            'pages' => $pages,
            'hide' => $hide,
            'actions' => $actions,
        ];
    }

    /**
     * @param array<string, mixed> $spec
     *
     * @return array<string, mixed>|null
     */
    private function normalizeSlotSpec(string $plugin, string $slot, array $spec): ?array
    {
        $out = [
            'slot' => $slot,
            'plugin' => $plugin,
            'hide' => !empty($spec['hide']),
            'component' => null,
            'remote' => null,
        ];

        if ($out['hide']) {
            return $out;
        }

        if (isset($spec['component']) && is_string($spec['component']) && $spec['component'] !== '') {
            $comp = ltrim(str_replace('\\', '/', $spec['component']), '/');
            if (!str_contains($comp, '..')) {
                $out['component'] = $comp;
                $out['componentUrl'] = PluginFrontendScanner::componentPublicUrl($plugin, $comp);
            }
        }

        if (isset($spec['remote']) && is_string($spec['remote']) && $spec['remote'] !== '') {
            $remote = ltrim(str_replace('\\', '/', $spec['remote']), '/');
            if (!str_contains($remote, '..')) {
                $out['remote'] = $remote;
                $out['remoteUrl'] = PluginFrontendScanner::componentPublicUrl($plugin, $remote);
            }
        }

        if ($out['component'] === null && $out['remote'] === null) {
            return null;
        }

        return $out;
    }

    private function isValidSlotId(string $id): bool
    {
        return (bool) preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._\-:]*$/', $id);
    }

    /**
     * Allow path patterns like /dashboard or /server/:uuidShort/console.
     * Reject auth-critical and API prefixes.
     */
    private function isSafeRouteMatch(string $match): bool
    {
        if (!str_starts_with($match, '/')) {
            return false;
        }
        if (str_contains($match, '..') || str_contains($match, '//')) {
            return false;
        }

        $blocked = ['/api', '/auth', '/login', '/register', '/logout', '/oidc', '/sso'];
        foreach ($blocked as $prefix) {
            if ($match === $prefix || str_starts_with($match, $prefix . '/')) {
                return false;
            }
        }

        return (bool) preg_match('#^/[a-zA-Z0-9_/:.\-]+$#', $match);
    }
}
