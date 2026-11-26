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

use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Services\Chatbot\Tools\ToolInterface;

class RenewSslTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::SETTINGS_UPDATE);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        $daemon = FeatherQuilldClient::renewWebSpaceSsl($access['webNode'], $access['uuid']);
        if (!$daemon['ok']) {
            return ['success' => false, 'error' => $daemon['error'] ?? 'SSL renew failed'];
        }

        return [
            'success' => true,
            'action_type' => 'webspace_renew_ssl',
            'message' => 'SSL renewal requested',
            'uuid_short' => $access['uuidShort'],
            'name' => $access['space']['name'] ?? null,
            'result' => is_array($daemon['body'] ?? null) ? $daemon['body'] : null,
        ];
    }

    public function getDescription(): string
    {
        return "Renew Let's Encrypt SSL for a WebSpace.";
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID'];
    }
}
