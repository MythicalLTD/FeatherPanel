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

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Chat\Node;
use App\Chat\Task;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to delete a task from a schedule.
 */
class DeleteTaskTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Get server identifier
        $serverIdentifier = $params['server_uuid'] ?? $params['server_name'] ?? null;
        $server = null;

        // If no identifier provided, try to get server from pageContext
        if (!$serverIdentifier && isset($pageContext['server'])) {
            $contextServer = $pageContext['server'];
            $serverUuidShort = $contextServer['uuidShort'] ?? null;

            if ($serverUuidShort) {
                $server = Server::getServerByUuidShort($serverUuidShort);
            }
        }

        // Resolve server if identifier provided
        if ($serverIdentifier && !$server) {
            $server = Server::getServerByUuid($serverIdentifier);

            if (!$server) {
                $server = Server::getServerByUuidShort($serverIdentifier);
            }

            if (!$server) {
                $servers = Server::searchServers(
                    page: 1,
                    limit: 10,
                    search: $serverIdentifier,
                    ownerId: $user['id']
                );
                if (!empty($servers)) {
                    $server = $servers[0];
                }
            }
        }

        if (!$server) {
            return [
                'success' => false,
                'error' => 'Server not found. Please specify a server UUID or name, or ensure you are viewing a server page.',
                'action_type' => 'delete_task',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'delete_task',
            ];
        }

        // Get schedule identifier (ID or name)
        $scheduleId = $params['schedule_id'] ?? null;
        $scheduleName = $params['schedule_name'] ?? null;
        $schedule = null;

        if ($scheduleId) {
            $schedule = ServerSchedule::getScheduleById((int) $scheduleId);
        } elseif ($scheduleName) {
            // Search for schedule by name
            $schedules = ServerSchedule::searchSchedules(
                page: 1,
                limit: 10,
                search: $scheduleName,
                serverId: $server['id']
            );
            if (!empty($schedules)) {
                $schedule = $schedules[0];
            }
        }

        if (!$schedule) {
            return [
                'success' => false,
                'error' => 'Schedule not found. Please specify a schedule ID or name.',
                'action_type' => 'delete_task',
            ];
        }

        // Verify schedule belongs to this server
        if ($schedule['server_id'] != $server['id']) {
            return [
                'success' => false,
                'error' => 'Schedule not found on this server',
                'action_type' => 'delete_task',
            ];
        }

        // Get task ID
        $taskId = $params['task_id'] ?? null;
        if (!$taskId) {
            return [
                'success' => false,
                'error' => 'Task ID is required',
                'action_type' => 'delete_task',
            ];
        }

        // Get task
        $task = Task::getTaskById((int) $taskId);
        if (!$task) {
            return [
                'success' => false,
                'error' => 'Task not found',
                'action_type' => 'delete_task',
            ];
        }

        // Verify task belongs to this schedule
        if ($task['schedule_id'] != $schedule['id']) {
            return [
                'success' => false,
                'error' => 'Task not found in this schedule',
                'action_type' => 'delete_task',
            ];
        }

        // Delete task
        if (!Task::deleteTask((int) $taskId)) {
            return [
                'success' => false,
                'error' => 'Failed to delete task',
                'action_type' => 'delete_task',
            ];
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'task_deleted',
                'metadata' => json_encode([
                    'schedule_id' => $schedule['id'],
                    'schedule_name' => $schedule['name'],
                    'task_id' => $taskId,
                    'action' => $task['action'],
                    'sequence_id' => $task['sequence_id'],
                ]),
            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerTaskDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $schedule['id'],
                    'task_id' => $taskId,
                ]
            );
        }

        return [
            'success' => true,
            'action_type' => 'delete_task',
            'task_id' => $taskId,
            'schedule_id' => $schedule['id'],
            'schedule_name' => $schedule['name'],
            'action' => $task['action'],
            'sequence_id' => $task['sequence_id'],
            'server_name' => $server['name'],
            'message' => "Task #{$task['sequence_id']} ({$task['action']}) deleted successfully from schedule '{$schedule['name']}' on server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Delete a task from a schedule. Requires schedule ID or name and task ID.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'schedule_id' => 'Schedule ID (required if schedule_name not provided)',
            'schedule_name' => 'Schedule name (required if schedule_id not provided)',
            'task_id' => 'Task ID to delete (required)',
        ];
    }
}
