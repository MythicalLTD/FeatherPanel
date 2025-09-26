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
use OpenApi\Attributes as OA;

#[OA\Schema(
	schema: 'Image',
	type: 'object',
	properties: [
		new OA\Property(property: 'id', type: 'integer', description: 'Image ID'),
		new OA\Property(property: 'name', type: 'string', description: 'Image name'),
		new OA\Property(property: 'url', type: 'string', description: 'Image URL'),
		new OA\Property(property: 'created_at', type: 'string', format: 'date-time', description: 'Creation timestamp'),
		new OA\Property(property: 'updated_at', type: 'string', format: 'date-time', description: 'Last update timestamp')
	]
)]
#[OA\Schema(
	schema: 'ImagePagination',
	type: 'object',
	properties: [
		new OA\Property(property: 'current_page', type: 'integer', description: 'Current page number'),
		new OA\Property(property: 'per_page', type: 'integer', description: 'Records per page'),
		new OA\Property(property: 'total_records', type: 'integer', description: 'Total number of records'),
		new OA\Property(property: 'total_pages', type: 'integer', description: 'Total number of pages'),
		new OA\Property(property: 'has_next', type: 'boolean', description: 'Whether there is a next page'),
		new OA\Property(property: 'has_prev', type: 'boolean', description: 'Whether there is a previous page'),
		new OA\Property(property: 'from', type: 'integer', description: 'Starting record number'),
		new OA\Property(property: 'to', type: 'integer', description: 'Ending record number')
	]
)]
#[OA\Schema(
	schema: 'ImageCreate',
	type: 'object',
	required: ['name', 'url'],
	properties: [
		new OA\Property(property: 'name', type: 'string', description: 'Image name', minLength: 1, maxLength: 191),
		new OA\Property(property: 'url', type: 'string', description: 'Image URL', minLength: 1, maxLength: 191)
	]
)]
#[OA\Schema(
	schema: 'ImageUpdate',
	type: 'object',
	properties: [
		new OA\Property(property: 'name', type: 'string', description: 'Image name', minLength: 1, maxLength: 191),
		new OA\Property(property: 'url', type: 'string', description: 'Image URL', minLength: 1, maxLength: 191)
	]
)]
#[OA\Schema(
	schema: 'ImageUpload',
	type: 'object',
	required: ['name'],
	properties: [
		new OA\Property(property: 'name', type: 'string', description: 'Image name', minLength: 1, maxLength: 191),
		new OA\Property(property: 'image', type: 'string', format: 'binary', description: 'Image file (JPG, PNG, GIF, WebP, max 10MB)')
	]
)]
class ImagesController
{
	#[OA\Get(
		path: '/api/admin/images',
		summary: 'Get all images',
		description: 'Retrieve a paginated list of all images with optional search functionality.',
		tags: ['Admin - Images'],
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
				description: 'Search term to filter images by name',
				required: false,
				schema: new OA\Schema(type: 'string')
			)
		],
		responses: [
			new OA\Response(
				response: 200,
				description: 'Images retrieved successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'images', type: 'array', items: new OA\Items(ref: '#/components/schemas/Image')),
						new OA\Property(property: 'pagination', ref: '#/components/schemas/ImagePagination'),
						new OA\Property(property: 'search', type: 'object', properties: [
							new OA\Property(property: 'query', type: 'string'),
							new OA\Property(property: 'has_results', type: 'boolean')
						])
					]
				)
			),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions')
		]
	)]
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

	#[OA\Get(
		path: '/api/admin/images/{id}',
		summary: 'Get image by ID',
		description: 'Retrieve a specific image by its ID.',
		tags: ['Admin - Images'],
		parameters: [
			new OA\Parameter(
				name: 'id',
				in: 'path',
				description: 'Image ID',
				required: true,
				schema: new OA\Schema(type: 'integer')
			)
		],
		responses: [
			new OA\Response(
				response: 200,
				description: 'Image retrieved successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'image', ref: '#/components/schemas/Image')
					]
				)
			),
			new OA\Response(response: 400, description: 'Bad request - Invalid image ID'),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 404, description: 'Image not found')
		]
	)]
	public function show(Request $request, int $id): Response
	{
		$image = Image::getById($id);
		if (!$image) {
			return ApiResponse::error('Image not found', 'IMAGE_NOT_FOUND', 404);
		}

		return ApiResponse::success(['image' => $image], 'Image fetched successfully', 200);
	}

	#[OA\Post(
		path: '/api/admin/images',
		summary: 'Create new image',
		description: 'Create a new image record with name and URL. Validates URL format and ensures uniqueness of name and URL.',
		tags: ['Admin - Images'],
		requestBody: new OA\RequestBody(
			required: true,
			content: new OA\JsonContent(ref: '#/components/schemas/ImageCreate')
		),
		responses: [
			new OA\Response(
				response: 201,
				description: 'Image created successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'image_id', type: 'integer', description: 'ID of the created image')
					]
				)
			),
			new OA\Response(response: 400, description: 'Bad request - Missing required fields, invalid data types, invalid URL format, or validation errors'),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 409, description: 'Conflict - Image name or URL already exists'),
			new OA\Response(response: 500, description: 'Internal server error - Failed to create image')
		]
	)]
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

	#[OA\Post(
		path: '/api/admin/images/upload',
		summary: 'Upload image file',
		description: 'Upload an image file and create a corresponding image record. Supports JPG, PNG, GIF, and WebP formats with a maximum size of 10MB.',
		tags: ['Admin - Images'],
		requestBody: new OA\RequestBody(
			required: true,
			content: new OA\MediaType(
				mediaType: 'multipart/form-data',
				schema: new OA\Schema(
					required: ['name', 'image'],
					properties: [
						new OA\Property(property: 'name', type: 'string', description: 'Image name', minLength: 1, maxLength: 191),
						new OA\Property(property: 'image', type: 'string', format: 'binary', description: 'Image file (JPG, PNG, GIF, WebP, max 10MB)')
					]
				)
			)
		),
		responses: [
			new OA\Response(
				response: 201,
				description: 'Image uploaded successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'image_id', type: 'integer', description: 'ID of the created image'),
						new OA\Property(property: 'url', type: 'string', description: 'Public URL of the uploaded image'),
						new OA\Property(property: 'filename', type: 'string', description: 'Generated filename')
					]
				)
			),
			new OA\Response(response: 400, description: 'Bad request - No file provided, missing name, invalid file, file too large, or invalid file type'),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 409, description: 'Conflict - Image name already exists'),
			new OA\Response(response: 500, description: 'Internal server error - Failed to save file or create image record')
		]
	)]
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

	#[OA\Patch(
		path: '/api/admin/images/{id}',
		summary: 'Update image',
		description: 'Update an existing image. Only provided fields will be updated. Validates URL format and ensures uniqueness of name and URL.',
		tags: ['Admin - Images'],
		parameters: [
			new OA\Parameter(
				name: 'id',
				in: 'path',
				description: 'Image ID',
				required: true,
				schema: new OA\Schema(type: 'integer')
			)
		],
		requestBody: new OA\RequestBody(
			required: true,
			content: new OA\JsonContent(ref: '#/components/schemas/ImageUpdate')
		),
		responses: [
			new OA\Response(
				response: 200,
				description: 'Image updated successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'message', type: 'string', description: 'Success message')
					]
				)
			),
			new OA\Response(response: 400, description: 'Bad request - No data provided, invalid data types, invalid URL format, or validation errors'),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 404, description: 'Image not found'),
			new OA\Response(response: 409, description: 'Conflict - Image name or URL already exists'),
			new OA\Response(response: 500, description: 'Internal server error - Failed to update image')
		]
	)]
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

	#[OA\Delete(
		path: '/api/admin/images/{id}',
		summary: 'Delete image',
		description: 'Permanently delete an image record.',
		tags: ['Admin - Images'],
		parameters: [
			new OA\Parameter(
				name: 'id',
				in: 'path',
				description: 'Image ID',
				required: true,
				schema: new OA\Schema(type: 'integer')
			)
		],
		responses: [
			new OA\Response(
				response: 200,
				description: 'Image deleted successfully',
				content: new OA\JsonContent(
					properties: [
						new OA\Property(property: 'message', type: 'string', description: 'Success message')
					]
				)
			),
			new OA\Response(response: 400, description: 'Bad request - Invalid image ID'),
			new OA\Response(response: 401, description: 'Unauthorized'),
			new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
			new OA\Response(response: 404, description: 'Image not found'),
			new OA\Response(response: 500, description: 'Internal server error - Failed to delete image')
		]
	)]
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
