<?php

/*
 * This file is part of FeatherPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\User\Server;

use App\Chat\Task;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Helpers\ApiResponse;
use App\Helpers\ServerGateway;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class TaskController
{
    /**
     * Get all tasks for a schedule.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function getTasks(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

    /**
     * Get a specific task.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     * @param int $taskId The task ID
     *
     * @return Response The HTTP response
     */
    public function getTask(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

    /**
     * Create a new task.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function createTask(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'task_created',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
                'task_id' => $taskId,
                'action' => $body['action'],
                'sequence_id' => $nextSequenceId,
            ]),
        ]);

        return ApiResponse::success([
            'id' => $taskId,
            'action' => $body['action'],
            'sequence_id' => $nextSequenceId,
        ], 'Task created successfully', 201);
    }

    /**
     * Update a task.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     * @param int $taskId The task ID
     *
     * @return Response The HTTP response
     */
    public function updateTask(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'task_updated',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
                'task_id' => $taskId,
                'action' => $task['action'],
                'updated_fields' => array_keys($body),
            ]),
        ]);

        return ApiResponse::success(null, 'Task updated successfully', 200);
    }

    /**
     * Update task sequence order.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     * @param int $taskId The task ID
     *
     * @return Response The HTTP response
     */
    public function updateTaskSequence(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'task_sequence_updated',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
                'task_id' => $taskId,
                'action' => $task['action'],
                'old_sequence' => $task['sequence_id'],
                'new_sequence' => $newSequenceId,
            ]),
        ]);

        return ApiResponse::success(null, 'Task sequence updated successfully', 200);
    }

    /**
     * Toggle task queued status.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     * @param int $taskId The task ID
     *
     * @return Response The HTTP response
     */
    public function toggleTaskQueuedStatus(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'task_queued_status_toggled',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
                'task_id' => $taskId,
                'action' => $task['action'],
                'new_status' => $statusText,
            ]),
        ]);

        return ApiResponse::success([
            'is_queued' => $newQueuedStatus ? 1 : 0,
            'status' => $statusText,
        ], "Task {$statusText} successfully", 200);
    }

    /**
     * Delete a task.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     * @param int $taskId The task ID
     *
     * @return Response The HTTP response
     */
    public function deleteTask(Request $request, string $serverUuid, int $scheduleId, int $taskId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'task_deleted',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
                'task_id' => $taskId,
                'action' => $task['action'],
                'sequence_id' => $task['sequence_id'],
            ]),
        ]);

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

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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

    /**
     * Get all tasks for a schedule with schedule information.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function getTasksWithSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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

    /**
     * Get queued tasks for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getQueuedTasks(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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

    /**
     * Get ready tasks for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getReadyTasks(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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
     * Centralized check using ServerGateway with current request user.
     */
    private function userCanAccessServer(Request $request, array $server): bool
    {
        $currentUser = $request->get('user');
        if (!$currentUser || !isset($currentUser['uuid'])) {
            return false;
        }

        return ServerGateway::canUserAccessServer($currentUser['uuid'], $server['uuid']);
    }
}
