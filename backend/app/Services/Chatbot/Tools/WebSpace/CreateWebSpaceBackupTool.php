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

class CreateWebSpaceBackupTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::BACKUP_CREATE);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        try {
            \App\Helpers\WebSpaceDatabaseDumpService::writeDumpsToWebSpace($access['space']);
        } catch (\Throwable $e) {
            // best-effort dumps
        }
        $daemon = FeatherQuilldClient::createWebSpaceBackup($access['webNode'], $access['uuid'], [
            'stop_during_backup' => !empty($params['stop_during_backup']),
            'async' => true,
        ]);
        if (!$daemon['ok'] && $daemon['status'] !== 202) {
            return ['success' => false, 'error' => $daemon['error'] ?? 'Backup failed'];
        }
        $body = is_array($daemon['body'] ?? null) ? $daemon['body'] : [];

        return [
            'success' => true,
            'action_type' => 'webspace_create_backup',
            'message' => 'Backup started',
            'uuid_short' => $access['uuidShort'],
            'name' => $access['space']['name'] ?? null,
            'job_id' => $body['job_id'] ?? null,
        ];
    }

    public function getDescription(): string
    {
        return 'Start a WebSpace backup on the daemon.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID', 'stop_during_backup' => 'Optional bool'];
    }
}
