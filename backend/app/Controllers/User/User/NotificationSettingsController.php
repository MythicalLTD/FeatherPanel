<?php

/*
 * This file is part of FeatherPanel.
 *
 * Copyright (C) 2025 MythicalSystems Studios
 * Copyright (C) 2025 FeatherPanel Contributors
 * Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published
 * by the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * See the LICENSE file or <https://www.gnu.org/licenses/>.
 */

namespace App\Controllers\User\User;

use App\App;
use App\Chat\UserPreference;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\Middleware\AuthMiddleware;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Notifications\ExternalNotifier;

class NotificationSettingsController
{
    #[OA\Get(
        path: '/api/user/notification-settings',
        summary: 'Get email and Discord notification settings',
        tags: ['User - Session'],
        responses: [new OA\Response(response: 200, description: 'Settings retrieved')]
    )]
    public function get(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }

        return ApiResponse::success(ExternalNotifier::getPreferences((string) $user['uuid']), 'Notification settings retrieved', 200);
    }

    #[OA\Put(
        path: '/api/user/notification-settings',
        summary: 'Save email and Discord notification settings',
        tags: ['User - Session'],
        responses: [
            new OA\Response(response: 200, description: 'Settings saved'),
            new OA\Response(response: 400, description: 'Invalid webhook URL'),
        ]
    )]
    public function update(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }
        $prefs = ExternalNotifier::normalize($data);
        if (!ExternalNotifier::isValidWebhook($prefs['discord_webhook_url'])) {
            return ApiResponse::error('Enter a valid Discord webhook URL', 'INVALID_DISCORD_WEBHOOK', 400);
        }
        if (!UserPreference::updatePreferences((string) $user['uuid'], [ExternalNotifier::PREF_KEY => $prefs])) {
            return ApiResponse::error('Failed to save notification settings', 'NOTIFICATION_SETTINGS_SAVE_FAILED', 500);
        }

        return ApiResponse::success($prefs, 'Notification settings saved', 200);
    }

    #[OA\Post(
        path: '/api/user/notification-settings/test-discord',
        summary: 'Send a test message to the saved Discord webhook',
        tags: ['User - Session'],
        responses: [new OA\Response(response: 200, description: 'Test sent')]
    )]
    public function testDiscord(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        $webhook = ExternalNotifier::getPreferences((string) $user['uuid'])['discord_webhook_url'];
        if ($webhook === '' || !ExternalNotifier::isValidWebhook($webhook)) {
            return ApiResponse::error('Save a Discord webhook URL first', 'INVALID_DISCORD_WEBHOOK', 400);
        }
        $appName = (string) App::getInstance(true)->getConfig()->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel');
        $error = ExternalNotifier::testDiscord($webhook, $appName);
        if ($error !== null) {
            return ApiResponse::error($error, 'DISCORD_WEBHOOK_TEST_FAILED', 502);
        }

        return ApiResponse::success([], 'Test message sent', 200);
    }
}
