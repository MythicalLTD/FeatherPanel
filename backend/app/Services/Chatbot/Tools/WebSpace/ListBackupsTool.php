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

class ListBackupsTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::BACKUP_READ);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        $daemon = FeatherQuilldClient::listWebSpaceBackups($access['webNode'], $access['uuid']);
        if (!$daemon['ok']) {
            return ['success' => false, 'error' => $daemon['error'] ?? 'Failed to list backups'];
        }
        $body = is_array($daemon['body'] ?? null) ? $daemon['body'] : [];
        $backups = $body['backups'] ?? $body['data'] ?? $body;
        if (!is_array($backups)) {
            $backups = [];
        }

        return ['success' => true, 'backups' => array_values($backups)];
    }

    public function getDescription(): string
    {
        return 'List WebSpace backups from the daemon.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID'];
    }
}
