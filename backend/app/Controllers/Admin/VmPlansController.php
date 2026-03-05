<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studio
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
use App\Chat\VmPlan;
use App\Chat\VmInstance;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class VmPlansController
{
    /** GET /api/admin/vm-plans — list all plans with instance counts (optionally filtered by vm_node_id) */
    public function index(Request $request): Response
    {
        $vmNodeId = $request->query->get('vm_node_id');
        $vmNodeId = ($vmNodeId !== null && $vmNodeId !== '') ? (int) $vmNodeId : null;
        $plans = VmPlan::getAll(false, $vmNodeId);

        // Attach instance count to each plan
        foreach ($plans as &$plan) {
            $plan['instance_count'] = 0;
        }

        try {
            $pdo = \App\Chat\Database::getPdoConnection();
            $stmt = $pdo->prepare(
                'SELECT plan_id, COUNT(*) AS cnt FROM featherpanel_vm_instances WHERE plan_id IS NOT NULL GROUP BY plan_id'
            );
            $stmt->execute();
            $counts = [];
            foreach ($stmt->fetchAll(\PDO::FETCH_ASSOC) as $row) {
                $counts[(int) $row['plan_id']] = (int) $row['cnt'];
            }
            foreach ($plans as &$plan) {
                $plan['instance_count'] = $counts[(int) $plan['id']] ?? 0;
            }
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('VmPlansController::index — could not fetch counts: ' . $e->getMessage());
        }

        return ApiResponse::success(['plans' => $plans, 'total' => count($plans)], 'VM plans fetched successfully', 200);
    }

    /** GET /api/admin/vm-plans/{id} */
    public function show(Request $request, int $id): Response
    {
        $plan = VmPlan::getById($id);
        if (!$plan) {
            return ApiResponse::error('VM plan not found', 'VM_PLAN_NOT_FOUND', 404);
        }

        return ApiResponse::success(['plan' => $plan], 'VM plan fetched successfully', 200);
    }

    /** PUT /api/admin/vm-plans — create a new plan */
    public function create(Request $request): Response
    {
        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        try {
            $admin = $request->get('user');
            $plan = VmPlan::create($body);
            Activity::createActivity([
                'user_uuid'  => $admin['uuid'] ?? null,
                'name'       => 'vm_plan_create',
                'context'    => 'Created VM plan: ' . $plan['name'] . ' (ID ' . $plan['id'] . ')',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(['plan' => $plan], 'VM plan created successfully', 201);
        } catch (\InvalidArgumentException $e) {
            $errors = json_decode($e->getMessage(), true) ?? [];

            return ApiResponse::error('Validation failed', 'VALIDATION_FAILED', 422, ['errors' => $errors]);
        }
    }

    /** PATCH /api/admin/vm-plans/{id} — update an existing plan */
    public function update(Request $request, int $id): Response
    {
        $plan = VmPlan::getById($id);
        if (!$plan) {
            return ApiResponse::error('VM plan not found', 'VM_PLAN_NOT_FOUND', 404);
        }

        $body = json_decode($request->getContent(), true);
        if (!is_array($body)) {
            return ApiResponse::error('Invalid JSON body', 'INVALID_JSON', 400);
        }

        try {
            $admin = $request->get('user');
            $updated = VmPlan::update($id, $body);
            Activity::createActivity([
                'user_uuid'  => $admin['uuid'] ?? null,
                'name'       => 'vm_plan_update',
                'context'    => 'Updated VM plan: ' . $updated['name'] . ' (ID ' . $id . ')',
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            return ApiResponse::success(['plan' => $updated], 'VM plan updated successfully', 200);
        } catch (\InvalidArgumentException $e) {
            $errors = json_decode($e->getMessage(), true) ?? [];

            return ApiResponse::error('Validation failed', 'VALIDATION_FAILED', 422, ['errors' => $errors]);
        }
    }

    /** DELETE /api/admin/vm-plans/{id} */
    public function delete(Request $request, int $id): Response
    {
        $plan = VmPlan::getById($id);
        if (!$plan) {
            return ApiResponse::error('VM plan not found', 'VM_PLAN_NOT_FOUND', 404);
        }

        $deleted = VmPlan::delete($id);
        if (!$deleted) {
            return ApiResponse::error(
                'Cannot delete plan — it is still assigned to one or more VM instances.',
                'VM_PLAN_IN_USE',
                409
            );
        }

        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid'  => $admin['uuid'] ?? null,
            'name'       => 'vm_plan_delete',
            'context'    => 'Deleted VM plan: ' . $plan['name'] . ' (ID ' . $id . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'VM plan deleted successfully', 200);
    }

    /** GET /api/admin/vm-plans/stats — summary counts for the dashboard */
    public function stats(Request $request): Response
    {
        $statusCounts = VmInstance::countByStatus();
        $totalInstances = array_sum($statusCounts);

        return ApiResponse::success([
            'plans_total'     => VmPlan::count(),
            'instances_total' => $totalInstances,
            'instances_running'  => $statusCounts['running'] ?? 0,
            'instances_stopped'  => $statusCounts['stopped'] ?? 0,
            'instances_error'    => $statusCounts['error'] ?? 0,
            'instances_by_status' => $statusCounts,
        ], 'VM stats fetched', 200);
    }

    /** GET /api/admin/vm-instances — paginated list of all VM instances */
    public function instances(Request $request): Response
    {
        $page   = max(1, (int) $request->query->get('page', 1));
        $limit  = min(100, max(1, (int) $request->query->get('limit', 25)));
        $search = $request->query->get('search', null);

        $instances   = VmInstance::getAll($page, $limit, $search);
        $total       = VmInstance::countAll($search);
        $totalPages  = (int) ceil($total / $limit);
        $statusCounts = VmInstance::countByStatus();

        return ApiResponse::success([
            'instances'     => $instances,
            'status_counts' => $statusCounts,
            'pagination'    => [
                'current_page' => $page,
                'per_page'     => $limit,
                'total_records' => $total,
                'total_pages'  => $totalPages,
                'has_next'     => $page < $totalPages,
                'has_prev'     => $page > 1,
            ],
        ], 'VM instances fetched successfully', 200);
    }
}
