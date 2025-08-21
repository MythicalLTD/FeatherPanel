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

namespace App\Controllers\Admin;

use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerActivitiesController
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = (string) $request->query->get('search', '');
        $serverId = $request->query->get('server_id');
        $nodeId = $request->query->get('node_id');
        $userId = $request->query->get('user_id');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $serverId = $serverId !== null ? (int) $serverId : null;
        $nodeId = $nodeId !== null ? (int) $nodeId : null;
        $userId = $userId !== null ? (int) $userId : null;

        $result = ServerActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $limit,
            search: $search,
            serverId: $serverId,
            nodeId: $nodeId,
            userId: $userId,
        );

        $activities = [];
        foreach ($result['data'] as $activity) {
            $activityData = $activity;
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activityData['metadata'] = $metadata;
                    }
                } catch (\Exception) {
                    // Keep original metadata if parsing fails
                }
            }
            $activities[] = $activityData;
        }

        $pagination = $result['pagination'];
        $totalPages = (int) $pagination['last_page'];

        return ApiResponse::success([
            'activities' => $activities,
            'pagination' => [
                'current_page' => $pagination['current_page'],
                'per_page' => $pagination['per_page'],
                'total_records' => $pagination['total'],
                'total_pages' => $totalPages,
                'has_next' => $pagination['current_page'] < $totalPages,
                'has_prev' => $pagination['current_page'] > 1,
                'from' => $pagination['from'],
                'to' => $pagination['to'],
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($activities) > 0,
            ],
        ], 'Server activities fetched successfully', 200);
    }

    public function byServer(Request $request, int $serverId): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = (string) $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        $result = ServerActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $limit,
            search: $search,
            serverId: $serverId,
        );

        $activities = [];
        foreach ($result['data'] as $activity) {
            $activityData = $activity;
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activityData['metadata'] = $metadata;
                    }
                } catch (\Exception) {
                    // Keep original metadata if parsing fails
                }
            }
            $activities[] = $activityData;
        }

        $pagination = $result['pagination'];
        $totalPages = (int) $pagination['last_page'];

        return ApiResponse::success([
            'activities' => $activities,
            'pagination' => [
                'current_page' => $pagination['current_page'],
                'per_page' => $pagination['per_page'],
                'total_records' => $pagination['total'],
                'total_pages' => $totalPages,
                'has_next' => $pagination['current_page'] < $totalPages,
                'has_prev' => $pagination['current_page'] > 1,
                'from' => $pagination['from'],
                'to' => $pagination['to'],
            ],
            'search' => [
                'query' => $search,
                'has_results' => count($activities) > 0,
            ],
        ], 'Server activities fetched successfully', 200);
    }
}
