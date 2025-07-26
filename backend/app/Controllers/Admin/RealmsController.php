<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\Chat\Realm;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RealmsController
{
    public function index(Request $request): Response
    {
        // Validate and sanitize pagination parameters
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);

        // Adjust page parameter if it's less than 1
        if ($page < 1) {
            $page = 1;
        }

        // Adjust limit parameter with reasonable bounds
        $maxLimit = 100; // Define maximum limit to prevent performance issues
        if ($limit < 1) {
            $limit = 10; // Default to 10 if limit is less than 1
        }
        if ($limit > $maxLimit) {
            $limit = $maxLimit; // Cap at maximum limit
        }

        $search = $request->query->get('search', '');
        $offset = ($page - 1) * $limit;
        $realms = Realm::getAll($search, $limit, $offset);
        $total = Realm::getCount($search);

        return ApiResponse::success([
            'realms' => $realms,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Realms fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $realm = Realm::getById($id);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }

        return ApiResponse::success(['realm' => $realm], 'Realm fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        $requiredFields = ['name'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }
        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS');
        }
        if (!is_string($data['name'])) {
            return ApiResponse::error('Name must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['logo']) && !is_string($data['logo'])) {
            return ApiResponse::error('Logo must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['logo']) && strlen($data['logo']) > 255) {
            return ApiResponse::error('Logo must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['author']) && !is_string($data['author'])) {
            return ApiResponse::error('Author must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['description']) && !is_string($data['description'])) {
            return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
        }
        if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['logo']) && strlen($data['logo']) > 255) {
            return ApiResponse::error('Logo must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['author']) && strlen($data['author']) > 255) {
            return ApiResponse::error('Author must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['description']) && strlen($data['description']) > 65535) {
            return ApiResponse::error('Description must be less than 65535 characters', 'INVALID_DATA_LENGTH');
        }
        $id = Realm::create($data);
        if (!$id) {
            return ApiResponse::error('Failed to create realm', 'REALM_CREATE_FAILED', 400);
        }
        $realm = Realm::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_realm',
            'context' => 'Created realm: ' . $realm['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['realm' => $realm], 'Realm created successfully', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $realm = Realm::getById($id);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            return ApiResponse::error('Invalid JSON in request body', 'INVALID_JSON', 400);
        }
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }
        if (isset($data['id'])) {
            unset($data['id']);
        }
        if (isset($data['name'])) {
            if (!is_string($data['name'])) {
                return ApiResponse::error('Name must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
                return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        if (isset($data['logo']) && !is_string($data['logo'])) {
            return ApiResponse::error('Logo must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['logo']) && strlen($data['logo']) > 255) {
            return ApiResponse::error('Logo must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['author'])) {
            if (!is_string($data['author'])) {
                return ApiResponse::error('Author must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['author']) > 255) {
                return ApiResponse::error('Author must be less than 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        if (isset($data['description'])) {
            if (!is_string($data['description'])) {
                return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['description']) > 65535) {
                return ApiResponse::error('Description must be less than 65535 characters', 'INVALID_DATA_LENGTH');
            }
        }
        $success = Realm::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update realm', 'REALM_UPDATE_FAILED', 400);
        }
        $realm = Realm::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_realm',
            'context' => 'Updated realm: ' . $realm['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['realm' => $realm], 'Realm updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $realm = Realm::getById($id);
        if (!$realm) {
            return ApiResponse::error('Realm not found', 'REALM_NOT_FOUND', 404);
        }
        $success = Realm::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete realm', 'REALM_DELETE_FAILED', 400);
        }
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_realm',
            'context' => 'Deleted realm: ' . $realm['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Realm deleted successfully', 200);
    }
}
