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

use App\Chat\Activity;
use App\Chat\RedirectLink;
use App\Helpers\ApiResponse;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class RedirectLinksController
{
    public function index(Request $request): Response
    {
        $page = (int) $request->query->get('page', 1);
        $limit = (int) $request->query->get('limit', 10);
        $search = $request->query->get('search', '');

        if ($search) {
            $redirectLinks = RedirectLink::searchRedirectLinks($search, $page, $limit);
            $totalRecords = RedirectLink::getSearchCount($search);
        } else {
            $redirectLinks = RedirectLink::getAll($page, $limit);
            $totalRecords = RedirectLink::getCount();
        }

        $totalPages = ceil($totalRecords / $limit);
        $hasNext = $page < $totalPages;
        $hasPrev = $page > 1;
        $from = $totalRecords > 0 ? (($page - 1) * $limit) + 1 : 0;
        $to = min($page * $limit, $totalRecords);

        return ApiResponse::success([
            'redirect_links' => $redirectLinks,
            'pagination' => [
                'current_page' => $page,
                'per_page' => $limit,
                'total_records' => $totalRecords,
                'total_pages' => $totalPages,
                'has_next' => $hasNext,
                'has_prev' => $hasPrev,
                'from' => $from,
                'to' => $to,
            ],
        ], 'Redirect links fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $redirectLink = RedirectLink::getById($id);
        if (!$redirectLink) {
            return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
        }

        return ApiResponse::success(['redirect_link' => $redirectLink], 'Redirect link fetched successfully', 200);
    }

    public function create(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);

        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Required fields validation
        $requiredFields = ['name', 'url'];
        $missingFields = [];
        foreach ($requiredFields as $field) {
            if (!isset($data[$field]) || trim($data[$field]) === '') {
                $missingFields[] = $field;
            }
        }

        if (!empty($missingFields)) {
            return ApiResponse::error('Missing required fields: ' . implode(', ', $missingFields), 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Generate slug if not provided
        if (!isset($data['slug']) || empty($data['slug'])) {
            $data['slug'] = RedirectLink::generateSlug($data['name']);
        }

        // Validate data types and length
        $validationRules = [
            'name' => ['string', 1, 191],
            'slug' => ['string', 1, 191],
            'url' => ['string', 1, 191],
        ];

        foreach ($validationRules as $field => [$type, $minLength, $maxLength]) {
            if (!is_string($data[$field])) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
            }

            $length = strlen($data[$field]);
            if ($length < $minLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
            if ($length > $maxLength) {
                return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
            }
        }

        // Validate URL format
        if (!filter_var($data['url'], FILTER_VALIDATE_URL)) {
            return ApiResponse::error('Invalid URL format', 'INVALID_URL_FORMAT', 400);
        }

        // Validate slug format (only lowercase letters, numbers, and hyphens)
        if (!preg_match('/^[a-z0-9-]+$/', $data['slug'])) {
            return ApiResponse::error('Slug can only contain lowercase letters, numbers, and hyphens', 'INVALID_SLUG_FORMAT', 400);
        }

        // Check if redirect link name already exists
        $existingRedirectLink = RedirectLink::getByName($data['name']);
        if ($existingRedirectLink) {
            return ApiResponse::error('Redirect link name already exists', 'REDIRECT_LINK_NAME_EXISTS', 409);
        }

        // Check if redirect link slug already exists
        $existingRedirectLinkBySlug = RedirectLink::getBySlug($data['slug']);
        if ($existingRedirectLinkBySlug) {
            return ApiResponse::error('Redirect link slug already exists', 'REDIRECT_LINK_SLUG_EXISTS', 409);
        }

        // Check if redirect link URL already exists
        $existingRedirectLinkByUrl = RedirectLink::getByUrl($data['url']);
        if ($existingRedirectLinkByUrl) {
            return ApiResponse::error('Redirect link URL already exists', 'REDIRECT_LINK_URL_EXISTS', 409);
        }

        // Set timestamps
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $redirectLinkId = RedirectLink::create($data);
        if (!$redirectLinkId) {
            return ApiResponse::error('Failed to create redirect link', 'FAILED_TO_CREATE_REDIRECT_LINK', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'create_redirect_link',
            'context' => 'Created redirect link: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['redirect_link_id' => $redirectLinkId], 'Redirect link created successfully', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $redirectLink = RedirectLink::getById($id);
        if (!$redirectLink) {
            return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Generate slug if not provided and name is being updated
        if (isset($data['name']) && (!isset($data['slug']) || empty($data['slug']))) {
            $data['slug'] = RedirectLink::generateSlug($data['name']);
        }

        // Validate data types and length
        $validationRules = [
            'name' => ['string', 1, 191],
            'slug' => ['string', 1, 191],
            'url' => ['string', 1, 191],
        ];

        foreach ($validationRules as $field => [$type, $minLength, $maxLength]) {
            if (isset($data[$field])) {
                if (!is_string($data[$field])) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
                }

                $length = strlen($data[$field]);
                if ($length < $minLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
                if ($length > $maxLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
            }
        }

        // Validate URL format if provided
        if (isset($data['url']) && !filter_var($data['url'], FILTER_VALIDATE_URL)) {
            return ApiResponse::error('Invalid URL format', 'INVALID_URL_FORMAT', 400);
        }

        // Validate slug format if provided
        if (isset($data['slug']) && !preg_match('/^[a-z0-9-]+$/', $data['slug'])) {
            return ApiResponse::error('Slug can only contain lowercase letters, numbers, and hyphens', 'INVALID_SLUG_FORMAT', 400);
        }

        // Check if redirect link name already exists (excluding current record)
        if (isset($data['name'])) {
            $existingRedirectLink = RedirectLink::getByName($data['name']);
            if ($existingRedirectLink && $existingRedirectLink['id'] != $id) {
                return ApiResponse::error('Redirect link name already exists', 'REDIRECT_LINK_NAME_EXISTS', 409);
            }
        }

        // Check if redirect link slug already exists (excluding current record)
        if (isset($data['slug'])) {
            $existingRedirectLinkBySlug = RedirectLink::getBySlug($data['slug']);
            if ($existingRedirectLinkBySlug && $existingRedirectLinkBySlug['id'] != $id) {
                return ApiResponse::error('Redirect link slug already exists', 'REDIRECT_LINK_SLUG_EXISTS', 409);
            }
        }

        // Check if redirect link URL already exists (excluding current record)
        if (isset($data['url'])) {
            $existingRedirectLinkByUrl = RedirectLink::getByUrl($data['url']);
            if ($existingRedirectLinkByUrl && $existingRedirectLinkByUrl['id'] != $id) {
                return ApiResponse::error('Redirect link URL already exists', 'REDIRECT_LINK_URL_EXISTS', 409);
            }
        }

        // Set updated timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');

        $success = RedirectLink::update($id, $data);
        if (!$success) {
            return ApiResponse::error('Failed to update redirect link', 'FAILED_TO_UPDATE_REDIRECT_LINK', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'update_redirect_link',
            'context' => 'Updated redirect link: ' . ($data['name'] ?? $redirectLink['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Redirect link updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $redirectLink = RedirectLink::getById($id);
        if (!$redirectLink) {
            return ApiResponse::error('Redirect link not found', 'REDIRECT_LINK_NOT_FOUND', 404);
        }

        $success = RedirectLink::delete($id);
        if (!$success) {
            return ApiResponse::error('Failed to delete redirect link', 'FAILED_TO_DELETE_REDIRECT_LINK', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'delete_redirect_link',
            'context' => 'Deleted redirect link: ' . $redirectLink['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Redirect link deleted successfully', 200);
    }
}
