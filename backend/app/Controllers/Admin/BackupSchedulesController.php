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

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Node;
use App\Chat\Server;
use App\Chat\Activity;
use App\Chat\BackupPolicy;
use App\Helpers\ApiResponse;
use App\Chat\BackupPolicyRun;
use OpenApi\Attributes as OA;
use App\CloudFlare\CloudFlareRealIP;
use App\Services\Backup\BackupPolicyRunner;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\BackupPolicyEvent;
use App\Services\Database\ServerDatabaseDumpService;

class BackupSchedulesController
{
    #[OA\Get(
        path: '/api/admin/backup-schedules',
        summary: 'List admin backup schedules',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function index(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 10)));
        $search = trim((string) $request->query->get('search', ''));
        $sortBy = (string) $request->query->get('sort_by', 'id');
        $sortOrder = (string) $request->query->get('sort_order', 'DESC');

        $result = BackupPolicy::searchPolicies($page, $limit, $search, $sortBy, $sortOrder);
        $policies = [];
        foreach ($result['policies'] as $policy) {
            $policies[] = $this->enrichPolicy($policy);
        }

        $total = $result['total'];
        $totalPages = (int) ceil($total / $limit);
        $from = $total === 0 ? 0 : ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'policies' => $policies,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from,
                'to' => $to,
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($policies) > 0,
            ],
        ], 'Backup schedules fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/backup-schedules/{id}',
        summary: 'Get admin backup schedule',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function show(Request $request, int $id): Response
    {
        $policy = BackupPolicy::getPolicyById($id);
        if (!$policy) {
            return ApiResponse::error('Backup schedule not found', 'BACKUP_SCHEDULE_NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'policy' => $this->enrichPolicy($policy, true),
        ], 'Backup schedule fetched successfully', 200);
    }

    #[OA\Put(
        path: '/api/admin/backup-schedules',
        summary: 'Create admin backup schedule',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 201, description: 'Created')]
    )]
    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $validated = $this->validatePayload($data);
        if ($validated instanceof Response) {
            return $validated;
        }

        $policyId = BackupPolicy::createPolicy($validated['policy'], $validated['server_ids']);
        if (!$policyId) {
            return ApiResponse::error('Failed to create backup schedule', 'CREATE_FAILED', 500);
        }

        $policy = BackupPolicy::getPolicyById($policyId);
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? '',
            'name' => 'backup_schedule_created',
            'context' => 'Created backup schedule: ' . ($validated['policy']['name'] ?? ''),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(BackupPolicyEvent::onBackupPolicyCreated(), [
                'policy' => $policy,
                'created_by' => $request->get('user'),
            ]);
        }

        return ApiResponse::success([
            'policy_id' => $policyId,
            'policy' => $this->enrichPolicy($policy ?? [], true),
        ], 'Backup schedule created successfully', 201);
    }

    #[OA\Patch(
        path: '/api/admin/backup-schedules/{id}',
        summary: 'Update admin backup schedule',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function update(Request $request, int $id): Response
    {
        $existing = BackupPolicy::getPolicyById($id);
        if (!$existing) {
            return ApiResponse::error('Backup schedule not found', 'BACKUP_SCHEDULE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $merged = array_merge($existing, $data);
        if (!isset($data['server_ids']) && ($merged['scope_type'] ?? '') === BackupPolicy::SCOPE_SERVERS) {
            $data['server_ids'] = BackupPolicy::getServerIdsForPolicy($id);
        }

        $validated = $this->validatePayload($merged);
        if ($validated instanceof Response) {
            return $validated;
        }

        $serverIds = array_key_exists('server_ids', $data) || array_key_exists('scope_type', $data)
            ? $validated['server_ids']
            : null;

        $updated = BackupPolicy::updatePolicy($id, $validated['policy'], $serverIds);
        if (!$updated) {
            return ApiResponse::error('Failed to update backup schedule', 'UPDATE_FAILED', 500);
        }

        $policy = BackupPolicy::getPolicyById($id);
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? '',
            'name' => 'backup_schedule_updated',
            'context' => 'Updated backup schedule: ' . ($policy['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(BackupPolicyEvent::onBackupPolicyUpdated(), [
                'policy' => $policy,
                'updated_by' => $request->get('user'),
            ]);
        }

        return ApiResponse::success([
            'policy' => $this->enrichPolicy($policy ?? [], true),
        ], 'Backup schedule updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/admin/backup-schedules/{id}',
        summary: 'Delete admin backup schedule',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function delete(Request $request, int $id): Response
    {
        $policy = BackupPolicy::getPolicyById($id);
        if (!$policy) {
            return ApiResponse::error('Backup schedule not found', 'BACKUP_SCHEDULE_NOT_FOUND', 404);
        }

        if (!BackupPolicy::deletePolicy($id)) {
            return ApiResponse::error('Failed to delete backup schedule', 'DELETE_FAILED', 500);
        }

        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? '',
            'name' => 'backup_schedule_deleted',
            'context' => 'Deleted backup schedule: ' . ($policy['name'] ?? $id),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(BackupPolicyEvent::onBackupPolicyDeleted(), [
                'policy' => $policy,
                'deleted_by' => $request->get('user'),
            ]);
        }

        return ApiResponse::success([], 'Backup schedule deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/backup-schedules/{id}/run',
        summary: 'Run admin backup schedule now',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function runNow(Request $request, int $id): Response
    {
        $policy = BackupPolicy::getPolicyById($id);
        if (!$policy) {
            return ApiResponse::error('Backup schedule not found', 'BACKUP_SCHEDULE_NOT_FOUND', 404);
        }

        if ((int) ($policy['is_processing'] ?? 0) === 1) {
            return ApiResponse::error('Backup schedule is already running', 'ALREADY_RUNNING', 409);
        }

        if (!BackupPolicy::updatePolicy($id, ['is_processing' => 1])) {
            return ApiResponse::error('Failed to claim backup schedule', 'CLAIM_FAILED', 500);
        }

        try {
            global $eventManager;
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(BackupPolicyEvent::onBackupPolicyRunStarted(), [
                    'policy' => $policy,
                    'manual' => true,
                    'triggered_by' => $request->get('user'),
                ]);
            }

            $result = (new BackupPolicyRunner())->run($policy, ['manual' => true]);

            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(BackupPolicyEvent::onBackupPolicyRunCompleted(), [
                    'policy' => $policy,
                    'result' => $result,
                    'manual' => true,
                ]);
            }

            Activity::createActivity([
                'user_uuid' => $request->get('user')['uuid'] ?? '',
                'name' => 'backup_schedule_run',
                'context' => 'Manually ran backup schedule: ' . ($policy['name'] ?? $id),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success($result, 'Backup schedule run completed', 200);
        } catch (\Throwable $e) {
            BackupPolicy::updatePolicy($id, ['is_processing' => 0]);
            App::getInstance(true)->getLogger()->error('Manual backup schedule run failed: ' . $e->getMessage());

            return ApiResponse::error('Backup schedule run failed: ' . $e->getMessage(), 'RUN_FAILED', 500);
        }
    }

    #[OA\Get(
        path: '/api/admin/backup-schedules/{id}/runs',
        summary: 'List backup schedule runs',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function runs(Request $request, int $id): Response
    {
        $policy = BackupPolicy::getPolicyById($id);
        if (!$policy) {
            return ApiResponse::error('Backup schedule not found', 'BACKUP_SCHEDULE_NOT_FOUND', 404);
        }

        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));
        $result = BackupPolicyRun::searchRuns($id, $page, $limit);
        $total = $result['total'];
        $totalPages = (int) ceil($total / $limit);

        return ApiResponse::success([
            'policy' => $this->enrichPolicy($policy),
            'runs' => $result['runs'],
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
            ],
        ], 'Backup schedule runs fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/backup-schedules/{id}/runs/{runId}',
        summary: 'Get backup schedule run details',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function runShow(Request $request, int $id, int $runId): Response
    {
        $policy = BackupPolicy::getPolicyById($id);
        if (!$policy) {
            return ApiResponse::error('Backup schedule not found', 'BACKUP_SCHEDULE_NOT_FOUND', 404);
        }

        $run = BackupPolicyRun::getRunById($runId);
        if (!$run || (int) $run['policy_id'] !== $id) {
            return ApiResponse::error('Backup schedule run not found', 'BACKUP_SCHEDULE_RUN_NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'policy' => $this->enrichPolicy($policy),
            'run' => $run,
            'items' => BackupPolicyRun::getItemsForRun($runId),
        ], 'Backup schedule run fetched successfully', 200);
    }

    #[OA\Post(
        path: '/api/admin/backup-schedules/preview-targets',
        summary: 'Preview target servers for a backup schedule scope',
        tags: ['Admin - Backup Schedules'],
        responses: [new OA\Response(response: 200, description: 'OK')]
    )]
    public function previewTargets(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        $scopeType = (string) ($data['scope_type'] ?? '');
        if (!in_array($scopeType, BackupPolicy::SCOPE_TYPES, true)) {
            return ApiResponse::error('Invalid scope_type', 'INVALID_SCOPE', 400);
        }

        $fake = [
            'id' => 0,
            'scope_type' => $scopeType,
            'node_id' => isset($data['node_id']) ? (int) $data['node_id'] : null,
        ];

        if ($scopeType === BackupPolicy::SCOPE_SERVERS) {
            $ids = array_values(array_unique(array_filter(array_map('intval', $data['server_ids'] ?? []), fn (int $id) => $id > 0)));
            $servers = [];
            foreach ($ids as $serverId) {
                $server = Server::getServerById($serverId);
                if ($server) {
                    $servers[] = [
                        'id' => (int) $server['id'],
                        'name' => $server['name'],
                        'uuidShort' => $server['uuidShort'],
                        'node_id' => (int) $server['node_id'],
                    ];
                }
            }

            return ApiResponse::success([
                'count' => count($servers),
                'servers' => $servers,
            ], 'Target preview', 200);
        }

        if ($scopeType === BackupPolicy::SCOPE_NODE) {
            $nodeId = (int) ($fake['node_id'] ?? 0);
            if ($nodeId <= 0 || !Node::getNodeById($nodeId)) {
                return ApiResponse::error('Invalid node_id', 'INVALID_NODE', 400);
            }
        }

        $servers = BackupPolicy::resolveTargetServers($fake);
        $preview = array_map(static fn (array $s) => [
            'id' => (int) $s['id'],
            'name' => $s['name'],
            'uuidShort' => $s['uuidShort'],
            'node_id' => (int) $s['node_id'],
        ], array_slice($servers, 0, 50));

        return ApiResponse::success([
            'count' => count($servers),
            'servers' => $preview,
            'truncated' => count($servers) > 50,
        ], 'Target preview', 200);
    }

    /**
     * @param array<string, mixed> $policy
     *
     * @return array<string, mixed>
     */
    private function enrichPolicy(array $policy, bool $includeServers = false): array
    {
        if ($policy === []) {
            return $policy;
        }

        $policyId = (int) ($policy['id'] ?? 0);
        $serverIds = $policyId > 0 ? BackupPolicy::getServerIdsForPolicy($policyId) : [];
        $policy['server_ids'] = $serverIds;
        $policy['target_count'] = count(BackupPolicy::resolveTargetServers($policy));
        $policy['is_active'] = (int) ($policy['is_active'] ?? 0);
        $policy['is_processing'] = (int) ($policy['is_processing'] ?? 0);
        $policy['only_when_online'] = (int) ($policy['only_when_online'] ?? 0);
        $policy['notify_on_failure'] = (int) ($policy['notify_on_failure'] ?? 0);
        $policy['concurrency'] = (int) ($policy['concurrency'] ?? 2);
        $policy['latest_run'] = $policyId > 0 ? BackupPolicyRun::getLatestRunForPolicy($policyId) : null;

        if ($includeServers && $serverIds !== []) {
            $servers = [];
            foreach ($serverIds as $serverId) {
                $server = Server::getServerById($serverId);
                if ($server) {
                    $servers[] = [
                        'id' => (int) $server['id'],
                        'name' => $server['name'],
                        'uuidShort' => $server['uuidShort'],
                        'node_id' => (int) $server['node_id'],
                    ];
                }
            }
            $policy['servers'] = $servers;
        }

        if (!empty($policy['node_id'])) {
            $node = Node::getNodeById((int) $policy['node_id']);
            $policy['node'] = $node ? [
                'id' => (int) $node['id'],
                'name' => $node['name'],
                'fqdn' => $node['fqdn'] ?? null,
            ] : null;
        }

        return $policy;
    }

    /**
     * @param array<string, mixed> $data
     *
     * @return array{policy: array<string, mixed>, server_ids: list<int>}|Response
     */
    private function validatePayload(array $data): array | Response
    {
        $name = trim((string) ($data['name'] ?? ''));
        if ($name === '' || strlen($name) > 191) {
            return ApiResponse::error('Name is required (max 191 characters)', 'INVALID_NAME', 400);
        }

        $scopeType = (string) ($data['scope_type'] ?? '');
        if (!in_array($scopeType, BackupPolicy::SCOPE_TYPES, true)) {
            return ApiResponse::error('Invalid scope_type', 'INVALID_SCOPE', 400);
        }

        $cronFields = ['cron_minute', 'cron_hour', 'cron_day_of_month', 'cron_month', 'cron_day_of_week'];
        foreach ($cronFields as $field) {
            if (!isset($data[$field]) || trim((string) $data[$field]) === '') {
                return ApiResponse::error('Missing cron field: ' . $field, 'INVALID_CRON', 400);
            }
        }

        $payload = (string) ($data['backup_payload'] ?? '');
        if ($payload === '') {
            return ApiResponse::error('backup_payload is required', 'INVALID_PAYLOAD', 400);
        }
        try {
            ServerDatabaseDumpService::parseBackupPayload($payload);
        } catch (\InvalidArgumentException $e) {
            return ApiResponse::error('Invalid backup_payload: ' . $e->getMessage(), 'INVALID_PAYLOAD', 400);
        }

        $nodeId = isset($data['node_id']) ? (int) $data['node_id'] : null;
        if ($scopeType === BackupPolicy::SCOPE_NODE) {
            if ($nodeId === null || $nodeId <= 0 || !Node::getNodeById($nodeId)) {
                return ApiResponse::error('Valid node_id is required for node scope', 'INVALID_NODE', 400);
            }
        } else {
            $nodeId = null;
        }

        $serverIds = [];
        if ($scopeType === BackupPolicy::SCOPE_SERVERS) {
            $serverIds = array_values(array_unique(array_filter(array_map('intval', $data['server_ids'] ?? []), fn (int $id) => $id > 0)));
            if ($serverIds === []) {
                return ApiResponse::error('At least one server_id is required for servers scope', 'INVALID_SERVERS', 400);
            }
            foreach ($serverIds as $serverId) {
                if (!Server::getServerById($serverId)) {
                    return ApiResponse::error('Invalid server_id: ' . $serverId, 'INVALID_SERVER', 400);
                }
            }
        }

        $concurrency = isset($data['concurrency']) ? (int) $data['concurrency'] : 2;
        if ($concurrency < 1 || $concurrency > 5) {
            return ApiResponse::error('concurrency must be between 1 and 5', 'INVALID_CONCURRENCY', 400);
        }

        $timezone = trim((string) ($data['timezone'] ?? 'UTC'));
        if ($timezone === '') {
            $timezone = 'UTC';
        }

        $policy = [
            'name' => $name,
            'scope_type' => $scopeType,
            'node_id' => $nodeId,
            'cron_day_of_week' => (string) $data['cron_day_of_week'],
            'cron_month' => (string) $data['cron_month'],
            'cron_day_of_month' => (string) $data['cron_day_of_month'],
            'cron_hour' => (string) $data['cron_hour'],
            'cron_minute' => (string) $data['cron_minute'],
            'timezone' => $timezone,
            'backup_payload' => $payload,
            'concurrency' => $concurrency,
            'only_when_online' => $data['only_when_online'] ?? 0,
            'notify_on_failure' => $data['notify_on_failure'] ?? 1,
            'is_active' => $data['is_active'] ?? 1,
        ];

        return [
            'policy' => $policy,
            'server_ids' => $serverIds,
        ];
    }
}
