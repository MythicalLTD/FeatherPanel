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

use App\Chat\Activity;
use App\Chat\Location;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/* ---------------------------
 * Author: Cassian Gherman Date: 2025-07-25
 *
 * Changes:
 * - Added support so we can get the locations
 * - Added support so we can create, update and delete locations
 * - Added support so we can get a single location
 *
 * ---------------------------*/
class LocationsController
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        // Fetch locations with search, limit, and offset directly from the database
        $offset = ($page - 1) * $limit;
        $locations = Location::getAll($search, $limit, $offset);
        $total = Location::getCount($search);

        return ApiResponse::success([
            'locations' => $locations,
            'pagination' => [
                'page' => $page,
                'limit' => $limit,
                'total' => $total,
            ],
        ], 'Locations fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $location = Location::getById($id);
        if (!$location) {
            return ApiResponse::error('Location not found', 'LOCATION_NOT_FOUND', 404);
        }

        return ApiResponse::success(['location' => $location], 'Location fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
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
        if (isset($data['description']) && !is_string($data['description'])) {
            return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['ip_address']) && !is_string($data['ip_address'])) {
            return ApiResponse::error('IP Address must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['country']) && !is_string($data['country'])) {
            return ApiResponse::error('Country must be a string', 'INVALID_DATA_TYPE');
        }
        if (strlen($data['name']) < 2 || strlen($data['name']) > 255) {
            return ApiResponse::error('Name must be between 2 and 255 characters', 'INVALID_DATA_LENGTH');
        }
        if (isset($data['country']) && strlen($data['country']) > 255) {
            return ApiResponse::error('Country must be less than 255 characters', 'INVALID_DATA_LENGTH');
        }
        $id = Location::create($data);
        if (!$id) {
            return ApiResponse::error('Failed to create location', 'LOCATION_CREATE_FAILED', 400);
        }
        $location = Location::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'create_location',
            'context' => 'Created location: ' . $location['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['location' => $location], 'Location created successfully', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $location = Location::getById($id);
        if (!$location) {
            return ApiResponse::error('Location not found', 'LOCATION_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
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
        if (isset($data['description']) && !is_string($data['description'])) {
            return ApiResponse::error('Description must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['ip_address']) && !is_string($data['ip_address'])) {
            return ApiResponse::error('IP Address must be a string', 'INVALID_DATA_TYPE');
        }
        if (isset($data['country'])) {
            if (!is_string($data['country'])) {
                return ApiResponse::error('Country must be a string', 'INVALID_DATA_TYPE');
            }
            if (strlen($data['country']) > 255) {
                return ApiResponse::error('Country must be less than 255 characters', 'INVALID_DATA_LENGTH');
            }
        }
        $success = Location::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update location', 'LOCATION_UPDATE_FAILED', 400);
        }
        $location = Location::getById($id);
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'update_location',
            'context' => 'Updated location: ' . $location['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['location' => $location], 'Location updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $location = Location::getById($id);
        if (!$location) {
            return ApiResponse::error('Location not found', 'LOCATION_NOT_FOUND', 404);
        }
        $success = Location::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete location', 'LOCATION_DELETE_FAILED', 400);
        }
        // Log activity
        $admin = $request->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'delete_location',
            'context' => 'Deleted location: ' . $location['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Location deleted successfully', 200);
    }
}
