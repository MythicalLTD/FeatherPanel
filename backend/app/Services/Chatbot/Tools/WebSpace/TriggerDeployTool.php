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

use App\Chat\WebSpaceSchedule;
use App\Helpers\FeatherQuilldClient;
use App\WebSpaceSubuserPermissions;
use App\Services\Chatbot\Tools\ToolInterface;

class TriggerDeployTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::SCHEDULE_UPDATE);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        if (!$access['webNode']) {
            return ['success' => false, 'error' => 'Web node not found.'];
        }
        $scheduleId = (int) ($params['schedule_id'] ?? 0);
        if ($scheduleId <= 0) {
            return ['success' => false, 'error' => 'schedule_id is required.'];
        }
        $schedule = WebSpaceSchedule::getById($scheduleId);
        if (!$schedule || (int) ($schedule['webspace_id'] ?? 0) !== (int) $access['space']['id']) {
            return ['success' => false, 'error' => 'Schedule not found on this WebSpace.'];
        }
        $tasks = WebSpaceSchedule::listTasks($scheduleId);
        if ($tasks === []) {
            return ['success' => false, 'error' => 'Schedule has no tasks to run.'];
        }
        $daemon = FeatherQuilldClient::triggerWebSpaceSchedule($access['webNode'], $access['uuid'], $scheduleId);
        if (!($daemon['ok'] ?? false)) {
            return ['success' => false, 'error' => $daemon['error'] ?? 'Failed to trigger schedule'];
        }

        return [
            'success' => true,
            'action_type' => 'webspace_trigger_deploy',
            'message' => 'Schedule execution started',
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'] ?? null,
            'uuid_short' => $access['uuidShort'],
        ];
    }

    public function getDescription(): string
    {
        return 'Execute a WebSpace schedule now (push-to-deploy / cron run).';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID', 'schedule_id' => 'Schedule ID to execute'];
    }
}
