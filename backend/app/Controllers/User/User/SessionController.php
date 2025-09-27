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

use App\App;
use App\Chat\User;
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\Permission;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use App\CloudFlare\CloudFlareTurnstile;
use App\Plugins\Events\Events\UserEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'SessionUpdateRequest',
    type: 'object',
    properties: [
        new OA\Property(property: 'username', type: 'string', minLength: 3, maxLength: 32, description: 'Username (alphanumeric and underscores only)'),
        new OA\Property(property: 'email', type: 'string', format: 'email', minLength: 3, maxLength: 255, description: 'User email address'),
        new OA\Property(property: 'first_name', type: 'string', minLength: 1, maxLength: 64, description: 'User first name'),
        new OA\Property(property: 'last_name', type: 'string', minLength: 1, maxLength: 64, description: 'User last name'),
        new OA\Property(property: 'password', type: 'string', minLength: 8, maxLength: 255, description: 'User password'),
        new OA\Property(property: 'avatar', type: 'string', format: 'uri', description: 'Avatar URL (must start with https://)'),
        new OA\Property(property: 'two_fa_enabled', type: 'boolean', description: 'Two-factor authentication enabled status'),
        new OA\Property(property: 'turnstile_token', type: 'string', description: 'CloudFlare Turnstile token (required if Turnstile is enabled)'),
    ]
)]
#[OA\Schema(
    schema: 'SessionUpdateResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
    ]
)]
#[OA\Schema(
    schema: 'SessionResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'user_info', type: 'object', description: 'User information'),
        new OA\Property(property: 'permissions', type: 'array', items: new OA\Items(type: 'string'), description: 'User permissions'),
        new OA\Property(property: 'activity', type: 'object', properties: [
            new OA\Property(property: 'count', type: 'integer', description: 'Number of activities'),
            new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object'), description: 'Activity data'),
        ]),
        new OA\Property(property: 'mails', type: 'object', properties: [
            new OA\Property(property: 'count', type: 'integer', description: 'Number of mails'),
            new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object'), description: 'Mail data'),
        ]),
    ]
)]
class SessionController
{
    #[OA\Patch(
        path: '/api/user/session',
        summary: 'Update user session',
        description: 'Update user profile information including username, email, password, avatar, and 2FA settings. Includes CloudFlare Turnstile validation if enabled.',
        tags: ['User - Session'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SessionUpdateRequest')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Session updated successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/SessionUpdateResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token, request data, field validation, Turnstile validation failed, or Turnstile keys not set'),
            new OA\Response(response: 409, description: 'Conflict - Username or email already exists'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update session'),
        ]
    )]
    public function put(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);

        if ($config->getSetting(ConfigInterface::TURNSTILE_ENABLED, 'false') == 'true') {
            $turnstileKeyPublic = $config->getSetting(ConfigInterface::TURNSTILE_KEY_PUB, 'NULL');
            $turnstileKeySecret = $config->getSetting(ConfigInterface::TURNSTILE_KEY_PRIV, 'NULL');
            if ($turnstileKeyPublic == 'NULL' || $turnstileKeySecret == 'NULL') {
                return ApiResponse::error('Turnstile keys are not set', 'TURNSTILE_KEYS_NOT_SET');
            }
            if (!isset($data['turnstile_token']) || trim($data['turnstile_token']) === '') {
                return ApiResponse::error('Turnstile token is required', 'TURNSTILE_TOKEN_REQUIRED');
            }
            if (!CloudFlareTurnstile::validate($data['turnstile_token'], CloudFlareRealIP::getRealIP(), $turnstileKeySecret)) {
                return ApiResponse::error('Turnstile validation failed', 'TURNSTILE_VALIDATION_FAILED');
            }
        }

        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400, []);
        }

        $validData = [
            'username',
            'email',
            'first_name',
            'last_name',
            'password',
            'avatar',
            'two_fa_enabled',
        ];
        // Validate two_fa_enabled field
        if (isset($data['two_fa_enabled'])) {
            if (!is_bool($data['two_fa_enabled'])) {
                return ApiResponse::error('two_fa_enabled must be a boolean value', 'INVALID_2FA_VALUE');
            }
            $data['two_fa_enabled'] = $data['two_fa_enabled'] ? 'true' : 'false';
        }

        // Validate avatar URL (only if it's a URL, not a file upload)
        if (isset($data['avatar']) && !empty($data['avatar'])) {
            // Check if it's a URL (starts with http) or a local path (starts with /)
            if (!str_starts_with(strtolower($data['avatar']), 'http') && !str_starts_with($data['avatar'], '/')) {
                return ApiResponse::error('Avatar must be a valid URL or local path', 'INVALID_AVATAR_PATH');
            }
        }

        // Check if at least one valid field is present
        $hasValidField = false;
        foreach ($data as $key => $value) {
            if (!in_array($key, $validData)) {
                return ApiResponse::error('Invalid field: ' . $key, 'INVALID_FIELD', 400);
            }
            $hasValidField = true;
        }

        if (!$hasValidField) {
            return ApiResponse::error('At least one valid field must be provided', 'NO_FIELDS_PROVIDED', 400);
        }
        // Validate data length
        $lengthRules = [
            'username' => [3, 32],
            'first_name' => [1, 64],
            'last_name' => [1, 64],
            'email' => [3, 255],
            'password' => [8, 255],
        ];
        foreach ($lengthRules as $field => [$min, $max]) {
            if (isset($data[$field])) {
                $len = strlen($data[$field]);
                if ($len < $min) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be at least $min characters long", 'INVALID_DATA_LENGTH');
                }
                if ($len > $max) {
                    return ApiResponse::error(ucfirst(str_replace('_', ' ', $field)) . " must be less than $max characters long", 'INVALID_DATA_LENGTH');
                }
            }
        }
        // Validate email format
        if (isset($data['email'])) {
            if (!filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                return ApiResponse::error('Invalid email address', 'INVALID_EMAIL_ADDRESS');
            }
            if (User::getUserByEmail($data['email'])) {
                return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
            }
        }

        if (isset($data['username'])) {
            if (User::getUserByUsername($data['username'])) {
                return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS', 409);
            }
        }
        // Hash password if provided
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
        }

        $userQuery = User::updateUser($user['uuid'], $data);
        if (!$userQuery) {
            return ApiResponse::error('Failed to update user', 'FAILED_TO_UPDATE_USER', 500);
        }
        global $eventManager;
        $eventManager->emit(
            UserEvent::onUserUpdate(),
            ['user_uuid' => $user['uuid']]
        );

        return ApiResponse::success($data, 'Session created', 200);
    }

    #[OA\Get(
        path: '/api/user/session',
        summary: 'Get user session',
        description: 'Retrieve current user session information including user details, permissions, activities, and mail data.',
        tags: ['User - Session'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Session information retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/SessionResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to retrieve session'),
        ]
    )]
    public function get(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        $permissions = Permission::getPermissionsByRoleId($user['role_id']);
        $permissions = array_column($permissions, 'permission');

        $activity = Activity::getActivitiesByUser($user['uuid']);

        $mailList = MailList::getByUserUuid($user['uuid']);
        $queueIds = array_column($mailList, 'queue_id');
        $mailQueues = MailQueue::getByIds($queueIds);
        $user['mails'] = [];
        foreach ($queueIds as $queueId) {
            if (isset($mailQueues[$queueId])) {
                $mail = $mailQueues[$queueId];
                unset($mail['id'], $mail['user_uuid'], $mail['deleted'], $mail['locked'], $mail['updated_at']);
                $user['mails'][] = $mail;
            }
        }

        return ApiResponse::success([
            'user_info' => $user,
            'permissions' => $permissions,
            'activity' => [
                'count' => count($activity),
                'data' => $activity,
            ],
            'mails' => [
                'count' => count($user['mails']),
                'data' => $user['mails'],
            ],
        ], 'Session retrieved', 200);
    }

    #[OA\Post(
        path: '/api/user/avatar',
        summary: 'Upload user avatar',
        description: 'Upload a new avatar image for the current user. Accepts image files up to 5MB in size.',
        tags: ['User - Session'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\MediaType(
                mediaType: 'multipart/form-data',
                schema: new OA\Schema(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'avatar', type: 'string', format: 'binary', description: 'Avatar image file'),
                    ],
                    required: ['avatar']
                )
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Avatar uploaded successfully',
                content: new OA\JsonContent(
                    type: 'object',
                    properties: [
                        new OA\Property(property: 'success', type: 'boolean', description: 'Success status'),
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                        new OA\Property(property: 'avatar_url', type: 'string', description: 'URL to the uploaded avatar'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid file, file too large, or invalid authentication'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to save avatar'),
        ]
    )]
    public function uploadAvatar(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $uploadedFile = $request->files->get('avatar');

        if (!$uploadedFile) {
            return ApiResponse::error('No avatar file provided', 'NO_FILE_PROVIDED', 400);
        }

        // Validate file type
        $allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($uploadedFile->getMimeType(), $allowedTypes)) {
            return ApiResponse::error('Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed.', 'INVALID_FILE_TYPE', 400);
        }

        // Validate file size (max 5MB)
        $maxSize = 5 * 1024 * 1024; // 5MB
        if ($uploadedFile->getSize() > $maxSize) {
            return ApiResponse::error('File too large. Maximum size is 5MB.', 'FILE_TOO_LARGE', 400);
        }

        // Generate unique filename using user UUID
        $extension = $uploadedFile->guessExtension();
        $filename = $user['uuid'] . '.' . $extension;
        $avatarsDir = __DIR__ . '/../../../../public/attachments/avatars/';

        // Ensure avatars directory exists
        if (!is_dir($avatarsDir)) {
            mkdir($avatarsDir, 0755, true);
        }

        // Move uploaded file
        try {
            $uploadedFile->move($avatarsDir, $filename);

            // Generate URL for the avatar
            $avatarUrl = '/attachments/avatars/' . $filename;

            return ApiResponse::success([
                'avatar_url' => $avatarUrl,
            ], 'Avatar uploaded successfully', 200);

        } catch (\Exception $e) {
            return ApiResponse::error('Failed to save avatar', 'SAVE_FAILED', 500);
        }
    }
}
