<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Helpers\ServerGateway;
use App\Plugins\Events\Events\ServerEvent;

/**
 * Tool to update a schedule for a server.
 */
class UpdateScheduleTool implements ToolInterface
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
                'action_type' => 'update_schedule',
            ];
        }

        // Verify user has access
        if (!ServerGateway::canUserAccessServer($user['uuid'], $server['uuid'])) {
            return [
                'success' => false,
                'error' => 'Access denied to server',
                'action_type' => 'update_schedule',
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
                'action_type' => 'update_schedule',
            ];
        }

        // Verify schedule belongs to this server
        if ($schedule['server_id'] != $server['id']) {
            return [
                'success' => false,
                'error' => 'Schedule not found on this server',
                'action_type' => 'update_schedule',
            ];
        }

        // Prepare update data
        $updateData = [];

        if (isset($params['name'])) {
            $updateData['name'] = trim($params['name']);
        }

        // Handle cron expression updates
        $cronFields = ['cron_day_of_week', 'cron_month', 'cron_day_of_month', 'cron_hour', 'cron_minute'];
        $cronUpdated = false;
        foreach ($cronFields as $field) {
            if (isset($params[$field])) {
                $updateData[$field] = $params[$field];
                $cronUpdated = true;
            }
        }

        // Validate cron expression if any cron fields are being updated
        if ($cronUpdated) {
            $dayOfWeek = $updateData['cron_day_of_week'] ?? $schedule['cron_day_of_week'];
            $month = $updateData['cron_month'] ?? $schedule['cron_month'];
            $dayOfMonth = $updateData['cron_day_of_month'] ?? $schedule['cron_day_of_month'];
            $hour = $updateData['cron_hour'] ?? $schedule['cron_hour'];
            $minute = $updateData['cron_minute'] ?? $schedule['cron_minute'];

            if (!ServerSchedule::validateCronExpression($dayOfWeek, $month, $dayOfMonth, $hour, $minute)) {
                return [
                    'success' => false,
                    'error' => 'Invalid cron expression. Please check your cron values.',
                    'action_type' => 'update_schedule',
                ];
            }

            // Calculate new next run time
            $updateData['next_run_at'] = ServerSchedule::calculateNextRunTime($dayOfWeek, $month, $dayOfMonth, $hour, $minute);
        }

        if (isset($params['is_active'])) {
            $updateData['is_active'] = (bool) $params['is_active'] ? 1 : 0;
        }

        if (isset($params['only_when_online'])) {
            $updateData['only_when_online'] = (bool) $params['only_when_online'] ? 1 : 0;
        }

        if (empty($updateData)) {
            return [
                'success' => false,
                'error' => 'No fields to update. Please provide at least one field to update.',
                'action_type' => 'update_schedule',
            ];
        }

        // Update schedule
        if (!ServerSchedule::updateSchedule($schedule['id'], $updateData)) {
            return [
                'success' => false,
                'error' => 'Failed to update schedule',
                'action_type' => 'update_schedule',
            ];
        }

        // Get updated schedule
        $updatedSchedule = ServerSchedule::getScheduleById($schedule['id']);

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if ($node) {
            ServerActivity::createActivity([
                'server_id' => $server['id'],
                'node_id' => $server['node_id'],
                'user_id' => $user['id'],
                'event' => 'schedule_updated',
                'metadata' => json_encode([
                    'schedule_id' => $schedule['id'],
                    'schedule_name' => $updatedSchedule['name'],
                    'updated_fields' => array_keys($updateData),
                ]),
            ]);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerScheduleUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $updatedSchedule['id'],
                ]
            );
        }

        $cronExpression = sprintf(
            '%s %s %s %s %s',
            $updatedSchedule['cron_minute'],
            $updatedSchedule['cron_hour'],
            $updatedSchedule['cron_day_of_month'],
            $updatedSchedule['cron_month'],
            $updatedSchedule['cron_day_of_week']
        );

        return [
            'success' => true,
            'action_type' => 'update_schedule',
            'schedule_id' => $updatedSchedule['id'],
            'schedule_name' => $updatedSchedule['name'],
            'cron_expression' => $cronExpression,
            'next_run_at' => $updatedSchedule['next_run_at'],
            'is_active' => (bool) $updatedSchedule['is_active'],
            'server_name' => $server['name'],
            'message' => "Schedule '{$updatedSchedule['name']}' updated successfully for server '{$server['name']}'",
        ];
    }

    public function getDescription(): string
    {
        return 'Update a schedule for a server. Can update name, cron expression, active status, and other settings. Requires schedule ID or name and at least one field to update.';
    }

    public function getParameters(): array
    {
        return [
            'server_uuid' => 'Server UUID (optional, can use server_name instead)',
            'server_name' => 'Server name (optional, can use server_uuid instead)',
            'schedule_id' => 'Schedule ID (required if schedule_name not provided)',
            'schedule_name' => 'Schedule name (required if schedule_id not provided)',
            'name' => 'New schedule name (optional)',
            'cron_day_of_week' => 'Cron day of week (0-7, where 0 and 7 are Sunday) (optional)',
            'cron_month' => 'Cron month (1-12 or *) (optional)',
            'cron_day_of_month' => 'Cron day of month (1-31 or *) (optional)',
            'cron_hour' => 'Cron hour (0-23 or *) (optional)',
            'cron_minute' => 'Cron minute (0-59 or *) (optional)',
            'is_active' => 'Whether schedule is active (optional, boolean)',
            'only_when_online' => 'Only run when server is online (optional, boolean)',
        ];
    }
}
