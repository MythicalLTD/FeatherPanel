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

use App\Chat\User;
use App\Chat\Server;
use App\Chat\Subuser;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Helpers\ServerGateway;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ServerActivityController
{
    /**
     * Get user's server activities with pagination.
     */
    public function getUserServerActivities(Request $request): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get pagination parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 50)));
        $search = $request->query->get('search', '');

        // Get servers the user owns
        $ownedServers = Server::getServersByOwnerId((int) $user['id']);

        // Get servers where user is a subuser
        $subusers = Subuser::getSubusersByUserId((int) $user['id']);

        // Combine and deduplicate server IDs
        $serverIds = [];
        foreach ($ownedServers as $server) {
            $serverIds[] = (int) $server['id'];
        }
        foreach ($subusers as $subuser) {
            $serverId = (int) $subuser['server_id'];
            if (!in_array($serverId, $serverIds, true)) {
                $serverIds[] = $serverId;
            }
        }

        // Get activities for user's servers (include daemon events with NULL user_id)
        $result = ServerActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $perPage,
            search: $search,
            serverIds: $serverIds,
        );

        // Add server information to activities
        $activities = [];
        foreach ($result['data'] as $activity) {
            $activityData = $activity;

            // Parse metadata if it's JSON
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activityData['metadata'] = $metadata;
                    }
                } catch (\Exception $e) {
                    // Keep original metadata if parsing fails
                }
            }

            $activities[] = $activityData;
        }

        return ApiResponse::success([
            'activities' => $activities,
            'pagination' => $result['pagination'],
        ]);
    }

    /**
     * Get user's recent server activities (last 10).
     */
    public function getRecentServerActivities(Request $request): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get recent activities with server information
        $activities = ServerActivity::getActivitiesByUserIdWithServerInfo($user['id'], 10);

        // Parse metadata for each activity
        foreach ($activities as &$activity) {
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activity['metadata'] = $metadata;
                    }
                } catch (\Exception $e) {
                    // Keep original metadata if parsing fails
                }
            }
        }

        return ApiResponse::success([
            'activities' => $activities,
        ]);
    }

    /**
     * Get activities for a specific server accessible by the user.
     */
    public function getServerActivities(Request $request, int $serverId): Response
    {
        // Get authenticated user
        $user = $request->get('user');
        if (!$user) {
            return ApiResponse::error('User not authenticated', 'UNAUTHORIZED', 401);
        }

        // Get server and validate access
        $server = Server::getServerById($serverId);
        if (!$server) {
            return ApiResponse::error('Server not found', 'NOT_FOUND', 404);
        }

        if (!$this->userCanAccessServer($request, $server)) {
            return ApiResponse::error('Access denied to server', 'FORBIDDEN', 403);
        }

        // Get pagination parameters
        $page = max(1, (int) $request->query->get('page', 1));
        $perPage = max(1, min(100, (int) $request->query->get('per_page', 50)));
        $search = $request->query->get('search', '');

        // Get activities for specific server
        // Many daemon-generated rows have NULL user_id, so do not filter by user here
        $result = ServerActivity::getActivitiesWithPagination(
            page: $page,
            perPage: $perPage,
            search: $search,
            serverId: $serverId,
        );

        // Add server information to activities
        $activities = [];
        foreach ($result['data'] as $activity) {
            $activityData = $activity;

            // Parse metadata if it's JSON
            if (!empty($activity['metadata'])) {
                try {
                    $metadata = json_decode($activity['metadata'], true);
                    if (is_array($metadata)) {
                        $activityData['metadata'] = $metadata;
                    }
                } catch (\Exception $e) {
                    // Keep original metadata if parsing fails
                }
            }

            $activities[] = $activityData;
        }

        return ApiResponse::success([
            'activities' => $activities,
            'pagination' => $result['pagination'],
        ]);
    }

    /**
     * Check if user can access a specific server.
     */
    private function userCanAccessServer(Request $request, array $server): bool
    {
        $user = $request->get('user');
        if (!$user) {
            return false;
        }

        return ServerGateway::canUserAccessServer($user['uuid'], $server['uuid']);
    }
}
