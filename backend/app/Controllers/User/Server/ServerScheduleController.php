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

namespace App\Controllers\User\Server;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\SubuserPermissions;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\ServerScheduleEvent;

#[OA\Schema(
    schema: 'ServerSchedule',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Schedule ID'),
        new OA\Property(property: 'server_id', type: 'integer', description: 'Server ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Schedule name'),
        new OA\Property(property: 'cron_day_of_week', type: 'string', description: 'Cron day of week expression'),
        new OA\Property(property: 'cron_month', type: 'string', description: 'Cron month expression'),
        new OA\Property(property: 'cron_day_of_month', type: 'string', description: 'Cron day of month expression'),
        new OA\Property(property: 'cron_hour', type: 'string', description: 'Cron hour expression'),
        new OA\Property(property: 'cron_minute', type: 'string', description: 'Cron minute expression'),
        new OA\Property(property: 'is_active', type: 'boolean', description: 'Whether schedule is active'),
        new OA\Property(property: 'is_processing', type: 'boolean', description: 'Whether schedule is currently processing'),
        new OA\Property(property: 'only_when_online', type: 'boolean', description: 'Whether to run only when server is online'),
        new OA\Property(property: 'next_run_at', type: 'string', format: 'date-time', description: 'Next scheduled run time'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'SchedulePagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'last_page', type: 'integer', description: 'Last page number'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
#[OA\Schema(
    schema: 'ScheduleCreateRequest',
    type: 'object',
    required: ['name', 'cron_day_of_week', 'cron_month', 'cron_day_of_month', 'cron_hour', 'cron_minute'],
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Schedule name'),
        new OA\Property(property: 'cron_day_of_week', type: 'string', description: 'Cron day of week expression'),
        new OA\Property(property: 'cron_month', type: 'string', description: 'Cron month expression'),
        new OA\Property(property: 'cron_day_of_month', type: 'string', description: 'Cron day of month expression'),
        new OA\Property(property: 'cron_hour', type: 'string', description: 'Cron hour expression'),
        new OA\Property(property: 'cron_minute', type: 'string', description: 'Cron minute expression'),
        new OA\Property(property: 'is_active', type: 'boolean', nullable: true, description: 'Whether schedule is active', default: true),
        new OA\Property(property: 'only_when_online', type: 'boolean', nullable: true, description: 'Whether to run only when server is online', default: false),
    ]
)]
#[OA\Schema(
    schema: 'ScheduleCreateResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Created schedule ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Schedule name'),
        new OA\Property(property: 'next_run_at', type: 'string', format: 'date-time', description: 'Next scheduled run time'),
    ]
)]
#[OA\Schema(
    schema: 'ScheduleUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', nullable: true, description: 'Schedule name'),
        new OA\Property(property: 'cron_day_of_week', type: 'string', nullable: true, description: 'Cron day of week expression'),
        new OA\Property(property: 'cron_month', type: 'string', nullable: true, description: 'Cron month expression'),
        new OA\Property(property: 'cron_day_of_month', type: 'string', nullable: true, description: 'Cron day of month expression'),
        new OA\Property(property: 'cron_hour', type: 'string', nullable: true, description: 'Cron hour expression'),
        new OA\Property(property: 'cron_minute', type: 'string', nullable: true, description: 'Cron minute expression'),
        new OA\Property(property: 'is_active', type: 'boolean', nullable: true, description: 'Whether schedule is active'),
        new OA\Property(property: 'only_when_online', type: 'boolean', nullable: true, description: 'Whether to run only when server is online'),
    ]
)]
#[OA\Schema(
    schema: 'ScheduleToggleResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'is_active', type: 'boolean', description: 'New active status'),
        new OA\Property(property: 'status', type: 'string', enum: ['enabled', 'disabled'], description: 'Status description'),
    ]
)]
class ServerScheduleController
{
    use CheckSubuserPermissionsTrait;

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/schedules',
        summary: 'Get server schedules',
        description: 'Retrieve all schedules for a specific server that the user owns or has subuser access to.',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'per_page',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 20)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter schedules by name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Server schedules retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerSchedule')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/SchedulePagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve schedules'),
        ]
    )]
    public function getSchedules(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get page and per_page from query parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 20)));
        $search = $request->query->get('search', '');

        // Get schedules from database with pagination
        $schedules = ServerSchedule::searchSchedules(
            page: $page,
            limit: $perPage,
            search: $search,
            serverId: $server['id']
        );

        // Get total count for pagination
        $totalSchedules = ServerSchedule::getSchedulesByServerId($server['id']);
        $total = count($totalSchedules);

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'schedules_retrieved', [
            'schedules' => $schedules,
        ], $user);

        return ApiResponse::success([
            'data' => $schedules,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $perPage,
                'total' => $total,
                'last_page' => ceil($total / $perPage),
                'from' => ($page - 1) * $perPage + 1,
                'to' => min($page * $perPage, $total),
            ],
        ]);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}',
        summary: 'Get specific schedule',
        description: 'Retrieve details of a specific schedule for a server that the user owns or has subuser access to.',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'scheduleId',
                in: 'path',
                description: 'Schedule ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Schedule details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ServerSchedule')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or schedule not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve schedule'),
        ]
    )]
    public function getSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get schedule info
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Verify schedule belongs to this server
        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'schedule_retrieved', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
        ], $user);

        return ApiResponse::success($schedule);
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/schedules',
        summary: 'Create schedule',
        description: 'Create a new schedule for a server with cron expression validation and next run time calculation.',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ScheduleCreateRequest')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Schedule created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ScheduleCreateResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid cron expression, or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create schedule'),
        ]
    )]
    public function createSchedule(Request $request, string $serverUuid): Response
    {
        $config = App::getInstance(true)->getConfig();
        if ($config->getSetting(ConfigInterface::SERVER_ALLOW_SCHEDULES, 'true') == 'false') {
            return ApiResponse::error('Schedules are disabled on this host. Please contact your administrator to enable this feature.', 'SCHEDULES_NOT_ALLOWED', 403);
        }

        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.create permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_CREATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate required fields
        $required = ['name', 'cron_day_of_week', 'cron_month', 'cron_day_of_month', 'cron_hour', 'cron_minute'];
        foreach ($required as $field) {
            if (!isset($body[$field]) || trim($body[$field]) === '') {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate cron expression components
        if (
            !ServerSchedule::validateCronExpression(
                $body['cron_day_of_week'],
                $body['cron_month'],
                $body['cron_day_of_month'],
                $body['cron_hour'],
                $body['cron_minute']
            )
        ) {
            return ApiResponse::error('Invalid cron expression', 'INVALID_CRON_EXPRESSION', 400);
        }

        // Calculate next run time
        $nextRunAt = ServerSchedule::calculateNextRunTime(
            $body['cron_day_of_week'],
            $body['cron_month'],
            $body['cron_day_of_month'],
            $body['cron_hour'],
            $body['cron_minute']
        );

        // Create schedule data
        $scheduleData = [
            'server_id' => $server['id'],
            'name' => $body['name'],
            'cron_day_of_week' => $body['cron_day_of_week'],
            'cron_month' => $body['cron_month'],
            'cron_day_of_month' => $body['cron_day_of_month'],
            'cron_hour' => $body['cron_hour'],
            'cron_minute' => $body['cron_minute'],
            'is_active' => $body['is_active'] ?? 1,
            'is_processing' => 0,
            'only_when_online' => $body['only_when_online'] ?? 0,
            'next_run_at' => $nextRunAt,
        ];

        $scheduleId = ServerSchedule::createSchedule($scheduleData);
        if (!$scheduleId) {
            return ApiResponse::error('Failed to create schedule', 'CREATION_FAILED', 500);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerScheduleEvent::onServerScheduleCreated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                ]
            );
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'schedule_created', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $body['name'],
        ], $user);

        return ApiResponse::success([
            'id' => $scheduleId,
            'name' => $body['name'],
            'next_run_at' => $nextRunAt,
        ], 'Schedule created successfully', 201);
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}',
        summary: 'Update schedule',
        description: 'Update an existing schedule with new cron expression validation and next run time recalculation.',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'scheduleId',
                in: 'path',
                description: 'Schedule ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ScheduleUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Schedule updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid cron expression or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or schedule not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update schedule'),
        ]
    )]
    public function updateSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.update permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_UPDATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get schedule info
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Verify schedule belongs to this server
        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate cron expression components if provided
        if (isset($body['cron_day_of_week']) || isset($body['cron_month']) || isset($body['cron_day_of_month']) || isset($body['cron_hour']) || isset($body['cron_minute'])) {
            $dayOfWeek = $body['cron_day_of_week'] ?? $schedule['cron_day_of_week'];
            $month = $body['cron_month'] ?? $schedule['cron_month'];
            $dayOfMonth = $body['cron_day_of_month'] ?? $schedule['cron_day_of_month'];
            $hour = $body['cron_hour'] ?? $schedule['cron_hour'];
            $minute = $body['cron_minute'] ?? $schedule['cron_minute'];

            if (!ServerSchedule::validateCronExpression($dayOfWeek, $month, $dayOfMonth, $hour, $minute)) {
                return ApiResponse::error('Invalid cron expression', 'INVALID_CRON_EXPRESSION', 400);
            }

            // Calculate new next run time if cron expression changed
            $body['next_run_at'] = ServerSchedule::calculateNextRunTime($dayOfWeek, $month, $dayOfMonth, $hour, $minute);
        }

        // Update schedule
        if (!ServerSchedule::updateSchedule($scheduleId, $body)) {
            return ApiResponse::error('Failed to update schedule', 'UPDATE_FAILED', 500);
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'schedule_updated', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'updated_fields' => array_keys($body),
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerScheduleEvent::onServerScheduleUpdated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                ]
            );
        }

        return ApiResponse::success(null, 'Schedule updated successfully', 200);
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/toggle',
        summary: 'Toggle schedule status',
        description: 'Toggle the active status of a schedule (enable/disable).',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'scheduleId',
                in: 'path',
                description: 'Schedule ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Schedule status toggled successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ScheduleToggleResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or schedule not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to toggle schedule status'),
        ]
    )]
    public function toggleScheduleStatus(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.update permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_UPDATE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get schedule info
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Verify schedule belongs to this server
        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Toggle status
        if (!ServerSchedule::toggleActiveStatus($scheduleId)) {
            return ApiResponse::error('Failed to toggle schedule status', 'TOGGLE_FAILED', 500);
        }

        // Get updated schedule to return new status
        $updatedSchedule = ServerSchedule::getScheduleById($scheduleId);
        $newStatus = $updatedSchedule['is_active'] ? 'enabled' : 'disabled';

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'schedule_status_toggled', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'new_status' => $newStatus,
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerScheduleStatusToggled(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                ]
            );
        }

        return ApiResponse::success([
            'is_active' => $updatedSchedule['is_active'],
            'status' => $newStatus,
        ], "Schedule {$newStatus} successfully", 200);
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}',
        summary: 'Delete schedule',
        description: 'Delete a schedule. Schedules that are currently processing can also be deleted (e.g. to clear stuck schedules).',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
            new OA\Parameter(
                name: 'scheduleId',
                in: 'path',
                description: 'Schedule ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Schedule deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or schedule not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete schedule'),
        ]
    )]
    public function deleteSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.delete permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_DELETE);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get schedule info
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Verify schedule belongs to this server
        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Allow delete even when processing so stuck schedules can be removed

        // Delete schedule
        if (!ServerSchedule::deleteSchedule($scheduleId)) {
            return ApiResponse::error('Failed to delete schedule', 'DELETE_FAILED', 500);
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'schedule_deleted', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerScheduleEvent::onServerScheduleDeleted(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                ]
            );
        }

        return ApiResponse::success(null, 'Schedule deleted successfully', 200);
    }

    /**
     * Get schedule with server information.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function getScheduleWithServer(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule with server info
        $schedule = ServerSchedule::getScheduleWithServer($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Verify schedule belongs to this server
        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        return ApiResponse::success($schedule);
    }

    /**
     * Get all schedules for a server with server information.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getSchedulesWithServer(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedules with server info
        $schedules = ServerSchedule::getSchedulesWithServerByServerId($server['id']);

        return ApiResponse::success($schedules);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/schedules/active',
        summary: 'Get active schedules',
        description: 'Retrieve all active schedules for a specific server.',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Active schedules retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerSchedule')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve active schedules'),
        ]
    )]
    public function getActiveSchedules(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get active schedules
        $schedules = ServerSchedule::getActiveSchedulesByServerId($server['id']);

        return ApiResponse::success($schedules);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/schedules/due',
        summary: 'Get due schedules',
        description: 'Retrieve schedules that are due to run for a specific server.',
        tags: ['User - Server Schedules'],
        parameters: [
            new OA\Parameter(
                name: 'uuidShort',
                in: 'path',
                description: 'Server short UUID',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Due schedules retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/ServerSchedule')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve due schedules'),
        ]
    )]
    public function getDueSchedules(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Check schedule.read permission
        $permissionCheck = $this->checkPermission($request, $server, SubuserPermissions::SCHEDULE_READ);
        if ($permissionCheck !== null) {
            return $permissionCheck;
        }

        // Get due schedules
        $schedules = ServerSchedule::getDueSchedules();

        // Filter to only include schedules for this server
        $serverSchedules = array_filter($schedules, function ($schedule) use ($server) {
            return $schedule['server_id'] == $server['id'];
        });

        return ApiResponse::success(array_values($serverSchedules));
    }

    /**
     * Helper method to log server activity.
     */
    private function logActivity(array $server, array $node, string $event, array $metadata, array $user): void
    {
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'user_id' => $user['id'],
            'ip' => $user['last_ip'],
            'event' => $event,
            'metadata' => json_encode($metadata),
        ]);
    }
}
