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
use App\Chat\Activity;
use App\Chat\NodeBackupRun;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Chat\NodeBackupPolicy;
use App\Chat\NodeBackupDestination;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\NodeBackup\DestinationFactory;
use App\Services\NodeBackup\NodeBackupAgentRunner;
use App\Services\NodeBackup\NodeBackupRetentionService;

class WingsBackupsController
{
    #[OA\Get(path: '/api/admin/wings-backups/destinations', summary: 'List Wings backup destinations', tags: ['Admin - Wings Backups'])]
    public function destinationsIndex(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 25)));
        $search = trim((string) $request->query->get('search', ''));
        $result = NodeBackupDestination::search($page, $limit, $search);
        $rows = array_map(fn (array $row) => $this->sanitizeDestination($row), $result['destinations'] ?? $result['items'] ?? []);

        return ApiResponse::success([
            'destinations' => $rows,
            'pagination' => $this->pagination($result, $page, $limit),
        ], 'Destinations fetched', 200);
    }

    #[OA\Put(path: '/api/admin/wings-backups/destinations', summary: 'Create Wings backup destination', tags: ['Admin - Wings Backups'])]
    public function destinationsCreate(Request $request): Response
    {
        $data = json_decode($request->getContent(), true) ?: [];
        $id = NodeBackupDestination::create([
            'name' => (string) ($data['name'] ?? ''),
            'type' => (string) ($data['type'] ?? ''),
            'credentials' => $data['credentials'] ?? [],
            'base_path' => (string) ($data['base_path'] ?? ''),
            'is_mirror' => (int) ($data['is_mirror'] ?? 0),
            'mirror_of' => isset($data['mirror_of']) ? (int) $data['mirror_of'] : null,
        ]);
        if ($id === false) {
            return ApiResponse::error('Failed to create destination', 'DESTINATION_CREATE_FAILED', 400);
        }
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? '',
            'name' => 'wings_backup_destination_created',
            'context' => 'Created Wings backup destination #' . $id,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
        $row = NodeBackupDestination::getById($id);

        return ApiResponse::success(['destination' => $this->sanitizeDestination($row ?: [])], 'Destination created', 201);
    }

    #[OA\Patch(path: '/api/admin/wings-backups/destinations/{id}', summary: 'Update Wings backup destination', tags: ['Admin - Wings Backups'])]
    public function destinationsUpdate(Request $request, int $id): Response
    {
        $existing = NodeBackupDestination::getById($id);
        if (!$existing) {
            return ApiResponse::error('Destination not found', 'DESTINATION_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true) ?: [];
        if (!NodeBackupDestination::update($id, $data)) {
            return ApiResponse::error('Failed to update destination', 'DESTINATION_UPDATE_FAILED', 400);
        }
        $row = NodeBackupDestination::getById($id);

        return ApiResponse::success(['destination' => $this->sanitizeDestination($row ?: [])], 'Destination updated', 200);
    }

    #[OA\Delete(path: '/api/admin/wings-backups/destinations/{id}', summary: 'Delete Wings backup destination', tags: ['Admin - Wings Backups'])]
    public function destinationsDelete(Request $request, int $id): Response
    {
        if (!NodeBackupDestination::getById($id)) {
            return ApiResponse::error('Destination not found', 'DESTINATION_NOT_FOUND', 404);
        }
        if (!NodeBackupDestination::delete($id)) {
            return ApiResponse::error('Failed to delete destination (in use?)', 'DESTINATION_DELETE_FAILED', 400);
        }

        return ApiResponse::success([], 'Destination deleted', 200);
    }

    #[OA\Post(path: '/api/admin/wings-backups/destinations/{id}/test', summary: 'Test Wings backup destination', tags: ['Admin - Wings Backups'])]
    public function destinationsTest(Request $request, int $id): Response
    {
        $row = NodeBackupDestination::getById($id);
        if (!$row) {
            return ApiResponse::error('Destination not found', 'DESTINATION_NOT_FOUND', 404);
        }
        try {
            DestinationFactory::fromRow($row)->test();
            NodeBackupDestination::update($id, [
                'last_tested_at' => gmdate('Y-m-d H:i:s'),
                'last_test_ok' => 1,
                'last_test_error' => null,
            ]);

            return ApiResponse::success(['ok' => true], 'Destination test succeeded', 200);
        } catch (\Throwable $e) {
            NodeBackupDestination::update($id, [
                'last_tested_at' => gmdate('Y-m-d H:i:s'),
                'last_test_ok' => 0,
                'last_test_error' => $e->getMessage(),
            ]);

            return ApiResponse::error($e->getMessage(), 'DESTINATION_TEST_FAILED', 400);
        }
    }

    #[OA\Post(path: '/api/admin/wings-backups/destinations/{id}/purge', summary: 'Purge old objects on destination', tags: ['Admin - Wings Backups'])]
    public function destinationsPurge(Request $request, int $id): Response
    {
        $data = json_decode($request->getContent(), true) ?: [];
        $days = (int) ($data['retention_days'] ?? 90);
        $result = (new NodeBackupRetentionService())->purgeDestination($id, $days);

        return ApiResponse::success($result, 'Purge completed', 200);
    }

    #[OA\Get(path: '/api/admin/wings-backups/policies', summary: 'List Wings backup policies', tags: ['Admin - Wings Backups'])]
    public function policiesIndex(Request $request): Response
    {
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 10)));
        $search = trim((string) $request->query->get('search', ''));
        $result = NodeBackupPolicy::searchPolicies($page, $limit, $search);
        $policies = [];
        foreach ($result['policies'] ?? [] as $policy) {
            $policies[] = $this->enrichPolicy($policy);
        }

        return ApiResponse::success([
            'policies' => $policies,
            'pagination' => $this->pagination($result, $page, $limit),
        ], 'Policies fetched', 200);
    }

    #[OA\Get(path: '/api/admin/wings-backups/policies/{id}', summary: 'Get Wings backup policy', tags: ['Admin - Wings Backups'])]
    public function policiesShow(Request $request, int $id): Response
    {
        $policy = NodeBackupPolicy::getPolicyById($id);
        if (!$policy) {
            return ApiResponse::error('Policy not found', 'POLICY_NOT_FOUND', 404);
        }

        return ApiResponse::success(['policy' => $this->enrichPolicy($policy, true)], 'Policy fetched', 200);
    }

    #[OA\Put(path: '/api/admin/wings-backups/policies', summary: 'Create Wings backup policy', tags: ['Admin - Wings Backups'])]
    public function policiesCreate(Request $request): Response
    {
        $data = json_decode($request->getContent(), true) ?: [];
        $nodeIds = array_map('intval', $data['node_ids'] ?? []);
        $mirrorIds = array_map('intval', $data['mirror_destination_ids'] ?? []);
        $id = NodeBackupPolicy::createPolicy($data, $nodeIds, $mirrorIds);
        if ($id === false) {
            return ApiResponse::error('Failed to create policy', 'POLICY_CREATE_FAILED', 400);
        }
        $policy = NodeBackupPolicy::getPolicyById($id);

        return ApiResponse::success(['policy' => $this->enrichPolicy($policy ?: [], true)], 'Policy created', 201);
    }

    #[OA\Patch(path: '/api/admin/wings-backups/policies/{id}', summary: 'Update Wings backup policy', tags: ['Admin - Wings Backups'])]
    public function policiesUpdate(Request $request, int $id): Response
    {
        if (!NodeBackupPolicy::getPolicyById($id)) {
            return ApiResponse::error('Policy not found', 'POLICY_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true) ?: [];
        $nodeIds = isset($data['node_ids']) ? array_map('intval', $data['node_ids']) : null;
        $mirrorIds = isset($data['mirror_destination_ids']) ? array_map('intval', $data['mirror_destination_ids']) : null;
        if (!NodeBackupPolicy::updatePolicy($id, $data, $nodeIds, $mirrorIds)) {
            return ApiResponse::error('Failed to update policy', 'POLICY_UPDATE_FAILED', 400);
        }

        return ApiResponse::success(['policy' => $this->enrichPolicy(NodeBackupPolicy::getPolicyById($id) ?: [], true)], 'Policy updated', 200);
    }

    #[OA\Delete(path: '/api/admin/wings-backups/policies/{id}', summary: 'Delete Wings backup policy', tags: ['Admin - Wings Backups'])]
    public function policiesDelete(Request $request, int $id): Response
    {
        if (!NodeBackupPolicy::deletePolicy($id)) {
            return ApiResponse::error('Failed to delete policy', 'POLICY_DELETE_FAILED', 400);
        }

        return ApiResponse::success([], 'Policy deleted', 200);
    }

    #[OA\Post(path: '/api/admin/wings-backups/policies/{id}/run', summary: 'Run Wings backup policy now', tags: ['Admin - Wings Backups'])]
    public function policiesRun(Request $request, int $id): Response
    {
        $policy = NodeBackupPolicy::getPolicyById($id);
        if (!$policy) {
            return ApiResponse::error('Policy not found', 'POLICY_NOT_FOUND', 404);
        }
        try {
            $result = (new NodeBackupAgentRunner())->run($policy);

            return ApiResponse::success($result, 'Policy run completed', 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Wings backup run failed: ' . $e->getMessage());

            return ApiResponse::error($e->getMessage(), 'POLICY_RUN_FAILED', 500);
        }
    }

    #[OA\Get(path: '/api/admin/wings-backups/policies/{id}/runs', summary: 'List Wings backup policy runs', tags: ['Admin - Wings Backups'])]
    public function policiesRuns(Request $request, int $id): Response
    {
        if (!NodeBackupPolicy::getPolicyById($id)) {
            return ApiResponse::error('Policy not found', 'POLICY_NOT_FOUND', 404);
        }
        $page = max(1, (int) $request->query->get('page', 1));
        $limit = min(100, max(1, (int) $request->query->get('limit', 20)));
        $result = NodeBackupRun::getRunsForPolicy($id, $page, $limit);

        return ApiResponse::success([
            'runs' => $result['runs'] ?? [],
            'pagination' => $this->pagination($result, $page, $limit),
        ], 'Runs fetched', 200);
    }

    #[OA\Get(path: '/api/admin/wings-backups/policies/{id}/runs/{runId}', summary: 'Show Wings backup run', tags: ['Admin - Wings Backups'])]
    public function policiesRunShow(Request $request, int $id, int $runId): Response
    {
        $run = NodeBackupRun::getRunById($runId);
        if (!$run || (int) ($run['policy_id'] ?? 0) !== $id) {
            return ApiResponse::error('Run not found', 'RUN_NOT_FOUND', 404);
        }

        return ApiResponse::success([
            'run' => $run,
            'items' => NodeBackupRun::getItemsForRun($runId),
        ], 'Run fetched', 200);
    }

    /**
     * @param array<string, mixed> $row
     *
     * @return array<string, mixed>
     */
    private function sanitizeDestination(array $row): array
    {
        unset($row['credentials_encrypted']);
        $row['has_credentials'] = true;

        return $row;
    }

    /**
     * @param array<string, mixed> $policy
     *
     * @return array<string, mixed>
     */
    private function enrichPolicy(array $policy, bool $detail = false): array
    {
        if ($policy === []) {
            return $policy;
        }
        $id = (int) ($policy['id'] ?? 0);
        $policy['node_ids'] = NodeBackupPolicy::getNodeIdsForPolicy($id);
        $policy['mirror_destination_ids'] = NodeBackupPolicy::getMirrorDestinationIds($id);
        if ($detail) {
            $policy['nodes'] = NodeBackupPolicy::resolveTargetNodes($policy);
            $primaryId = (int) ($policy['primary_destination_id'] ?? 0);
            $primary = $primaryId > 0 ? NodeBackupDestination::getById($primaryId) : null;
            $policy['primary_destination'] = $primary ? $this->sanitizeDestination($primary) : null;
        }

        return $policy;
    }

    /**
     * @param array<string, mixed> $result
     *
     * @return array<string, mixed>
     */
    private function pagination(array $result, int $page, int $limit): array
    {
        $total = (int) ($result['total'] ?? 0);
        $totalPages = (int) ceil(max(1, $total) / $limit);
        $from = $total === 0 ? 0 : ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return [
            'current_page' => $page,
            'per_page' => $limit,
            'total_records' => $total,
            'total_pages' => max(1, $totalPages),
            'has_next' => $page < $totalPages,
            'has_prev' => $page > 1,
            'from' => $from,
            'to' => $to,
        ];
    }
}
