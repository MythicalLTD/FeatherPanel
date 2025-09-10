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

use App\App;
use App\Chat\Image;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class ImagesController
{
    public function index(Request $request): Response
    {
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

        $images = Image::searchImages(
            page: $page,
            limit: $limit,
            search: $search,
            fields: ['id', 'name', 'url', 'created_at', 'updated_at'],
            sortBy: 'created_at',
            sortOrder: 'DESC'
        );

        $total = Image::getCount($search);
        $totalPages = ceil($total / $limit);
        $from = ($page - 1) * $limit + 1;
        $to = min($from + $limit - 1, $total);

        return ApiResponse::success([
            'images' => $images,
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
                'has_results' => count($images) > 0,
            ],
        ], 'Images fetched successfully', 200);
    }

    public function show(Request $request, int $id): Response
    {
        $image = Image::getById($id);
        if (!$image) {
            return ApiResponse::error('Image not found', 'IMAGE_NOT_FOUND', 404);
        }

        return ApiResponse::success(['image' => $image], 'Image fetched successfully', 200);
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

        // Validate data types and length
        $validationRules = [
            'name' => ['string', 1, 191],
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

        // Check if image name already exists
        $existingImage = Image::getByName($data['name']);
        if ($existingImage) {
            return ApiResponse::error('Image name already exists', 'IMAGE_NAME_EXISTS', 409);
        }

        // Check if image URL already exists
        $existingImageByUrl = Image::getByUrl($data['url']);
        if ($existingImageByUrl) {
            return ApiResponse::error('Image URL already exists', 'IMAGE_URL_EXISTS', 409);
        }

        // Set timestamps
        $data['created_at'] = date('Y-m-d H:i:s');
        $data['updated_at'] = date('Y-m-d H:i:s');

        $imageId = Image::create($data);
        if (!$imageId) {
            return ApiResponse::error('Failed to create image', 'FAILED_TO_CREATE_IMAGE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'create_image',
            'context' => 'Created image: ' . $data['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success(['image_id' => $imageId], 'Image created successfully', 201);
    }

    public function upload(Request $request): Response
    {
        // Check if file was uploaded
        if (!$request->files->has('image')) {
            return ApiResponse::error('No image file provided', 'NO_FILE_PROVIDED', 400);
        }

        $file = $request->files->get('image');
        $name = $request->request->get('name', '');

        if (empty($name)) {
            return ApiResponse::error('Image name is required', 'MISSING_NAME', 400);
        }

        // Validate file
        if (!$file->isValid()) {
            return ApiResponse::error('Invalid file upload', 'INVALID_FILE', 400);
        }

        // Check file size (max 10MB)
        if ($file->getSize() > 10 * 1024 * 1024) {
            return ApiResponse::error('File size too large. Maximum size is 10MB', 'FILE_TOO_LARGE', 400);
        }

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file->getMimeType(), $allowedTypes)) {
            return ApiResponse::error('Invalid file type. Allowed types: JPG, PNG, GIF, WebP', 'INVALID_FILE_TYPE', 400);
        }

        // Check if image name already exists
        $existingImage = Image::getByName($name);
        if ($existingImage) {
            return ApiResponse::error('Image name already exists', 'IMAGE_NAME_EXISTS', 409);
        }

        // Create attachments directory if it doesn't exist
        $attachmentsDir = APP_PUBLIC . '/attachments/';
        if (!is_dir($attachmentsDir)) {
            mkdir($attachmentsDir, 0755, true);
        }

        // Generate unique filename
        $extension = $file->guessExtension();
        $filename = uniqid() . '_' . preg_replace('/[^a-zA-Z0-9._-]/', '_', $name) . '.' . $extension;
        $filePath = $attachmentsDir . $filename;

        // Move uploaded file
        try {
            $file->move($attachmentsDir, $filename);
        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save file: ' . $e->getMessage(), 'SAVE_FAILED', 500);
        }

        // Generate URL
        $baseUrl = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://mythicalpanel.mythical.systems');
        $url = $baseUrl . '/attachments/' . $filename;

        // Create database record
        $data = [
            'name' => $name,
            'url' => $url,
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ];

        $imageId = Image::create($data);
        if (!$imageId) {
            // Clean up uploaded file if database insert fails
            if (file_exists($filePath)) {
                unlink($filePath);
            }

            return ApiResponse::error('Failed to create image record', 'FAILED_TO_CREATE_IMAGE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'upload_image',
            'context' => 'Uploaded image: ' . $name,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([
            'image_id' => $imageId,
            'url' => $url,
            'filename' => $filename,
        ], 'Image uploaded successfully', 201);
    }

    public function update(Request $request, int $id): Response
    {
        $image = Image::getById($id);
        if (!$image) {
            return ApiResponse::error('Image not found', 'IMAGE_NOT_FOUND', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (empty($data)) {
            return ApiResponse::error('No data provided', 'NO_DATA_PROVIDED', 400);
        }

        // Remove fields that shouldn't be updated
        unset($data['id'], $data['created_at']);

        // Validate data types and length for provided fields
        $validationRules = [
            'name' => ['string', 1, 191],
            'url' => ['string', 1, 191],
        ];

        foreach ($data as $field => $value) {
            if (isset($validationRules[$field])) {
                [$type, $minLength, $maxLength] = $validationRules[$field];

                if (!is_string($value)) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . ' must be a string', 'INVALID_DATA_TYPE', 400);
                }

                $length = strlen($value);
                if ($length < $minLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $minLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
                if ($length > $maxLength) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $maxLength characters long", 'INVALID_DATA_LENGTH', 400);
                }
            }
        }

        // Validate URL format if updating URL
        if (isset($data['url'])) {
            if (!filter_var($data['url'], FILTER_VALIDATE_URL)) {
                return ApiResponse::error('Invalid URL format', 'INVALID_URL_FORMAT', 400);
            }
        }

        // Check if image name already exists (excluding current image)
        if (isset($data['name'])) {
            $existingImage = Image::getByName($data['name']);
            if ($existingImage && $existingImage['id'] != $id) {
                return ApiResponse::error('Image name already exists', 'IMAGE_NAME_EXISTS', 409);
            }
        }

        // Check if image URL already exists (excluding current image)
        if (isset($data['url'])) {
            $existingImageByUrl = Image::getByUrl($data['url']);
            if ($existingImageByUrl && $existingImageByUrl['id'] != $id) {
                return ApiResponse::error('Image URL already exists', 'IMAGE_URL_EXISTS', 409);
            }
        }

        // Add updated timestamp
        $data['updated_at'] = date('Y-m-d H:i:s');

        $updated = Image::update($id, $data);
        if (!$updated) {
            return ApiResponse::error('Failed to update image', 'FAILED_TO_UPDATE_IMAGE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'update_image',
            'context' => 'Updated image: ' . ($data['name'] ?? $image['name']),
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Image updated successfully', 200);
    }

    public function delete(Request $request, int $id): Response
    {
        $image = Image::getById($id);
        if (!$image) {
            return ApiResponse::error('Image not found', 'IMAGE_NOT_FOUND', 404);
        }

        $deleted = Image::delete($id);
        if (!$deleted) {
            return ApiResponse::error('Failed to delete image', 'FAILED_TO_DELETE_IMAGE', 500);
        }

        // Log activity
        Activity::createActivity([
            'user_uuid' => $request->get('user')['uuid'] ?? null,
            'name' => 'delete_image',
            'context' => 'Deleted image: ' . $image['name'],
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return ApiResponse::success([], 'Image deleted successfully', 200);
    }
}
