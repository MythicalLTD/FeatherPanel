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
use App\Config\ConfigInterface;

/**
 * Tool to create a schedule for a server.
 */
class CreateScheduleTool implements ToolInterface
{
    private $app;

    public function __construct()
    {
        $this->app = App::getInstance(true);
    }

    public function execute(array $params, array $user, array $pageContext = []): mixed
    {
        // Check if schedules are enabled
        $config = $this->app->getConfig();
        if ($config->getSetting(ConfigInterface::SERVER_ALLOW_SCHEDULES, 'true') === 'false') {
            return [
                'success' => false,
                'error' => 'Schedules are disabled on this host. Please contact your administrator to enable this feature.',
                'action_type' => 'create_schedule',
            ];
        }

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
                'action_type' => 'create_schedule',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'create_schedule',
            ];
        }

        // Validate required cron fields
        $required = ['name', 'cron_day_of_week', 'cron_month', 'cron_day_of_month', 'cron_hour', 'cron_minute'];
        foreach ($required as $field) {
            if (!isset($params[$field]) || trim($params[$field]) === '') {
                return [
                    'success' => false,
                    'error' => "Missing required field: {$field}",
                    'action_type' => 'create_schedule',
                ];
            }
        }

        // Validate cron expression
        if (
            !ServerSchedule::validateCronExpression(
                $params['cron_day_of_week'],
                $params['cron_month'],
                $params['cron_day_of_month'],
                $params['cron_hour'],
                $params['cron_minute']
            )
        ) {
            return [
                'success' => false,
                'error' => 'Invalid cron expression. Please check your cron values.',
                'action_type' => 'create_schedule',
            ];
        }

        // Calculate next run time
        $nextRunAt = ServerSchedule::calculateNextRunTime(
            $params['cron_day_of_week'],
            $params['cron_month'],
            $params['cron_day_of_month'],
            $params['cron_hour'],
            $params['cron_minute']
        );

        // Create schedule data
        $scheduleData = [
            'server_id' => $server['id'],
            'name' => $params['name'],
            'cron_day_of_week' => $params['cron_day_of_week'],
            'cron_month' => $params['cron_month'],
            'cron_day_of_month' => $params['cron_day_of_month'],
            'cron_hour' => $params['cron_hour'],
            'cron_minute' => $params['cron_minute'],
            'is_active' => isset($params['is_active']) ? ((bool) $params['is_active'] ? 1 : 0) : 1,
            'is_processing' => 0,
            'only_when_online' => isset($params['only_when_online']) ? ((bool) $params['only_when_online'] ? 1 : 0) : 0,
            'next_run_at' => $nextRunAt,
        ];

        $scheduleId = ServerSchedule::createSchedule($scheduleData);
        if (!$scheduleId) {
            return [
                'success' => false,
                'error' => 'Failed to create schedule',
                'action_type' => 'create_schedule',
            ];
        }

        // Create tasks if provided
        $createdTasks = [];
        $tasksError = null;

        // Check if tasks are provided (can be single task or array of tasks)
        if (isset($params['tasks'])) {
            $tasksInput = $params['tasks'];

            // Normalize to array: if it's already an array, use it; if it's a single object, wrap it
            if (is_array($tasksInput)) {
                // Check if it's an associative array (single task object) or indexed array (multiple tasks)
                if (isset($tasksInput[0]) && is_array($tasksInput[0])) {
                    // Indexed array of tasks
                    $tasks = $tasksInput;
                } elseif (isset($tasksInput['action'])) {
                    // Single task object
                    $tasks = [$tasksInput];
                } else {
                    // Empty or invalid array
                    $tasks = [];
                }
            } else {
                // Not an array, skip
                $tasks = [];
            }

            foreach ($tasks as $taskData) {
                if (!is_array($taskData)) {
                    $tasksError = 'Each task must be an object with action and optional payload';
                    continue;
                }

                // Validate task action
                if (!isset($taskData['action']) || trim((string) $taskData['action']) === '') {
                    $tasksError = 'Task action is required for each task';
                    continue;
                }

                $action = trim((string) $taskData['action']);
                if (!Task::validateAction($action)) {
                    $tasksError = "Invalid task action: {$action}. Valid actions are: power, backup, command, restart, kill, install, update, start, stop";
                    continue;
                }

                // Validate payload for actions that require it
                $payload = '';
                if (isset($taskData['payload'])) {
                    if (is_string($taskData['payload'])) {
                        $payload = trim($taskData['payload']);
                    } elseif (is_scalar($taskData['payload'])) {
                        $payload = (string) $taskData['payload'];
                    }
                }

                // Power action requires payload (start, stop, restart, kill)
                if ($action === 'power' && $payload === '') {
                    $tasksError = "Task action 'power' requires a payload (start, stop, restart, or kill)";
                    continue;
                }

                // Command action requires payload
                if ($action === 'command' && $payload === '') {
                    $tasksError = "Task action 'command' requires a payload (the command to execute)";
                    continue;
                }

                // For start, stop, restart, kill - they can be used directly or via power action
                // If used directly, no payload needed
                // If user wants to use power action format, they can do {"action": "power", "payload": "start"}

                // Get next sequence ID
                $nextSequenceId = Task::getNextSequenceId($scheduleId);

                // Create task
                $taskCreateData = [
                    'schedule_id' => $scheduleId,
                    'sequence_id' => $nextSequenceId,
                    'action' => $action,
                    'payload' => $payload,
                    'time_offset' => isset($taskData['time_offset']) ? (int) $taskData['time_offset'] : 0,
                    'is_queued' => 0,
                    'continue_on_failure' => isset($taskData['continue_on_failure']) ? ((bool) $taskData['continue_on_failure'] ? 1 : 0) : 0,
                ];

                $taskId = Task::createTask($taskCreateData);
                if ($taskId) {
                    $createdTasks[] = [
                        'id' => $taskId,
                        'action' => $action,
                        'sequence_id' => $nextSequenceId,
                    ];
                } else {
                    $tasksError = "Failed to create task with action '{$action}'. Please check the task data.";
                }
            }
        } else {
            // If no tasks provided, try to infer from schedule name or create a default command task
            // This handles cases where user says "create a schedule to run command X"
            if (isset($params['command']) && trim($params['command']) !== '') {
                // User wants to run a command
                $nextSequenceId = Task::getNextSequenceId($scheduleId);
                $taskCreateData = [
                    'schedule_id' => $scheduleId,
                    'sequence_id' => $nextSequenceId,
                    'action' => 'command',
                    'payload' => trim($params['command']),
                    'time_offset' => 0,
                    'is_queued' => 0,
                    'continue_on_failure' => 0,
                ];

                $taskId = Task::createTask($taskCreateData);
                if ($taskId) {
                    $createdTasks[] = [
                        'id' => $taskId,
                        'action' => 'command',
                        'sequence_id' => $nextSequenceId,
                    ];
                }
            }
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'schedule_created',
                'metadata' => json_encode([
                    'schedule_id' => $scheduleId,
                    'schedule_name' => $params['name'],
                    'tasks_created' => count($createdTasks),
                ]),
            ]);
        }

        $cronExpression = sprintf(
            '%s %s %s %s %s',
            $params['cron_minute'],
            $params['cron_hour'],
            $params['cron_day_of_month'],
            $params['cron_month'],
            $params['cron_day_of_week']
        );

        $message = "Schedule '{$params['name']}' created successfully for server '{$server['name']}'. Next run: {$nextRunAt}";
        if (!empty($createdTasks)) {
            $message .= '. Created ' . count($createdTasks) . ' task(s): ' . implode(', ', array_map(fn ($t) => "{$t['action']} (sequence #{$t['sequence_id']})", $createdTasks));
        } else {
            $message .= '. ⚠️ Warning: No tasks were created. The schedule will not execute anything until tasks are added.';
        }

        if ($tasksError) {
            $message .= " Error creating tasks: {$tasksError}";
        }

        return [
            'success' => true,
            'action_type' => 'create_schedule',
            'schedule_id' => $scheduleId,
            'schedule_name' => $params['name'],
            'cron_expression' => $cronExpression,
            'next_run_at' => $nextRunAt,
            'is_active' => (bool) $scheduleData['is_active'],
            'server_name' => $server['name'],
            'tasks_created' => count($createdTasks),
            'tasks' => $createdTasks,
            'message' => $message,
        ];
    }

    public function getDescription(): string
    {
        return 'Create a scheduled task for a server. Requires cron expression components (day of week, month, day of month, hour, minute) and a schedule name. Can optionally include tasks to execute. If a command is specified, a command task will be created automatically. Returns schedule details including next run time and created tasks.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'name' => 'Schedule name (required)',
            'cron_day_of_week' => 'Cron day of week (0-7, where 0 and 7 are Sunday) (required)',
            'cron_month' => 'Cron month (1-12 or *) (required)',
            'cron_day_of_month' => 'Cron day of month (1-31 or *) (required)',
            'cron_hour' => 'Cron hour (0-23 or *) (required)',
            'cron_minute' => 'Cron minute (0-59 or *) (required)',
            'is_active' => 'Whether schedule is active (optional, default: true)',
            'only_when_online' => 'Only run when server is online (optional, default: false)',
            'command' => 'Command to execute (optional, creates a command task automatically)',
            'tasks' => 'Array of tasks to create (optional). Each task object can have: action (required: power, backup, command, restart, kill, install, update, start, stop), payload (required for power/command actions, optional for others), time_offset (optional, integer in minutes, default: 0 - delay before executing this task), continue_on_failure (optional, boolean, default: false - whether to continue executing subsequent tasks if this one fails). For power actions, you can use either {"action": "power", "payload": "start"} or {"action": "start"} directly.',
        ];
    }
}
