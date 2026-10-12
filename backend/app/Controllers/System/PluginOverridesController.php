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

class PluginOverridesController
{
    #[OA\Get(
        path: '/api/system/plugin-overrides',
        summary: 'List plugin UI overrides',
        description: 'Aggregate Frontend/overrides.json from installed plugins (hide/replace/actions).',
        tags: ['System'],
        responses: [
            new OA\Response(response: 200, description: 'Overrides retrieved successfully'),
        ]
    )]
    public function index(Request $request): Response
    {
        $hide = [];
        $replace = [];
        $actions = [];

        foreach (PluginFrontendScanner::listPluginIdentifiers() as $plugin) {
            $data = PluginFrontendScanner::readJsonFile($plugin, 'Frontend/overrides.json');
            if ($data === null) {
                continue;
            }

            if (isset($data['hide']) && is_array($data['hide'])) {
                foreach ($data['hide'] as $slotId) {
                    if (is_string($slotId) && $this->isValidSlotId($slotId)) {
                        $hide[] = [
                            'slot' => $slotId,
                            'plugin' => $plugin,
                        ];
                    }
                }
            }

            if (isset($data['replace']) && is_array($data['replace'])) {
                foreach ($data['replace'] as $entry) {
                    if (!is_array($entry)) {
                        continue;
                    }
                    $normalized = $this->normalizeReplace($plugin, $entry);
                    if ($normalized !== null) {
                        $replace[] = $normalized;
                    }
                }
            }

            if (isset($data['actions']) && is_array($data['actions'])) {
                foreach ($data['actions'] as $entry) {
                    if (!is_array($entry)) {
                        continue;
                    }
                    $normalized = $this->normalizeAction($plugin, $entry);
                    if ($normalized !== null) {
                        $actions[] = $normalized;
                    }
                }
            }
        }

        // Deduplicate hide by slot (first plugin wins).
        $seenHide = [];
        $hideUnique = [];
        foreach ($hide as $row) {
            if (isset($seenHide[$row['slot']])) {
                continue;
            }
            $seenHide[$row['slot']] = true;
            $hideUnique[] = $row;
        }

        // Last replace for a slot wins (later plugins override).
        $replaceBySlot = [];
        foreach ($replace as $row) {
            $replaceBySlot[$row['slot']] = $row;
        }

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                PluginUiEvent::onOverridesRetrieved(),
                [
                    'hide' => $hideUnique,
                    'replace' => array_values($replaceBySlot),
                    'actions' => $actions,
                ]
            );
        }

        return ApiResponse::success(
            [
                'hide' => $hideUnique,
                'replace' => array_values($replaceBySlot),
                'actions' => $actions,
            ],
            'Providing plugin overrides',
            200
        );
    }

    private function isValidSlotId(string $id): bool
    {
        return (bool) preg_match('/^[a-zA-Z0-9][a-zA-Z0-9._\-:]*$/', $id);
    }

    /**
     * @param array<string, mixed> $entry
     *
     * @return array<string, mixed>|null
     */
    private function normalizeReplace(string $plugin, array $entry): ?array
    {
        $slot = trim((string) ($entry['slot'] ?? ''));
        if ($slot === '' || !$this->isValidSlotId($slot)) {
            return null;
        }

        $out = [
            'slot' => $slot,
            'plugin' => $plugin,
            'pluginName' => PluginFrontendScanner::pluginDisplayName($plugin),
            'component' => null,
            'remote' => null,
            'hide' => false,
        ];

        if (!empty($entry['hide'])) {
            $out['hide'] = true;

            return $out;
        }

        if (isset($entry['component']) && is_string($entry['component']) && $entry['component'] !== '') {
            $comp = ltrim(str_replace('\\', '/', $entry['component']), '/');
            if (!str_contains($comp, '..')) {
                $out['component'] = $comp;
                $out['componentUrl'] = PluginFrontendScanner::componentPublicUrl($plugin, $comp);
            }
        }

        if (isset($entry['remote']) && is_string($entry['remote']) && $entry['remote'] !== '') {
            $remote = ltrim(str_replace('\\', '/', $entry['remote']), '/');
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

    /**
     * @param array<string, mixed> $entry
     *
     * @return array<string, mixed>|null
     */
    private function normalizeAction(string $plugin, array $entry): ?array
    {
        $slot = trim((string) ($entry['slot'] ?? ''));
        if ($slot === '' || !$this->isValidSlotId($slot)) {
            return null;
        }

        $label = trim((string) ($entry['label'] ?? ''));
        if ($label === '') {
            return null;
        }

        $out = [
            'id' => (string) ($entry['id'] ?? ($plugin . '-' . preg_replace('/[^a-zA-Z0-9]+/', '-', strtolower($label)))),
            'slot' => $slot,
            'plugin' => $plugin,
            'pluginName' => PluginFrontendScanner::pluginDisplayName($plugin),
            'label' => $label,
            'icon' => is_string($entry['icon'] ?? null) ? $entry['icon'] : null,
            'priority' => (int) ($entry['priority'] ?? 0),
            'component' => null,
            'remote' => null,
            'js' => is_string($entry['js'] ?? null) ? $entry['js'] : null,
        ];

        if (isset($entry['component']) && is_string($entry['component']) && $entry['component'] !== '') {
            $comp = ltrim(str_replace('\\', '/', $entry['component']), '/');
            if (!str_contains($comp, '..')) {
                $out['component'] = $comp;
                $out['componentUrl'] = PluginFrontendScanner::componentPublicUrl($plugin, $comp);
            }
        }

        if (isset($entry['remote']) && is_string($entry['remote']) && $entry['remote'] !== '') {
            $remote = ltrim(str_replace('\\', '/', $entry['remote']), '/');
            if (!str_contains($remote, '..')) {
                $out['remote'] = $remote;
                $out['remoteUrl'] = PluginFrontendScanner::componentPublicUrl($plugin, $remote);
            }
        }

        return $out;
    }
}
