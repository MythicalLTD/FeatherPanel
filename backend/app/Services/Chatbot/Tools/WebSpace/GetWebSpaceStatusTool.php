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

use App\Helpers\FeatherQuilldClient;
use App\Services\Chatbot\Tools\ToolInterface;

class GetWebSpaceStatusTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        $daemon = FeatherQuilldClient::getWebSpaceStatus($access['webNode'], $access['uuid']);
        if (!$daemon['ok']) {
            return [
                'success' => true,
                'status' => $access['space']['status'] ?? 'unknown',
                'daemon_reachable' => false,
                'note' => $daemon['error'] ?? 'Daemon did not answer',
            ];
        }
        $body = is_array($daemon['body'] ?? null) ? $daemon['body'] : [];

        return ['success' => true, 'daemon_reachable' => true, 'status' => $body];
    }

    public function getDescription(): string
    {
        return 'Get live daemon status for a WebSpace.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID'];
    }
}
