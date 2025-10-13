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

namespace App\Controllers\User\Server;

use App\Chat\Node;
use App\Chat\Task;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Plugins\Events\Events\ServerEvent;
use Symfony\Component\HttpFoundation\Request;
use App\Plugins\Events\Events\ServerTaskEvent;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Task',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Task ID'),
        new OA\Property(property: 'schedule_id', type: 'integer', description: 'Schedule ID'),
        new OA\Property(property: 'sequence_id', type: 'integer', description: 'Task sequence order'),
        new OA\Property(property: 'action', type: 'string', description: 'Task action type'),
        new OA\Property(property: 'payload', type: 'string', description: 'Task payload data'),
        new OA\Property(property: 'time_offset', type: 'integer', description: 'Time offset in seconds'),
        new OA\Property(property: 'is_queued', type: 'boolean', description: 'Whether task is queued'),
        new OA\Property(property: 'continue_on_failure', type: 'boolean', description: 'Whether to continue on failure'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'TaskPagination',
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
    schema: 'TaskCreateRequest',
    type: 'object',
    required: ['action', 'payload'],
    properties: [
        new OA\Property(property: 'action', type: 'string', description: 'Task action type'),
        new OA\Property(property: 'payload', type: 'string', description: 'Task payload data'),
        new OA\Property(property: 'time_offset', type: 'integer', nullable: true, description: 'Time offset in seconds', default: 0),
        new OA\Property(property: 'continue_on_failure', type: 'boolean', nullable: true, description: 'Whether to continue on failure', default: false),
    ]
)]
#[OA\Schema(
    schema: 'TaskCreateResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Created task ID'),
        new OA\Property(property: 'action', type: 'string', description: 'Task action type'),
        new OA\Property(property: 'sequence_id', type: 'integer', description: 'Task sequence order'),
    ]
)]
#[OA\Schema(
    schema: 'TaskUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'action', type: 'string', nullable: true, description: 'Task action type'),
        new OA\Property(property: 'payload', type: 'string', nullable: true, description: 'Task payload data'),
        new OA\Property(property: 'time_offset', type: 'integer', nullable: true, description: 'Time offset in seconds'),
        new OA\Property(property: 'continue_on_failure', type: 'boolean', nullable: true, description: 'Whether to continue on failure'),
    ]
)]
#[OA\Schema(
    schema: 'TaskSequenceUpdateRequest',
    type: 'object',
    required: ['sequence_id'],
    properties: [
        new OA\Property(property: 'sequence_id', type: 'integer', description: 'New sequence order for the task'),
    ]
)]
#[OA\Schema(
    schema: 'TaskStatusToggleResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'is_queued', type: 'integer', enum: [0, 1], description: 'New queued status'),
        new OA\Property(property: 'status', type: 'string', enum: ['queued', 'unqueued'], description: 'Status description'),
    ]
)]
class TaskController
{
    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks',
        summary: 'Get schedule tasks',
        description: 'Retrieve all tasks for a specific schedule that the user owns or has subuser access to.',
        tags: ['User - Server Tasks'],
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
                description: 'Search term to filter tasks by action or payload',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Schedule tasks retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Task')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/TaskPagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or schedule not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve tasks'),
        ]
    )]
    public function getTasks(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get page and per_page from query parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 20)));
        $search = $request->query->get('search', '');

        // Get tasks from database with pagination
        $tasks = Task::searchTasks(
            page: $page,
            limit: $perPage,
            search: $search,
            scheduleId: $scheduleId
        );

        // Get total count for pagination
        $totalTasks = Task::getTasksByScheduleId($scheduleId);
        $total = count($totalTasks);

        return ApiResponse::success([
            'data' => $tasks,
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
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}',
        summary: 'Get specific task',
        description: 'Retrieve details of a specific task for a schedule that the user owns or has subuser access to.',
        tags: ['User - Server Tasks'],
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
            new OA\Parameter(
                name: 'taskId',
                in: 'path',
                description: 'Task ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Task details retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/Task')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, schedule, or task not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve task'),
        ]
    )]
    public function getTask(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get task info
        $task = Task::getTaskById($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Verify task belongs to this schedule
        if ($task['schedule_id'] != $scheduleId) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        return ApiResponse::success($task);
    }

    #[OA\Post(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks',
        summary: 'Create task',
        description: 'Create a new task for a schedule with action validation and automatic sequence ordering.',
        tags: ['User - Server Tasks'],
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
            content: new OA\JsonContent(ref: '#/components/schemas/TaskCreateRequest')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'Task created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/TaskCreateResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid action, or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or schedule not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create task'),
        ]
    )]
    public function createTask(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate required fields
        $required = ['action', 'payload'];
        foreach ($required as $field) {
            if (!isset($body[$field]) || trim($body[$field]) === '') {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate action
        if (!Task::validateAction($body['action'])) {
            return ApiResponse::error('Invalid action type', 'INVALID_ACTION', 400);
        }

        // Get next sequence ID for this schedule
        $nextSequenceId = Task::getNextSequenceId($scheduleId);

        // Create task data
        $taskData = [
            'schedule_id' => $scheduleId,
            'sequence_id' => $nextSequenceId,
            'action' => $body['action'],
            'payload' => $body['payload'],
            'time_offset' => $body['time_offset'] ?? 0,
            'is_queued' => 0,
            'continue_on_failure' => $body['continue_on_failure'] ?? 0,
        ];

        $taskId = Task::createTask($taskData);
        if (!$taskId) {
            return ApiResponse::error('Failed to create task', 'CREATION_FAILED', 500);
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'task_created', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'task_id' => $taskId,
            'action' => $body['action'],
            'sequence_id' => $nextSequenceId,
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerTaskEvent::onServerTaskCreated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                    'task_id' => $taskId,
                ]
            );
        }

        return ApiResponse::success([
            'id' => $taskId,
            'action' => $body['action'],
            'sequence_id' => $nextSequenceId,
        ], 'Task created successfully', 201);
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}',
        summary: 'Update task',
        description: 'Update an existing task with new action validation and field updates.',
        tags: ['User - Server Tasks'],
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
            new OA\Parameter(
                name: 'taskId',
                in: 'path',
                description: 'Task ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TaskUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Task updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid action or invalid request body'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, schedule, or task not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update task'),
        ]
    )]
    public function updateTask(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get task info
        $task = Task::getTaskById($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Verify task belongs to this schedule
        if ($task['schedule_id'] != $scheduleId) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        // Validate action if provided
        if (isset($body['action']) && !Task::validateAction($body['action'])) {
            return ApiResponse::error('Invalid action type', 'INVALID_ACTION', 400);
        }

        // Update task
        if (!Task::updateTask($taskId, $body)) {
            return ApiResponse::error('Failed to update task', 'UPDATE_FAILED', 500);
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'task_updated', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'task_id' => $taskId,
            'action' => $task['action'],
            'updated_fields' => array_keys($body),
        ], $user);
        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerTaskEvent::onServerTaskUpdated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                    'task_id' => $taskId,
                ]
            );
        }

        return ApiResponse::success(null, 'Task updated successfully', 200);
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}/sequence',
        summary: 'Update task sequence',
        description: 'Update the sequence order of a task within a schedule.',
        tags: ['User - Server Tasks'],
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
            new OA\Parameter(
                name: 'taskId',
                in: 'path',
                description: 'Task ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/TaskSequenceUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Task sequence updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing sequence_id or invalid sequence_id'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, schedule, or task not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update task sequence'),
        ]
    )]
    public function updateTaskSequence(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get task info
        $task = Task::getTaskById($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Verify task belongs to this schedule
        if ($task['schedule_id'] != $scheduleId) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Parse request body
        $body = json_decode($request->getContent(), true);
        if (!$body || !isset($body['sequence_id'])) {
            return ApiResponse::error('Missing sequence_id field', 'MISSING_REQUIRED_FIELD', 400);
        }

        $newSequenceId = (int) $body['sequence_id'];
        if ($newSequenceId <= 0) {
            return ApiResponse::error('Invalid sequence_id', 'INVALID_SEQUENCE_ID', 400);
        }

        // Update task sequence
        if (!Task::updateSequenceOrder($taskId, $newSequenceId)) {
            return ApiResponse::error('Failed to update task sequence', 'UPDATE_FAILED', 500);
        }

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'task_sequence_updated', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'task_id' => $taskId,
            'action' => $task['action'],
            'old_sequence' => $task['sequence_id'],
            'new_sequence' => $newSequenceId,
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerTaskEvent::onServerTaskSequenceUpdated(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                    'task_id' => $taskId,
                ]
            );
        }

        return ApiResponse::success(null, 'Task sequence updated successfully', 200);
    }

    #[OA\Put(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}/queue',
        summary: 'Toggle task queued status',
        description: 'Toggle the queued status of a task (queue/unqueue).',
        tags: ['User - Server Tasks'],
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
            new OA\Parameter(
                name: 'taskId',
                in: 'path',
                description: 'Task ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Task queued status toggled successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/TaskStatusToggleResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, schedule, or task not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to toggle task status'),
        ]
    )]
    public function toggleTaskQueuedStatus(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get task info
        $task = Task::getTaskById($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Verify task belongs to this schedule
        if ($task['schedule_id'] != $scheduleId) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Toggle queued status
        $newQueuedStatus = !$task['is_queued'];
        if (!Task::updateQueuedStatus($taskId, $newQueuedStatus)) {
            return ApiResponse::error('Failed to toggle task queued status', 'TOGGLE_FAILED', 500);
        }

        $statusText = $newQueuedStatus ? 'queued' : 'unqueued';

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'task_queued_status_toggled', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'task_id' => $taskId,
            'action' => $task['action'],
            'new_status' => $statusText,
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerEvent::onServerTaskStatusToggled(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                    'task_id' => $taskId,
                ]
            );
        }

        return ApiResponse::success([
            'is_queued' => $newQueuedStatus ? 1 : 0,
            'status' => $statusText,
        ], "Task {$statusText} successfully", 200);
    }

    #[OA\Delete(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/{taskId}',
        summary: 'Delete task',
        description: 'Delete a task from a schedule. Cannot delete queued tasks.',
        tags: ['User - Server Tasks'],
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
            new OA\Parameter(
                name: 'taskId',
                in: 'path',
                description: 'Task ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Task deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing parameters or task is queued'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server, schedule, or task not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete task'),
        ]
    )]
    public function deleteTask(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get task info
        $task = Task::getTaskById($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Verify task belongs to this schedule
        if ($task['schedule_id'] != $scheduleId) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Check if task is currently queued
        if ($task['is_queued']) {
            return ApiResponse::error('Cannot delete task while it is queued', 'TASK_QUEUED', 400);
        }

        // Delete task
        if (!Task::deleteTask($taskId)) {
            return ApiResponse::error('Failed to delete task', 'DELETE_FAILED', 500);
        }

        // Reorder remaining tasks
        Task::reorderTasks($scheduleId);

        // Log activity
        $node = Node::getNodeById($server['node_id']);
        if (!$node) {
            return ApiResponse::error('Node not found', 'NODE_NOT_FOUND', 404);
        }
        $user = $request->get('user');
        $this->logActivity($server, $node, 'task_deleted', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'task_id' => $taskId,
            'action' => $task['action'],
            'sequence_id' => $task['sequence_id'],
        ], $user);

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                ServerTaskEvent::onServerTaskDeleted(),
                [
                    'user_uuid' => $request->get('user')['uuid'],
                    'server_uuid' => $server['uuid'],
                    'schedule_id' => $scheduleId,
                    'task_id' => $taskId,
                ]
            );
        }

        return ApiResponse::success(null, 'Task deleted successfully', 200);
    }

    /**
     * Get task with schedule information.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     * @param int $taskId The task ID
     *
     * @return Response The HTTP response
     */
    public function getTaskWithSchedule(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get task with schedule info
        $task = Task::getTaskWithSchedule($taskId);
        if (!$task) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        // Verify task belongs to this schedule
        if ($task['schedule_id'] != $scheduleId) {
            return ApiResponse::error('Task not found', 'TASK_NOT_FOUND', 404);
        }

        return ApiResponse::success($task);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/schedules/{scheduleId}/tasks/with-schedule',
        summary: 'Get tasks with schedule',
        description: 'Retrieve all tasks for a schedule with schedule information included.',
        tags: ['User - Server Tasks'],
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
                description: 'Tasks with schedule information retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Task')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid parameters'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server or schedule not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve tasks'),
        ]
    )]
    public function getTasksWithSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get schedule info and verify it belongs to this server
        $schedule = ServerSchedule::getScheduleById($scheduleId);
        if (!$schedule) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        if ($schedule['server_id'] != $server['id']) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        // Get tasks with schedule info
        $tasks = Task::getTasksWithScheduleByScheduleId($scheduleId);

        return ApiResponse::success($tasks);
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/tasks/queued',
        summary: 'Get queued tasks',
        description: 'Retrieve all queued tasks for a server across all schedules.',
        tags: ['User - Server Tasks'],
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
                description: 'Queued tasks retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Task')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve queued tasks'),
        ]
    )]
    public function getQueuedTasks(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get all schedules for this server
        $schedules = ServerSchedule::getSchedulesByServerId($server['id']);
        $scheduleIds = array_column($schedules, 'id');

        if (empty($scheduleIds)) {
            return ApiResponse::success([]);
        }

        // Get queued tasks for all schedules of this server
        $allQueuedTasks = Task::getQueuedTasks();
        $serverQueuedTasks = array_filter($allQueuedTasks, function ($task) use ($scheduleIds) {
            return in_array($task['schedule_id'], $scheduleIds);
        });

        return ApiResponse::success(array_values($serverQueuedTasks));
    }

    #[OA\Get(
        path: '/api/user/servers/{uuidShort}/tasks/ready',
        summary: 'Get ready tasks',
        description: 'Retrieve all ready tasks for a server across all schedules.',
        tags: ['User - Server Tasks'],
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
                description: 'Ready tasks retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/Task')),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or invalid UUID short'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to server'),
            new OA\Response(response: 404, description: 'Not found - Server not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve ready tasks'),
        ]
    )]
    public function getReadyTasks(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // Get all schedules for this server
        $schedules = ServerSchedule::getSchedulesByServerId($server['id']);
        $scheduleIds = array_column($schedules, 'id');

        if (empty($scheduleIds)) {
            return ApiResponse::success([]);
        }

        // Get ready tasks for all schedules of this server
        $allReadyTasks = Task::getReadyTasks();
        $serverReadyTasks = array_filter($allReadyTasks, function ($task) use ($scheduleIds) {
            return in_array($task['schedule_id'], $scheduleIds);
        });

        return ApiResponse::success(array_values($serverReadyTasks));
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
