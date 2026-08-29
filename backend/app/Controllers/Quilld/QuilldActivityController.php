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

namespace App\Controllers\Quilld;

use App\App;
use App\Chat\User;
use App\Chat\WebSpace;
use App\Helpers\ApiResponse;
use App\Chat\WebSpaceActivity;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Ingest activity batches from FeatherQuilld daemons.
 */
class QuilldActivityController
{
    public function logActivity(Request $request): Response
    {
        $webNode = $request->attributes->get('quilld_node');
        if (!is_array($webNode)) {
            return ApiResponse::error('Invalid FeatherQuilld authentication', 'INVALID_QUILLD_AUTH', 403);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['data']) || !is_array($data['data'])) {
            return ApiResponse::error('Missing or invalid activity data', 'INVALID_ACTIVITY_DATA', 400);
        }

        $processedCount = 0;
        $errors = [];

        foreach ($data['data'] as $index => $activity) {
            try {
                if (!isset($activity['webspace'], $activity['event'])) {
                    $errors[] = "Activity at index {$index}: Missing webspace or event";
                    continue;
                }

                $uuid = (string) $activity['webspace'];
                if (!WebSpace::isValidUuid($uuid)) {
                    $errors[] = "Activity at index {$index}: Invalid webspace UUID";
                    continue;
                }

                $space = WebSpace::getByUuidAndNodeId($uuid, (int) $webNode['id']);
                if (!$space) {
                    $errors[] = "Activity at index {$index}: WebSpace not found on this node";
                    continue;
                }

                $userId = null;
                $userUuid = $activity['user'] ?? null;
                if (is_string($userUuid) && $userUuid !== '' && WebSpace::isValidUuid($userUuid)) {
                    $user = User::getUserByUuid($userUuid);
                    if ($user) {
                        $userId = (int) $user['id'];
                    }
                }

                $timestamp = $activity['timestamp'] ?? date('Y-m-d H:i:s');
                $timestampObj = \DateTime::createFromFormat('Y-m-d\TH:i:s.v\Z', (string) $timestamp)
                    ?: \DateTime::createFromFormat('Y-m-d\TH:i:s\Z', (string) $timestamp)
                    ?: \DateTime::createFromFormat('Y-m-d H:i:s', (string) $timestamp)
                    ?: new \DateTime();

                $metadata = $activity['metadata'] ?? [];
                $activityId = WebSpaceActivity::createActivity([
                    'webspace_id' => (int) $space['id'],
                    'web_node_id' => (int) $webNode['id'],
                    'user_id' => $userId,
                    'ip' => $activity['ip'] ?? null,
                    'event' => (string) $activity['event'],
                    'metadata' => is_array($metadata) ? $metadata : null,
                    'timestamp' => $timestampObj->format('Y-m-d H:i:s'),
                ]);

                if ($activityId) {
                    ++$processedCount;
                } else {
                    $errors[] = "Activity at index {$index}: Failed to store";
                }
            } catch (\Throwable $e) {
                $errors[] = "Activity at index {$index}: " . $e->getMessage();
                App::getInstance(true)->getLogger()->error('Quilld activity ingest: ' . $e->getMessage());
            }
        }

        if ($errors === []) {
            return ApiResponse::success([
                'message' => "Successfully processed {$processedCount} activity logs",
                'processed_count' => $processedCount,
            ]);
        }

        return ApiResponse::error(
            "Processed {$processedCount} activities with " . count($errors) . ' errors',
            'ACTIVITY_PROCESSING_ERRORS',
            207,
            [
                'processed_count' => $processedCount,
                'error_count' => count($errors),
                'errors' => $errors,
            ],
        );
    }
}
