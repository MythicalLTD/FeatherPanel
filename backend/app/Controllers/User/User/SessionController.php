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
use App\Chat\Activity;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Chat\Permission;
use App\Chat\UserPreference;
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
        new OA\Property(property: 'preferences', ref: '#/components/schemas/UserPreferences', description: 'User preferences'),
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
#[OA\Schema(
    schema: 'UserPreferences',
    type: 'object',
    description: 'User preferences stored as localStorage key-value pairs',
    additionalProperties: true
)]
#[OA\Schema(
    schema: 'PreferencesResponse',
    type: 'object',
    properties: [
        new OA\Property(property: 'preferences', ref: '#/components/schemas/UserPreferences', description: 'User preferences object'),
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
            // Only check for duplicate email if it's different from the current user's email
            if ($data['email'] !== $user['email']) {
                $existingUser = User::getUserByEmail($data['email']);
                if ($existingUser) {
                    return ApiResponse::error('Email already exists', 'EMAIL_ALREADY_EXISTS', 409);
                }
            }
        }

        if (isset($data['username'])) {
            // Only check for duplicate username if it's different from the current user's username
            if ($data['username'] !== $user['username']) {
                $existingUser = User::getUserByUsername($data['username']);
                if ($existingUser) {
                    return ApiResponse::error('Username already exists', 'USERNAME_ALREADY_EXISTS', 409);
                }
            }
        }
        // Hash password if provided
        if (isset($data['password'])) {
            $data['password'] = password_hash($data['password'], PASSWORD_BCRYPT);
            $data['remember_token'] = User::generateAccountToken();
        }

        $userQuery = User::updateUser($user['uuid'], $data);
        if (!$userQuery) {
            return ApiResponse::error('Failed to update user', 'FAILED_TO_UPDATE_USER', 500);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                UserEvent::onUserUpdate(),
                ['user_uuid' => $user['uuid']]
            );
        }

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

        // Load user preferences
        $preferences = UserPreference::getPreferences($user['uuid']);

        return ApiResponse::success([
            'user_info' => $user,
            'permissions' => $permissions,
            'preferences' => $preferences,
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

    #[OA\Get(
        path: '/api/user/preferences',
        summary: 'Get user preferences',
        description: 'Retrieve current user UI/UX preferences including theme, language, sidebar state, and other settings.',
        tags: ['User - Session'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Preferences retrieved successfully',
                content: new OA\JsonContent(ref: '#/components/schemas/PreferencesResponse')
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
        ]
    )]
    public function getPreferences(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $preferences = UserPreference::getPreferences($user['uuid']);

        return ApiResponse::success([
            'preferences' => $preferences,
        ], 'Preferences retrieved successfully', 200);
    }

    #[OA\Patch(
        path: '/api/user/preferences',
        summary: 'Update user preferences',
        description: 'Update current user UI/UX preferences. Any preference fields can be provided and will be merged with existing preferences.',
        tags: ['User - Session'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/UserPreferences')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Preferences updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'preferences', ref: '#/components/schemas/UserPreferences'),
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid authentication token or request data'),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update preferences'),
        ]
    )]
    public function updatePreferences(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user == null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        $data = json_decode($request->getContent(), true);
        if ($data == null || !is_array($data)) {
            return ApiResponse::error('Invalid request data', 'INVALID_REQUEST_DATA', 400, []);
        }

        // Update preferences (merges with existing)
        $success = UserPreference::updatePreferences($user['uuid'], $data);

        if (!$success) {
            return ApiResponse::error('Failed to update preferences', 'FAILED_TO_UPDATE_PREFERENCES', 500);
        }

        // Get updated preferences to return
        $updatedPreferences = UserPreference::getPreferences($user['uuid']);

        return ApiResponse::success([
            'preferences' => $updatedPreferences,
        ], 'Preferences updated successfully', 200);
    }
}
