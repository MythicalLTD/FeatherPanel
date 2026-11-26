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

namespace App\Services\Chatbot\Tools\WebSpace;

use App\Chat\WebSpace;
use App\Helpers\WebSpaceDaemonSync;
use App\Helpers\WebSpaceWafSettings;
use App\WebSpaceSubuserPermissions;
use App\Services\Chatbot\Tools\ToolInterface;

class SetWafModeTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        $mode = strtolower(trim((string) ($params['mode'] ?? '')));
        if (!in_array($mode, WebSpaceWafSettings::MODES, true)) {
            return ['success' => false, 'error' => 'mode must be one of: off, detect, block'];
        }

        $space = $access['space'];
        $stored = is_array($space['waf_settings'] ?? null) ? $space['waf_settings'] : [];
        $current = WebSpaceWafSettings::withLegacyMode($stored, !empty($space['waf_enabled']));
        $applied = WebSpaceWafSettings::apply($current, ['mode' => $mode]);
        if (($applied['error'] ?? null) !== null) {
            return ['success' => false, 'error' => $applied['error']];
        }
        $next = $applied['settings'];
        $fields = [
            'waf_settings' => array_intersect_key($next, array_flip(WebSpaceWafSettings::JSON_KEYS)),
            'waf_enabled' => $next['mode'] !== 'off' ? 1 : 0,
        ];

        if (!WebSpace::update((string) $space['uuid'], $fields)) {
            return ['success' => false, 'error' => 'Failed to save WAF settings'];
        }

        $updated = WebSpace::getByUuid((string) $space['uuid']) ?? $space;
        if ($access['webNode']) {
            $daemon = WebSpaceDaemonSync::syncAfterUpdate($access['webNode'], $updated, $space);
            if (!($daemon['ok'] ?? false)) {
                return [
                    'success' => false,
                    'error' => 'WAF mode saved but web node sync failed: ' . ($daemon['error'] ?? 'unknown'),
                ];
            }
        }

        return [
            'success' => true,
            'action_type' => 'webspace_set_waf_mode',
            'message' => "WAF mode set to {$mode}",
            'mode' => $mode,
            'uuid_short' => $access['uuidShort'],
        ];
    }

    public function getDescription(): string
    {
        return 'Set WebSpace WAF mode to off, detect, or block.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID', 'mode' => 'off|detect|block'];
    }
}
