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

use App\Helpers\WebSpaceWafSettings;
use App\WebSpaceSubuserPermissions;
use App\Services\Chatbot\Tools\ToolInterface;

class GetWafSettingsTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::SETTINGS_READ);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        $stored = is_array($access['space']['waf_settings'] ?? null) ? $access['space']['waf_settings'] : [];
        $settings = WebSpaceWafSettings::withLegacyMode($stored, !empty($access['space']['waf_enabled']));

        return [
            'success' => true,
            'settings' => [
                'mode' => $settings['mode'] ?? null,
                'rate_limit' => $settings['rate_limit'] ?? null,
                'anti_bot' => $settings['anti_bot'] ?? null,
                'engine' => $settings['engine'] ?? null,
                'geo' => $settings['geo'] ?? null,
                'headers' => $settings['headers'] ?? null,
            ],
        ];
    }

    public function getDescription(): string
    {
        return 'Get effective WAF settings (mode, rate limit, engine categories) for a WebSpace.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID'];
    }
}
