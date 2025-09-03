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

namespace App\Controllers\Wings\Activity;

use App\App;
use App\Chat\Node;
use App\Chat\User;
use App\Chat\Server;
use App\Chat\ServerActivity;
use App\Helpers\ApiResponse;
use App\Helpers\PermissionHelper;
use App\Permissions;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class WingsActivityController
{
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

				// Get user information from metadata
				$userId = null;
				$userUuid = null;

				if (isset($metadata['user']) && !empty($metadata['user'])) {
					$userUuid = $metadata['user'];

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
						$errors[] = "Activity at index {$index}: Invalid user UUID format in metadata";
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
