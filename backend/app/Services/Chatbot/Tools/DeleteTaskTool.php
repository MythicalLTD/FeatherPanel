<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Services\Chatbot\Tools;

use App\App;
use App\Chat\Node;
use App\Chat\Task;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Helpers\ServerGateway;

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
