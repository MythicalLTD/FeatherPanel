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
use App\Chat\ApiClient;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\UserEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ApiClientController
{
    /**
     * Get all API clients for the authenticated user.
     */
    public function getApiClients(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        if ($page < 1) {
            $page = 1;
        }
        if ($limit < 1) {
            $limit = 10;
        }
        if ($limit > 100) {
            $limit = 100;
        }

        // Get user's API clients with pagination and search
        $apiClients = ApiClient::searchApiClients(
            page: $page,
            limit: $limit,
            search: $search,
            userUuid: $user['uuid']
        );

        // Sanitize sensitive data for response
        foreach ($apiClients as &$client) {
            unset($client['private_key'], $client['public_key']); // Never expose private key in list
            // Don't expose full public key in list
        }

        $total = ApiClient::getCount($search, $user['uuid']);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'api_clients' => $apiClients,
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
                'has_results' => count($apiClients) > 0,
            ],
        ], 'API clients fetched successfully', 200);
    }

    /**
     * Get a specific API client by ID.
     */
    public function getApiClient(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
        }

        $apiClient = ApiClient::getApiClientById($id);
        if (!$apiClient) {
            return ApiResponse::error('API client not found', 'API_CLIENT_NOT_FOUND', 404);
        }

        // Ensure the user can only access their own API clients
        if ($apiClient['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('You are not allowed to access this API client', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Remove sensitive data from response
        unset($apiClient['private_key']);

        return ApiResponse::success($apiClient, 'API client fetched successfully', 200);
    }

    /**
     * Create a new API client for the authenticated user.
     */
    public function createApiClient(Request $request): Response
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
        $required = ['name'];
        foreach ($required as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                return ApiResponse::error("Missing required field: $field", 'MISSING_REQUIRED_FIELD', 400);
            }
        }

        // Validate data length
        if (strlen($data['name']) < 1 || strlen($data['name']) > 191) {
            return ApiResponse::error('Name must be between 1 and 191 characters', 'INVALID_NAME_LENGTH', 400);
        }

        // Generate API keys
        $publicKey = $this->generateApiKey();
        $privateKey = $this->generateApiKey();

        // Add user data and generated keys
        $data['user_uuid'] = $user['uuid'];
        $data['public_key'] = $publicKey;
        $data['private_key'] = $privateKey;

        // Create the API client
        $apiClientId = ApiClient::createApiClient($data);
        if ($apiClientId === false) {
            return ApiResponse::error('Failed to create API client', 'API_CLIENT_CREATION_FAILED', 500);
        }

        // Get the created API client
        $apiClient = ApiClient::getApiClientById($apiClientId);
        if (!$apiClient) {
            return ApiResponse::error('API client created but failed to retrieve', 'API_CLIENT_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'api_client_created',
            'context' => 'Created API client: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        global $eventManager;
        $eventManager->emit(
            UserEvent::onUserApiKeyCreated(),
            [
                'user_uuid' => $user['uuid'],
                'api_key_id' => $apiClientId,
            ]
        );

        // Return the API client with keys (only on creation)
        return ApiResponse::success($apiClient, 'API client created successfully', 201);
    }

    /**
     * Update an existing API client.
     */
    public function updateApiClient(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
        }

        // Check if the API client exists and belongs to the user
        $existingApiClient = ApiClient::getApiClientById($id);
        if (!$existingApiClient) {
            return ApiResponse::error('API client not found', 'API_CLIENT_NOT_FOUND', 404);
        }

        if ($existingApiClient['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('You are not allowed to access this API client', 'UNAUTHORIZED_ACCESS', 403);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400);
        }

        // Validate allowed fields
        $allowedFields = ['name'];
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

        // Update the API client
        $success = ApiClient::updateApiClient($id, $validData);
        if (!$success) {
            return ApiResponse::error('Failed to update API client', 'API_CLIENT_UPDATE_FAILED', 500);
        }

        // Get the updated API client
        $updatedApiClient = ApiClient::getApiClientById($id);
        if (!$updatedApiClient) {
            return ApiResponse::error('API client updated but failed to retrieve', 'API_CLIENT_RETRIEVAL_FAILED', 500);
        }

        // Remove sensitive data from response
        unset($updatedApiClient['private_key']);

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'api_client_updated',
            'context' => 'Updated API client: ' . $existingApiClient['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
        global $eventManager;
        $eventManager->emit(
            UserEvent::onUserApiKeyUpdated(),
            [
                'user_uuid' => $user['uuid'],
                'api_key_id' => $id,
            ]
        );

        return ApiResponse::success($updatedApiClient, 'API client updated successfully', 200);
    }

    /**
     * Delete an API client (hard delete).
     */
    public function deleteApiClient(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
        }

        // Check if the API client exists and belongs to the user
        $existingApiClient = ApiClient::getApiClientById($id);
        if (!$existingApiClient) {
            return ApiResponse::error('API client not found', 'API_CLIENT_NOT_FOUND', 404);
        }

        if ($existingApiClient['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('You are not allowed to access this API client', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Delete the API client
        $success = ApiClient::deleteApiClient($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete API client', 'API_CLIENT_DELETION_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'api_client_deleted',
            'context' => 'Deleted API client: ' . $existingApiClient['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        global $eventManager;
        $eventManager->emit(
            UserEvent::onUserApiKeyDeleted(),
            [
                'user_uuid' => $user['uuid'],
                'api_key_id' => $id,
            ]
        );

        return ApiResponse::success(null, 'API client deleted successfully', 200);
    }

    /**
     * Regenerate API keys for an existing API client.
     */
    public function regenerateApiKeys(Request $request, int $id): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        if ($id <= 0) {
            return ApiResponse::error('Invalid API client ID', 'INVALID_API_CLIENT_ID', 400);
        }

        // Check if the API client exists and belongs to the user
        $existingApiClient = ApiClient::getApiClientById($id);
        if (!$existingApiClient) {
            return ApiResponse::error('API client not found', 'API_CLIENT_NOT_FOUND', 404);
        }

        if ($existingApiClient['user_uuid'] !== $user['uuid']) {
            return ApiResponse::error('You are not allowed to access this API client', 'UNAUTHORIZED_ACCESS', 403);
        }

        // Generate new API keys
        $newPublicKey = $this->generateApiKey();
        $newPrivateKey = $this->generateApiKey();

        // Update the API client with new keys
        $success = ApiClient::updateApiClient($id, [
            'public_key' => $newPublicKey,
            'private_key' => $newPrivateKey,
        ]);

        if (!$success) {
            return ApiResponse::error('Failed to regenerate API keys', 'API_KEYS_REGENERATION_FAILED', 500);
        }

        // Get the updated API client
        $updatedApiClient = ApiClient::getApiClientById($id);
        if (!$updatedApiClient) {
            return ApiResponse::error('API keys regenerated but failed to retrieve API client', 'API_CLIENT_RETRIEVAL_FAILED', 500);
        }

        // Log the activity
        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => 'api_keys_regenerated',
            'context' => 'Regenerated API keys for: ' . $existingApiClient['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        global $eventManager;
        $eventManager->emit(
            UserEvent::onUserApiKeyUpdated(),
            [
                'user_uuid' => $user['uuid'],
                'api_key_id' => $id,
            ]
        );

        return ApiResponse::success($updatedApiClient, 'API keys regenerated successfully', 200);
    }

    /**
     * Get API client activities for the authenticated user.
     */
    public function getApiClientActivities(Request $request): Response
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

        // Get user's API client related activities
        $activities = Activity::getActivitiesByUser($user['uuid']);
        $apiClientActivities = array_filter($activities, function ($activity) {
            return str_starts_with($activity['name'], 'api_client_') || str_starts_with($activity['name'], 'api_keys_');
        });

        // Apply pagination
        $total = count($apiClientActivities);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit;
        $to = min($from + $limit, $total);
        $paginatedActivities = array_slice($apiClientActivities, $from, $limit);

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
        ], 'API client activities fetched successfully', 200);
    }

    /**
     * Validate an API client by public key.
     */
    public function validateApiClient(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if ($data == null || !isset($data['public_key'])) {
            return ApiResponse::error('Public key is required', 'PUBLIC_KEY_REQUIRED', 400);
        }

        $publicKey = trim($data['public_key']);
        if (empty($publicKey)) {
            return ApiResponse::error('Public key cannot be empty', 'PUBLIC_KEY_EMPTY', 400);
        }

        // Find the API client by public key
        $apiClient = ApiClient::getApiClientByPublicKey($publicKey);
        if (!$apiClient) {
            return ApiResponse::error('Invalid API client', 'INVALID_API_CLIENT', 404);
        }

        // Get user information
        $user = User::getUserByUuid($apiClient['user_uuid']);
        if (!$user) {
            return ApiResponse::error('API client user not found', 'USER_NOT_FOUND', 404);
        }

        // Return validation result (without sensitive data)
        return ApiResponse::success([
            'valid' => true,
            'api_client' => [
                'id' => $apiClient['id'],
                'name' => $apiClient['name'],
                'user_uuid' => $apiClient['user_uuid'],
                'created_at' => $apiClient['created_at'],
            ],
            'user' => [
                'id' => $user['id'],
                'username' => $user['username'],
                'email' => $user['email'],
                'uuid' => $user['uuid'],
            ],
        ], 'API client validated successfully', 200);
    }

    /**
     * Generate a secure API key.
     */
    private function generateApiKey(): string
    {
        return 'fp_' . bin2hex(random_bytes(32));
    }
}
