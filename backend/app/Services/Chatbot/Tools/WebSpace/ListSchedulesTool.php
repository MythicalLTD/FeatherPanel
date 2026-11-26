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
use App\WebSpaceSubuserPermissions;
use App\Services\Chatbot\Tools\ToolInterface;

class ListSchedulesTool implements ToolInterface
{
    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        $access = WebSpaceToolAccess::resolve($params, $user, $pageContext, WebSpaceSubuserPermissions::SCHEDULE_READ);
        if (!$access['ok']) {
            return ['success' => false, 'error' => $access['error']];
        }
        $schedules = WebSpaceSchedule::listByWebspaceId((int) $access['space']['id']);
        $out = [];
        foreach ($schedules as $schedule) {
            $out[] = [
                'id' => (int) ($schedule['id'] ?? 0),
                'name' => $schedule['name'] ?? null,
                'cron' => $schedule['cron_expression'] ?? $schedule['cron'] ?? null,
                'is_active' => !empty($schedule['is_active'] ?? $schedule['enabled'] ?? true),
                'has_deploy_hook' => !empty($schedule['deploy_token_hash'] ?? null),
            ];
        }

        return ['success' => true, 'schedules' => $out];
    }

    public function getDescription(): string
    {
        return 'List cron schedules and whether they have a deploy hook.';
    }

    public function getParameters(): array
    {
        return ['uuid_short' => 'Optional WebSpace short UUID'];
    }
}
