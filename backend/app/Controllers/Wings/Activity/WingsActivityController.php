<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\Wings\Activity;

use App\App;
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Server;
use App\Permissions;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Helpers\PermissionHelper;
use App\Plugins\Events\Events\WingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'WingsActivityLog',
    type: 'object',
    required: ['server', 'event'],
    properties: [
        new OA\Property(property: 'user', type: 'string', format: 'uuid', description: 'User UUID (nullable)', nullable: true),
        new OA\Property(property: 'server', type: 'string', format: 'uuid', description: 'Server UUID'),
        new OA\Property(property: 'event', type: 'string', description: 'Activity event name'),
        new OA\Property(property: 'metadata', type: 'object', description: 'Additional activity metadata'),
        new OA\Property(property: 'ip', type: 'string', description: 'IP address of the user'),
        new OA\Property(property: 'timestamp', type: 'string', format: 'date-time', description: 'Activity timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'WingsActivityRequest',
    type: 'object',
    required: ['data'],
    properties: [
        new OA\Property(property: 'data', type: 'array', items: new OA\Items(ref: '#/components/schemas/WingsActivityLog'), description: 'Array of activity logs'),
    ]
)]
#[OA\Schema(
    schema: 'WingsActivityResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
        new OA\Property(property: 'processed_count', type: 'integer', description: 'Number of activities processed successfully'),
    ]
)]
#[OA\Schema(
    schema: 'WingsActivityErrorResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Error message'),
        new OA\Property(property: 'processed_count', type: 'integer', description: 'Number of activities processed successfully'),
        new OA\Property(property: 'error_count', type: 'integer', description: 'Number of activities that failed'),
        new OA\Property(property: 'errors', type: 'array', items: new OA\Items(type: 'string'), description: 'Array of error messages'),
    ]
)]
class WingsActivityController
{
    #[OA\Post(
        path: '/api/remote/activity',
        summary: 'Log server activities',
        description: 'Log server activities from Wings daemon. Processes multiple activity logs in a single request with validation and error handling. Requires Wings node token authentication (token ID and secret).',
        tags: ['Wings - Activity'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/WingsActivityRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'All activities logged successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/WingsActivityResponse')
            ),
            new OA\Response(
                response: 207,
                description: 'Multi-status - Some activities processed with errors',
                content: new OA\JsonContent(ref: '#/components/schemas/WingsActivityErrorResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid JSON, missing activity data, invalid server UUID format, or invalid user UUID format'),
            new OA\Response(response: 401, description: 'Unauthorized - Invalid Wings authentication'),
            new OA\Response(response: 403, description: 'Forbidden - Invalid Wings authentication'),
            new OA\Response(response: 500, description: 'Internal server error'),
        ]
    )]
    public function logActivity(Request $request): Response
    {
        // Get Wings authentication attributes from request
        $tokenId = $request->attributes->get('wings_token_id');
        $tokenSecret = $request->attributes->get('wings_token_secret');

        if (!$tokenId || !$tokenSecret) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get node info
        $node = Node::getNodeByWingsAuth($tokenId, $tokenSecret);

        if (!$node) {
            return ApiResponse::error('Invalid Wings authentication', 'INVALID_WINGS_AUTH', 403);
        }

        // Get request data
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }

        // Validate required data
        if (!isset($data['data']) || !is_array($data['data'])) {
            return ApiResponse::error('Missing or invalid activity data', 'INVALID_ACTIVITY_DATA', 400);
        }

        $activities = $data['data'];
        $processedCount = 0;
        $errors = [];

        // Process each activity log
        foreach ($activities as $index => $activity) {
            try {
                // Validate required fields
                if (!isset($activity['server']) || !isset($activity['event'])) {
                    $errors[] = "Activity at index {$index}: Missing required fields 'server' or 'event'";
                    continue;
                }

                $serverUuid = $activity['server'];
                $event = $activity['event'];
                $metadata = $activity['metadata'] ?? [];
                $timestamp = $activity['timestamp'] ?? date('Y-m-d H:i:s');
                $userUuid = $activity['user'] ?? null; // User UUID from top level
                $ipAddress = $activity['ip'] ?? null; // IP address from top level

                // Validate server UUID format
                if (!preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $serverUuid)) {
                    $errors[] = "Activity at index {$index}: Invalid server UUID format";
                    continue;
                }

                // Get server by UUID and verify it belongs to this node
                $server = Server::getServerByUuid($serverUuid);
                if (!$server) {
                    $errors[] = "Activity at index {$index}: Server not found";
                    continue;
                }

                // Verify server belongs to this node
                if ($server['node_id'] != $node['id']) {
                    $errors[] = "Activity at index {$index}: Server does not belong to this node";
                    continue;
                }

                // Get user information
                $userId = null;

                if ($userUuid !== null && !empty($userUuid)) {
                    // Validate user UUID format
                    if (preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i', $userUuid)) {
                        // Get user by UUID
                        $user = User::getUserByUuid($userUuid);
                        if ($user) {
                            $userId = $user['id'];

                            // Verify user owns the server (optional security check)
                            if (
                                $server['owner_id'] != $userId
                                && !PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_VIEW)
                                && !PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_EDIT)
                                && !PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_SERVERS_DELETE)
                            ) {
                                // Log warning but don't fail - user might be admin or have special permissions
                                App::getInstance(true)->getLogger()->warning(
                                    "Activity user ({$userUuid}) does not own server ({$serverUuid})"
                                );
                            }
                        } else {
                            // Log warning but don't fail - user might not exist in our system
                            App::getInstance(true)->getLogger()->warning(
                                "Activity user ({$userUuid}) not found in system"
                            );
                        }
                    } else {
                        $errors[] = "Activity at index {$index}: Invalid user UUID format";
                        continue;
                    }
                }

                // Validate timestamp format
                $timestampObj = \DateTime::createFromFormat('Y-m-d\TH:i:s.v\Z', $timestamp);
                if (!$timestampObj) {
                    $timestampObj = \DateTime::createFromFormat('Y-m-d\TH:i:s\Z', $timestamp);
                }
                if (!$timestampObj) {
                    $timestampObj = \DateTime::createFromFormat('Y-m-d H:i:s', $timestamp);
                }
                if (!$timestampObj) {
                    $timestampObj = new \DateTime();
                }

                // Prepare activity data
                $activityData = [
                    'server_id' => $server['id'],
                    'node_id' => $node['id'],
                    'user_id' => $userId, // Link to user if found
                    'ip' => $ipAddress, // IP address from Wings
                    'event' => $event,
                    'metadata' => is_array($metadata) ? json_encode($metadata) : $metadata,
                    'timestamp' => $timestampObj->format('Y-m-d H:i:s'),
                ];

                // Store activity log
                $activityId = ServerActivity::createActivity($activityData);
                if ($activityId) {
                    ++$processedCount;
                } else {
                    $errors[] = "Activity at index {$index}: Failed to store activity log";
                }
            } catch (\Exception $e) {
                $errors[] = "Activity at index {$index}: " . $e->getMessage();
            }
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            WingsEvent::onWingsActivityLogged(),
            [
                'node' => $node,
                'activities' => $activities,
                'processed_count' => $processedCount,
                'error_count' => count($errors),
                'errors' => $errors,
            ]
        );

        // Return response
        if (empty($errors)) {
            return ApiResponse::success([
                'message' => "Successfully processed {$processedCount} activity logs",
                'processed_count' => $processedCount,
            ]);
        }

        return ApiResponse::error(
            "Processed {$processedCount} activities with " . count($errors) . ' errors',
            'ACTIVITY_PROCESSING_ERRORS',
            207, // Multi-status
            [
                'processed_count' => $processedCount,
                'error_count' => count($errors),
                'errors' => $errors,
            ]
        );
    }
}
