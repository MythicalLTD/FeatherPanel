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

namespace App\Controllers\User\WebSpaces;

use App\App;
use App\Chat\WebNode;
use App\Chat\ServerSchedule;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\WebSpaceSchedule;
use App\Helpers\WebSpaceGateway;
use App\WebSpaceSubuserPermissions;
use App\Helpers\FeatherQuilldClient;
use App\Helpers\WebSpacePluginEvents;
use App\Helpers\WebSpaceScheduleTasks;
use App\Helpers\WebSpaceActivityLogger;
use App\Plugins\Events\Events\WebSpaceEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WebSpaceScheduleController
{
    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/schedules', summary: 'List WebSpace schedules', tags: ['User - WebSpace Schedules'])]
    public function index(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $schedules = WebSpaceSchedule::listByWebspaceId((int) $space['id']);
        foreach ($schedules as &$schedule) {
            $schedule['tasks'] = WebSpaceSchedule::listTasks((int) $schedule['id']);
            $schedule['is_locked'] = WebSpaceSchedule::isLocked($schedule);
        }
        unset($schedule);

        return ApiResponse::success(['schedules' => $schedules], 'OK', 200);
    }

    #[OA\Get(path: '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}', summary: 'Get WebSpace schedule', tags: ['User - WebSpace Schedules'])]
    public function show(Request $request, string $uuidShort, int $scheduleId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_READ);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $schedule = $this->findScheduleForSpace($scheduleId, $resolved['space']);
        if ($schedule instanceof Response) {
            return $schedule;
        }

        $schedule['tasks'] = WebSpaceSchedule::listTasks($scheduleId);
        $schedule['is_locked'] = WebSpaceSchedule::isLocked($schedule);

        return ApiResponse::success(['schedule' => $schedule], 'OK', 200);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/schedules', summary: 'Create WebSpace schedule', tags: ['User - WebSpace Schedules'])]
    public function create(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_CREATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $validation = $this->validateScheduleBody($body);
        if ($validation instanceof Response) {
            return $validation;
        }

        $space = $resolved['space'];
        $scheduleId = WebSpaceSchedule::create([
            'webspace_id' => (int) $space['id'],
            'name' => trim((string) $body['name']),
            'cron_day_of_week' => (string) $body['cron_day_of_week'],
            'cron_month' => (string) $body['cron_month'],
            'cron_day_of_month' => (string) $body['cron_day_of_month'],
            'cron_hour' => (string) $body['cron_hour'],
            'cron_minute' => (string) $body['cron_minute'],
            'timezone' => $validation['timezone'],
            'is_active' => isset($body['is_active']) ? (int) (bool) $body['is_active'] : 1,
        ]);

        if ($scheduleId === false) {
            return ApiResponse::error('Failed to create schedule', 'CREATION_FAILED', 500);
        }

        $tasks = $body['tasks'] ?? [['action' => 'restart', 'payload' => '', 'sequence_id' => 1]];
        if (!is_array($tasks)) {
            WebSpaceSchedule::delete($scheduleId);

            return ApiResponse::error('Tasks must be an array', 'INVALID_TASKS', 400);
        }

        $normalizedTasks = WebSpaceScheduleTasks::validateAndNormalizeTasks($tasks);
        if (is_string($normalizedTasks)) {
            WebSpaceSchedule::delete($scheduleId);

            return ApiResponse::error($normalizedTasks, 'INVALID_TASK', 400);
        }

        if (!WebSpaceSchedule::replaceTasks($scheduleId, $normalizedTasks)) {
            WebSpaceSchedule::delete($scheduleId);

            return ApiResponse::error('Failed to create schedule tasks', 'TASK_CREATION_FAILED', 500);
        }

        $sync = $this->syncSchedules($space);
        if ($sync instanceof Response) {
            return $sync;
        }

        WebSpaceActivityLogger::log($space, $resolved['user'], 'schedule_created', [
            'schedule_id' => $scheduleId,
            'schedule_name' => trim((string) $body['name']),
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceScheduleCreated(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $space,
            [
                'schedule_id' => (int) $scheduleId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success([
            'id' => $scheduleId,
            'name' => trim((string) $body['name']),
        ], 'Schedule created successfully', 201);
    }

    #[OA\Put(path: '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}', summary: 'Update WebSpace schedule', tags: ['User - WebSpace Schedules'])]
    public function update(Request $request, string $uuidShort, int $scheduleId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $schedule = $this->findScheduleForSpace($scheduleId, $resolved['space']);
        if ($schedule instanceof Response) {
            return $schedule;
        }

        $locked = $this->rejectIfLocked($schedule);
        if ($locked instanceof Response) {
            return $locked;
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body) || $body === []) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $updateData = [];
        if (isset($body['name']) && trim((string) $body['name']) !== '') {
            $updateData['name'] = trim((string) $body['name']);
        }

        $cronFields = ['cron_day_of_week', 'cron_month', 'cron_day_of_month', 'cron_hour', 'cron_minute'];
        $hasCronChange = false;
        foreach ($cronFields as $field) {
            if (array_key_exists($field, $body)) {
                $updateData[$field] = (string) $body[$field];
                $hasCronChange = true;
            }
        }

        if (isset($body['timezone'])) {
            if (!is_string($body['timezone']) || !ServerSchedule::isValidTimezone($body['timezone'])) {
                return ApiResponse::error('Invalid timezone identifier', 'INVALID_TIMEZONE', 400);
            }
            $updateData['timezone'] = $body['timezone'];
            $hasCronChange = true;
        }

        if ($hasCronChange) {
            $dayOfWeek = $updateData['cron_day_of_week'] ?? $schedule['cron_day_of_week'];
            $month = $updateData['cron_month'] ?? $schedule['cron_month'];
            $dayOfMonth = $updateData['cron_day_of_month'] ?? $schedule['cron_day_of_month'];
            $hour = $updateData['cron_hour'] ?? $schedule['cron_hour'];
            $minute = $updateData['cron_minute'] ?? $schedule['cron_minute'];
            if (!ServerSchedule::validateCronExpression($dayOfWeek, $month, $dayOfMonth, $hour, $minute)) {
                return ApiResponse::error('Invalid cron expression', 'INVALID_CRON_EXPRESSION', 400);
            }
        }

        if (array_key_exists('is_active', $body)) {
            $updateData['is_active'] = (int) (bool) $body['is_active'];
        }

        if ($updateData !== [] && !WebSpaceSchedule::update($scheduleId, $updateData)) {
            return ApiResponse::error('Failed to update schedule', 'UPDATE_FAILED', 500);
        }

        if (isset($body['tasks']) && is_array($body['tasks'])) {
            $normalizedTasks = WebSpaceScheduleTasks::validateAndNormalizeTasks($body['tasks']);
            if (is_string($normalizedTasks)) {
                return ApiResponse::error($normalizedTasks, 'INVALID_TASK', 400);
            }
            if (!WebSpaceSchedule::replaceTasks($scheduleId, $normalizedTasks)) {
                return ApiResponse::error('Failed to update schedule tasks', 'TASK_UPDATE_FAILED', 500);
            }
        }

        $sync = $this->syncSchedules($resolved['space']);
        if ($sync instanceof Response) {
            return $sync;
        }

        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'schedule_updated', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'updated_fields' => array_keys($body),
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceScheduleUpdated(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $resolved['space'],
            [
                'schedule_id' => $scheduleId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success(null, 'Schedule updated successfully', 200);
    }

    #[OA\Delete(path: '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}', summary: 'Delete WebSpace schedule', tags: ['User - WebSpace Schedules'])]
    public function delete(Request $request, string $uuidShort, int $scheduleId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_DELETE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $schedule = $this->findScheduleForSpace($scheduleId, $resolved['space']);
        if ($schedule instanceof Response) {
            return $schedule;
        }

        $locked = $this->rejectIfLocked($schedule);
        if ($locked instanceof Response) {
            return $locked;
        }

        if (!WebSpaceSchedule::delete($scheduleId)) {
            return ApiResponse::error('Failed to delete schedule', 'DELETE_FAILED', 500);
        }

        $sync = $this->syncSchedules($resolved['space']);
        if ($sync instanceof Response) {
            return $sync;
        }

        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'schedule_deleted', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
        ]);

        WebSpacePluginEvents::emit(WebSpaceEvent::onWebSpaceScheduleDeleted(), WebSpacePluginEvents::basePayload(
            $resolved['user']['uuid'] ?? null,
            $resolved['space'],
            [
                'schedule_id' => $scheduleId,
                'context' => ['source' => 'user'],
            ],
        ));

        return ApiResponse::success(null, 'Schedule deleted successfully', 200);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}/toggle', summary: 'Toggle WebSpace schedule', tags: ['User - WebSpace Schedules'])]
    public function toggle(Request $request, string $uuidShort, int $scheduleId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $schedule = $this->findScheduleForSpace($scheduleId, $resolved['space']);
        if ($schedule instanceof Response) {
            return $schedule;
        }

        $locked = $this->rejectIfLocked($schedule);
        if ($locked instanceof Response) {
            return $locked;
        }

        if (!WebSpaceSchedule::toggleActive($scheduleId)) {
            return ApiResponse::error('Failed to toggle schedule', 'TOGGLE_FAILED', 500);
        }

        $sync = $this->syncSchedules($resolved['space']);
        if ($sync instanceof Response) {
            return $sync;
        }

        $updated = WebSpaceSchedule::getById($scheduleId);

        WebSpaceActivityLogger::log($resolved['space'], $resolved['user'], 'schedule_toggled', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
            'is_active' => (bool) ($updated['is_active'] ?? false),
        ]);

        return ApiResponse::success([
            'is_active' => (bool) ($updated['is_active'] ?? false),
        ], 'Schedule toggled successfully', 200);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/schedules/{scheduleId}/execute', summary: 'Execute WebSpace schedule', tags: ['User - WebSpace Schedules'])]
    public function execute(Request $request, string $uuidShort, int $scheduleId): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $schedule = $this->findScheduleForSpace($scheduleId, $resolved['space']);
        if ($schedule instanceof Response) {
            return $schedule;
        }

        $tasks = WebSpaceSchedule::listTasks($scheduleId);
        if ($tasks === []) {
            return ApiResponse::error('Schedule has no tasks to run', 'SCHEDULE_NO_TASKS', 400);
        }

        $space = $resolved['space'];
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::triggerWebSpaceSchedule($webNode, (string) $space['uuid'], $scheduleId);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Failed to trigger schedule',
                'DAEMON_TRIGGER_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        WebSpaceActivityLogger::log($space, $resolved['user'], 'schedule_executed', [
            'schedule_id' => $scheduleId,
            'schedule_name' => $schedule['name'],
        ]);

        return ApiResponse::success([], 'Schedule execution started', 202);
    }

    #[OA\Post(path: '/api/user/webspaces/{uuidShort}/schedules/abort', summary: 'Abort WebSpace schedule run', tags: ['User - WebSpace Schedules'])]
    public function abort(Request $request, string $uuidShort): Response
    {
        $resolved = $this->resolve($request, $uuidShort, WebSpaceSubuserPermissions::SCHEDULE_UPDATE);
        if ($resolved instanceof Response) {
            return $resolved;
        }

        $space = $resolved['space'];
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::abortWebSpaceSchedules($webNode, (string) $space['uuid']);
        if (!$daemon['ok']) {
            return ApiResponse::error(
                $daemon['error'] ?? 'Failed to abort schedule',
                'DAEMON_ABORT_FAILED',
                502,
                ['daemon' => $daemon],
            );
        }

        WebSpaceActivityLogger::log($space, $resolved['user'], 'schedule_aborted', [
            'daemon' => is_array($daemon['body']) ? $daemon['body'] : [],
        ]);

        return ApiResponse::success(
            is_array($daemon['body']) ? $daemon['body'] : [],
            'Schedule abort requested',
            200,
        );
    }

    /**
     * @param array<string, mixed> $body
     *
     * @return array{timezone: string}|Response
     */
    private function validateScheduleBody(array $body): array | Response
    {
        $required = ['name', 'cron_day_of_week', 'cron_month', 'cron_day_of_month', 'cron_hour', 'cron_minute'];
        foreach ($required as $field) {
            if (!isset($body[$field]) || trim((string) $body[$field]) === '') {
                return ApiResponse::error("Missing required field: {$field}", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        if (
            !ServerSchedule::validateCronExpression(
                (string) $body['cron_day_of_week'],
                (string) $body['cron_month'],
                (string) $body['cron_day_of_month'],
                (string) $body['cron_hour'],
                (string) $body['cron_minute'],
            )
        ) {
            return ApiResponse::error('Invalid cron expression', 'INVALID_CRON_EXPRESSION', 400);
        }

        $timezone = isset($body['timezone']) && is_string($body['timezone']) && $body['timezone'] !== ''
            ? $body['timezone']
            : 'UTC';
        if (!ServerSchedule::isValidTimezone($timezone)) {
            return ApiResponse::error('Invalid timezone identifier', 'INVALID_TIMEZONE', 400);
        }

        return ['timezone' => $timezone];
    }

    /**
     * @param array<string, mixed> $space
     *
     * @return array<string, mixed>|Response
     */
    private function findScheduleForSpace(int $scheduleId, array $space): array | Response
    {
        $schedule = WebSpaceSchedule::getById($scheduleId);
        if (!$schedule || (int) ($schedule['webspace_id'] ?? 0) !== (int) ($space['id'] ?? 0)) {
            return ApiResponse::error('Schedule not found', 'SCHEDULE_NOT_FOUND', 404);
        }

        return $schedule;
    }

    /**
     * @param array<string, mixed> $schedule
     */
    private function rejectIfLocked(array $schedule): ?Response
    {
        if (!WebSpaceSchedule::isLocked($schedule)) {
            return null;
        }

        return ApiResponse::error(
            'This schedule is managed by the WebPlate and cannot be changed',
            'SCHEDULE_LOCKED',
            403,
        );
    }

    /**
     * Push schedule config to FeatherQuilld. Failures are logged but do not fail the
     * panel mutation — otherwise a slow/unreachable daemon hangs the UI (HTTP 499 /
     * proxy socket hang up) after the DB write already succeeded.
     *
     * @param array<string, mixed> $space
     */
    private function syncSchedules(array $space): ?Response
    {
        $webNode = WebNode::getWebNodeById((int) ($space['web_node_id'] ?? 0));
        if (!$webNode) {
            return ApiResponse::error('Web node not found', 'WEB_NODE_NOT_FOUND', 404);
        }

        $daemon = FeatherQuilldClient::syncWebSpaceSchedules($webNode, (string) $space['uuid']);
        if (!$daemon['ok']) {
            App::getInstance(true)->getLogger()->warning(
                'WebSpace schedule daemon sync failed for ' . ($space['uuidShort'] ?? $space['uuid'] ?? '?') .
                ': ' . ($daemon['error'] ?? 'unknown') .
                ' (status ' . ($daemon['status'] ?? 0) . ')',
            );
        }

        return null;
    }

    /**
     * @return array{user: array<string, mixed>, space: array<string, mixed>}|Response
     */
    private function resolve(Request $request, string $uuidShort, string $permission): array | Response
    {
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'NOT_AUTHENTICATED', 401);
        }

        $space = WebSpaceGateway::resolveWebSpace($uuidShort);
        if (!$space) {
            return ApiResponse::error('WebSpace not found', 'WEBSPACE_NOT_FOUND', 404);
        }

        if (!WebSpaceGateway::canUserAccessWebSpace((string) $user['uuid'], (string) $space['uuid'])) {
            return ApiResponse::error('Access denied', 'FORBIDDEN', 403);
        }

        if (!WebSpaceGateway::hasPermission((string) $user['uuid'], $space, $permission)) {
            return ApiResponse::error('Permission denied', 'PERMISSION_DENIED', 403);
        }

        return ['user' => $user, 'space' => $space];
    }
}
