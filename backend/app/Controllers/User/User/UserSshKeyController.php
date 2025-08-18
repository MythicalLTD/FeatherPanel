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

namespace App\Controllers\User\User;

use App\Chat\User;
use App\Chat\Activity;
use App\Chat\UserSshKey;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class UserSshKeyController
{
    /**
     * Get all SSH keys for the authenticated user.
     */
    public function getUserSshKeys(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');
        $includeDeleted = $request->query->get('include_deleted', 'false') === 'true';

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        // Get user's SSH keys with pagination and search
        $sshKeys = UserSshKey::searchUserSshKeys(
            page: $page,
            limit: $limit,
            search: $search,
            userId: $user['id'],
            includeDeleted: $includeDeleted
        );

        // Sanitize sensitive data for response
        foreach ($sshKeys as &$key) {
            unset($key['public_key'], $key['fingerprint']); // Don't expose full public key in list
            // Don't expose fingerprint in list
        }

        $total = UserSshKey::getCount($search, $user['id']);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'ssh_keys' => $sshKeys,
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
                'has_results' => count($sshKeys) > 0,
            ],
        ], 'User SSH keys fetched successfully', 200);
    }

    /**
     * Get a specific SSH key by ID.
     */
    public function getUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        $sshKey = UserSshKey::getUserSshKeyById($id);
        if (!$sshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        // Ensure the user can only access their own SSH keys
        if ($sshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        return ApiResponse::success($sshKey, 'SSH key fetched successfully', 200);
    }

    /**
     * Create a new SSH key for the authenticated user.
     */
    public function createUserSshKey(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        // Validate required fields
        $required = ['name', 'public_key'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                return ApiResponse::error("Missing required field: $field", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate data length
        if (strlen($data['name']) < 1 || strlen($data['name']) > 191) {
            return ApiResponse::error('Name must be between 1 and 191 characters', 'INVALID_NAME_LENGTH', 400);
        }

        // Add user_id to the data
        $data['user_id'] = $user['id'];

        // Create the SSH key
        $sshKeyId = UserSshKey::createUserSshKey($data);
        if ($sshKeyId === false) {
            return ApiResponse::error('Failed to create SSH key', 'SSH_KEY_CREATION_FAILED', 500);
        }

        // Get the created SSH key
        $sshKey = UserSshKey::getUserSshKeyById($sshKeyId);
        if (!$sshKey) {
            return ApiResponse::error('SSH key created but failed to retrieve', 'SSH_KEY_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_created',
            'context' => 'Created SSH key: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success($sshKey, 'SSH key created successfully', 201);
    }

    /**
     * Update an existing SSH key.
     */
    public function updateUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user
        $existingSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$existingSshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        if ($existingSshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        // Validate allowed fields
        $allowedFields = ['name', 'public_key'];
        $validData = [];
        foreach ($data as $key => $value) {
            if (in_array($key, $allowedFields)) {
                $validData[$key] = $value;
            }
        }

        if (empty($validData)) {
            return ApiResponse::error('No valid fields to update', 'NO_VALID_FIELDS', 400);
        }

        // Validate data length
        if (isset($validData['name']) && (strlen($validData['name']) < 1 || strlen($validData['name']) > 191)) {
            return ApiResponse::error('Name must be between 1 and 191 characters', 'INVALID_NAME_LENGTH', 400);
        }

        // Update the SSH key
        $success = UserSshKey::updateUserSshKey($id, $validData);
        if (!$success) {
            return ApiResponse::error('Failed to update SSH key', 'SSH_KEY_UPDATE_FAILED', 500);
        }

        // Get the updated SSH key
        $updatedSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$updatedSshKey) {
            return ApiResponse::error('SSH key updated but failed to retrieve', 'SSH_KEY_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_updated',
            'context' => 'Updated SSH key: ' . $existingSshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success($updatedSshKey, 'SSH key updated successfully', 200);
    }

    /**
     * Delete an SSH key (soft delete).
     */
    public function deleteUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user
        $existingSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$existingSshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        if ($existingSshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Delete the SSH key
        $success = UserSshKey::deleteUserSshKey($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete SSH key', 'SSH_KEY_DELETION_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_deleted',
            'context' => 'Deleted SSH key: ' . $existingSshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(null, 'SSH key deleted successfully', 200);
    }

    /**
     * Restore a soft-deleted SSH key.
     */
    public function restoreUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user (including deleted ones)
        $existingSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$existingSshKey) {
            // Try to get it with deleted ones included
            $sshKeys = UserSshKey::getUserSshKeysByUserId($user['id'], true);
            $sshKey = null;
            foreach ($sshKeys as $key) {
                if ($key['id'] == $id) {
                    $sshKey = $key;
                    break;
                }
            }

            if (!$sshKey) {
                return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
            }
        } else {
            $sshKey = $existingSshKey;
        }

        if ($sshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Restore the SSH key
        $success = UserSshKey::restoreUserSshKey($id);
        if (!$success) {
            return ApiResponse::error('Failed to restore SSH key', 'SSH_KEY_RESTORE_FAILED', 500);
        }

        // Get the restored SSH key
        $restoredSshKey = UserSshKey::getUserSshKeyById($id);
        if (!$restoredSshKey) {
            return ApiResponse::error('SSH key restored but failed to retrieve', 'SSH_KEY_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_restored',
            'context' => 'Restored SSH key: ' . $sshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success($restoredSshKey, 'SSH key restored successfully', 200);
    }

    /**
     * Hard delete an SSH key (permanent removal).
     */
    public function hardDeleteUserSshKey(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid SSH key ID', 'INVALID_SSH_KEY_ID', 400);
        }

        // Check if the SSH key exists and belongs to the user (including deleted ones)
        $sshKeys = UserSshKey::getUserSshKeysByUserId($user['id'], true);
        $sshKey = null;
        foreach ($sshKeys as $key) {
            if ($key['id'] == $id) {
                $sshKey = $key;
                break;
            }
        }

        if (!$sshKey) {
            return ApiResponse::error('SSH key not found', 'SSH_KEY_NOT_FOUND', 404);
        }

        if ($sshKey['user_id'] != $user['id']) {
            return ApiResponse::error('You are not allowed to access this SSH key', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Hard delete the SSH key
        $success = UserSshKey::hardDeleteUserSshKey($id);
        if (!$success) {
            return ApiResponse::error('Failed to permanently delete SSH key', 'SSH_KEY_HARD_DELETION_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_hard_deleted',
            'context' => 'Permanently deleted SSH key: ' . $sshKey['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(null, 'SSH key permanently deleted successfully', 200);
    }

    /**
     * Get SSH key activities for the authenticated user.
     */
    public function getUserSshKeyActivities(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        // Get user's SSH key related activities
        $activities = Activity::getActivitiesByUser($user['uuid']);
        $sshKeyActivities = array_filter($activities, function ($activity) {
            return str_starts_with($activity['name'], 'ssh_key_');
        });

        // Apply pagination
        $total = count($sshKeyActivities);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit;
        $to = min($from + $limit, $total);
        $paginatedActivities = array_slice($sshKeyActivities, $from, $limit);

        return ApiResponse::success([
            'activities' => $paginatedActivities,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $total,
                'total_pages' => $totalPages,
                'has_next' => $page < $totalPages,
                'has_prev' => $page > 1,
                'from' => $from + 1,
                'to' => $to,
            ],
        ], 'SSH key activities fetched successfully', 200);
    }

    /**
     * Generate fingerprint from public key.
     */
    public function generateFingerprint(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null || !isset($data['public_key'])) {
            return ApiResponse::error('Public key is required', 'PUBLIC_KEY_REQUIRED', 400);
        }

        $publicKey = trim($data['public_key']);
        if (empty($publicKey)) {
            return ApiResponse::error('Public key cannot be empty', 'PUBLIC_KEY_EMPTY', 400);
        }

        // Validate the public key format
        if (!UserSshKey::isValidSshPublicKey($publicKey)) {
            return ApiResponse::error('Invalid SSH public key format', 'INVALID_SSH_KEY_FORMAT', 400);
        }

        // Generate the fingerprint
        $fingerprint = UserSshKey::generateFingerprint($publicKey);

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'ssh_key_fingerprint_generated',
            'context' => 'Generated fingerprint for SSH key',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'fingerprint' => $fingerprint,
            'public_key' => $publicKey,
        ], 'Fingerprint generated successfully', 200);
    }
}
