<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
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

namespace App\Controllers\User\User;

use App\App;
use App\Chat\User;
use App\Permissions;
use App\Chat\Activity;
use App\Chat\ApiClient;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Helpers\PermissionHelper;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Plugins\Events\Events\UserApiClientEvent;

#[OA\Schema(
    schema: 'ApiClient',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'API client ID'),
        new OA\Property(property: 'user_uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'API client name'),
        new OA\Property(property: 'public_key', type: 'string', description: 'Public API key'),
        new OA\Property(property: 'private_key', type: 'string', description: 'Private API key (only shown on creation)'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientList',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'API client ID'),
        new OA\Property(property: 'user_uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'API client name'),
        new OA\Property(property: 'public_key', type: 'string', description: 'Public API key (truncated)'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
        new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp'),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientPagination',
    type: 'object',
    properties: [
        new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
        new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
        new OA\Property(property: 'total_records', type: 'integer', description: 'Total number of records'),
        new OA\Property(property: 'total_pages', type: 'integer', description: 'Total number of pages'),
        new OA\Property(property: 'has_next', type: 'boolean', description: 'Whether there is a next page'),
        new OA\Property(property: 'has_prev', type: 'boolean', description: 'Whether there is a previous page'),
        new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
        new OA\Property(property: 'to', type: 'integer', description: 'Ending record number'),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientSearch',
    type: 'object',
    properties: [
        new OA\Property(property: 'query', type: 'string', description: 'Search query'),
        new OA\Property(property: 'has_results', type: 'boolean', description: 'Whether search returned results'),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientCreateRequest',
    type: 'object',
    required: ['name'],
    properties: [
        new OA\Property(property: 'name', type: 'string', minLength: 1, maxLength: 191, description: 'API client name'),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', minLength: 1, maxLength: 191, description: 'API client name'),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientValidationRequest',
    type: 'object',
    required: ['public_key'],
    properties: [
        new OA\Property(property: 'public_key', type: 'string', description: 'Public API key to validate'),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientValidationResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'valid', type: 'boolean', description: 'Whether the API client is valid'),
        new OA\Property(property: 'api_client', type: 'object', properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'name', type: 'string'),
            new OA\Property(property: 'user_uuid', type: 'string'),
            new OA\Property(property: 'created_at', type: 'string', format: 'date-time'),
        ]),
        new OA\Property(property: 'user', type: 'object', properties: [
            new OA\Property(property: 'id', type: 'integer'),
            new OA\Property(property: 'username', type: 'string'),
            new OA\Property(property: 'email', type: 'string'),
            new OA\Property(property: 'uuid', type: 'string'),
        ]),
    ]
)]
#[OA\Schema(
    schema: 'ApiClientActivity',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'integer', description: 'Activity ID'),
        new OA\Property(property: 'user_uuid', type: 'string', description: 'User UUID'),
        new OA\Property(property: 'name', type: 'string', description: 'Activity name'),
        new OA\Property(property: 'context', type: 'string', description: 'Activity context'),
        new OA\Property(property: 'ip_address', type: 'string', description: 'IP address'),
        new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
    ]
)]
class ApiClientController
{
    #[OA\Get(
        path: '/api/user/api-clients',
        summary: 'Get API clients',
        description: 'Retrieve all API clients for the authenticated user with pagination and search functionality.',
        tags: ['User - API Clients'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
            ),
            new OA\Parameter(
                name: 'search',
                in: 'query',
                description: 'Search term to filter API clients by name',
                required: false,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'API clients retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'api_clients', type: 'array', items: new OA\Items(ref: '#/components/schemas/ApiClientList')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/ApiClientPagination'),
                        new OA\Property(property: 'search', ref: '#/components/schemas/ApiClientSearch'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve API clients'),
        ]
    )]
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

    #[OA\Get(
        path: '/api/user/api-clients/{id}',
        summary: 'Get specific API client',
        description: 'Retrieve details of a specific API client by ID for the authenticated user.',
        tags: ['User - API Clients'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'API client ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'API client retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiClient')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or API client ID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to API client'),
            new OA\Response(response: 404, description: 'Not found - API client not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve API client'),
        ]
    )]
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

    #[OA\Post(
        path: '/api/user/api-clients',
        summary: 'Create API client',
        description: 'Create a new API client for the authenticated user with automatically generated public and private keys.',
        tags: ['User - API Clients'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ApiClientCreateRequest')
        ),
        responses: [
            new OA\Response(
                response: 201,
                description: 'API client created successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiClient')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token, missing required fields, or invalid name length'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to create API client'),
        ]
    )]
    public function createApiClient(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        // Check if API key creation is allowed (unless user has bypass permission)
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $allowApiKeysCreate = $config->getSetting(ConfigInterface::USER_ALLOW_API_KEYS_CREATE, 'true') === 'true';
        $hasBypassPermission = PermissionHelper::hasPermission($user['uuid'], Permissions::ADMIN_API_BYPASS_RESTRICTIONS);

        if (!$allowApiKeysCreate && !$hasBypassPermission) {
            return ApiResponse::error('You are not allowed to create API keys!', 'API_KEY_CREATION_NOT_ALLOWED', 403, []);
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserApiClientEvent::onUserApiClientCreated(),
                [
                    'user_uuid' => $user['uuid'],
                    'api_client' => $apiClient,
                ]
            );
        }

        // Return the API client with keys (only on creation)
        return ApiResponse::success($apiClient, 'API client created successfully', 201);
    }

    #[OA\Put(
        path: '/api/user/api-clients/{id}',
        summary: 'Update API client',
        description: 'Update an existing API client for the authenticated user. Only the name field can be updated.',
        tags: ['User - API Clients'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'API client ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ApiClientUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'API client updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiClient')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token, API client ID, request data, or invalid name length'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to API client'),
            new OA\Response(response: 404, description: 'Not found - API client not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update API client'),
        ]
    )]
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserApiClientEvent::onUserApiClientUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'api_client' => $updatedApiClient,
                    'updated_data' => $data,
                ]
            );
        }

        return ApiResponse::success($updatedApiClient, 'API client updated successfully', 200);
    }

    #[OA\Delete(
        path: '/api/user/api-clients/{id}',
        summary: 'Delete API client',
        description: 'Delete an API client for the authenticated user. This is a hard delete operation.',
        tags: ['User - API Clients'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'API client ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'API client deleted successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or API client ID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to API client'),
            new OA\Response(response: 404, description: 'Not found - API client not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to delete API client'),
        ]
    )]
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserApiClientEvent::onUserApiClientDeleted(),
                [
                    'user_uuid' => $user['uuid'],
                    'api_client' => $existingApiClient,
                ]
            );
        }

        return ApiResponse::success(null, 'API client deleted successfully', 200);
    }

    #[OA\Post(
        path: '/api/user/api-clients/{id}/regenerate',
        summary: 'Regenerate API keys',
        description: 'Regenerate both public and private API keys for an existing API client.',
        tags: ['User - API Clients'],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'API client ID',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'API keys regenerated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiClient')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or API client ID'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Access denied to API client'),
            new OA\Response(response: 404, description: 'Not found - API client not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to regenerate API keys'),
        ]
    )]
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

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserApiClientEvent::onUserApiClientUpdated(),
                [
                    'user_uuid' => $user['uuid'],
                    'api_client' => $updatedApiClient,
                    'action' => 'keys_regenerated',
                ]
            );
        }

        return ApiResponse::success($updatedApiClient, 'API keys regenerated successfully', 200);
    }

    #[OA\Get(
        path: '/api/user/api-clients/activities',
        summary: 'Get API client activities',
        description: 'Retrieve API client related activities for the authenticated user with pagination.',
        tags: ['User - API Clients'],
        parameters: [
            new OA\Parameter(
                name: 'page',
                in: 'query',
                description: 'Page number for pagination',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, default: 1)
            ),
            new OA\Parameter(
                name: 'limit',
                in: 'query',
                description: 'Number of records per page',
                required: false,
                schema: new OA\Schema(type: 'integer', minimum: 1, maximum: 100, default: 10)
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'API client activities retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'activities', type: 'array', items: new OA\Items(ref: '#/components/schemas/ApiClientActivity')),
                        new OA\Property(property: 'pagination', ref: '#/components/schemas/ApiClientPagination'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve activities'),
        ]
    )]
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

    #[OA\Post(
        path: '/api/user/api-clients/validate',
        summary: 'Validate API client',
        description: 'Validate an API client by public key and return associated user information. This endpoint does not require authentication.',
        tags: ['User - API Clients'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/ApiClientValidationRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'API client validated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/ApiClientValidationResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Missing or empty public key'),
            new OA\Response(response: 404, description: 'Not found - Invalid API client or user not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to validate API client'),
        ]
    )]
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
