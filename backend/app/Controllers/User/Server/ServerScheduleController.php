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

use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Chat\ServerSchedule;
use App\Helpers\ApiResponse;
use App\Helpers\ServerGateway;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerScheduleController
{
    /**
     * Get all schedules for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getSchedules(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

    /**
     * Get a specific schedule.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function getSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

        return ApiResponse::success($schedule);
    }

    /**
     * Create a new schedule.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function createSchedule(Request $request, string $serverUuid): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'schedule_created',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $body['name'],
                'cron_expression' => "{$body['cron_minute']} {$body['cron_hour']} {$body['cron_day_of_month']} {$body['cron_month']} {$body['cron_day_of_week']}",
            ]),
        ]);

        return ApiResponse::success([
            'id' => $scheduleId,
            'name' => $body['name'],
            'next_run_at' => $nextRunAt,
        ], 'Schedule created successfully', 201);
    }

    /**
     * Update a schedule.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function updateSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'schedule_updated',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
                'updated_fields' => array_keys($body),
            ]),
        ]);

        return ApiResponse::success(null, 'Schedule updated successfully', 200);
    }

    /**
     * Toggle schedule active status.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function toggleScheduleStatus(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'schedule_status_toggled',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
                'new_status' => $newStatus,
            ]),
        ]);

        return ApiResponse::success([
            'is_active' => $updatedSchedule['is_active'],
            'status' => $newStatus,
        ], "Schedule {$newStatus} successfully", 200);
    }

    /**
     * Delete a schedule.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     * @param int $scheduleId The schedule ID
     *
     * @return Response The HTTP response
     */
    public function deleteSchedule(Request $request, string $serverUuid, int $scheduleId): Response
    {
        // Get server info
        $server = Server::getServerByUuid($serverUuid);
        if (!$server) {
            return ApiResponse::error('Server not found', 'SERVER_NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
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

        // Check if schedule is currently processing
        if ($schedule['is_processing']) {
            return ApiResponse::error('Cannot delete schedule while it is processing', 'SCHEDULE_PROCESSING', 400);
        }

        // Delete schedule
        if (!ServerSchedule::deleteSchedule($scheduleId)) {
            return ApiResponse::error('Failed to delete schedule', 'DELETE_FAILED', 500);
        }

        // Log activity
        ServerActivity::createActivity([
            'server_id' => $server['id'],
            'node_id' => $server['node_id'],
            'event' => 'schedule_deleted',
            'metadata' => json_encode([
                'schedule_id' => $scheduleId,
                'schedule_name' => $schedule['name'],
            ]),
        ]);

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

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

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

        // TODO: Add user permission check here
        // if (!$this->userCanAccessServer($request, $server)) {
        //     return ApiResponse::error('Access denied', 'ACCESS_DENIED', 403);
        // }

        // Get schedules with server info
        $schedules = ServerSchedule::getSchedulesWithServerByServerId($server['id']);

        return ApiResponse::success($schedules);
    }

    /**
     * Get active schedules for a server.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getActiveSchedules(Request $request, string $serverUuid): Response
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

        // Get active schedules
        $schedules = ServerSchedule::getActiveSchedulesByServerId($server['id']);

        return ApiResponse::success($schedules);
    }

    /**
     * Get schedules that are due to run.
     *
     * @param Request $request The HTTP request
     * @param string $serverUuid The server UUID
     *
     * @return Response The HTTP response
     */
    public function getDueSchedules(Request $request, string $serverUuid): Response
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

        // Get due schedules
        $schedules = ServerSchedule::getDueSchedules();

        // Filter to only include schedules for this server
        $serverSchedules = array_filter($schedules, function ($schedule) use ($server) {
            return $schedule['server_id'] == $server['id'];
        });

        return ApiResponse::success(array_values($serverSchedules));
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
