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

use App\Chat\PushSubscription;
use App\Chat\UserPreference;
use App\Helpers\ApiResponse;
use App\Middleware\AuthMiddleware;
use App\Services\Notifications\ExternalNotifier;
use App\Services\Notifications\WebPushNotifier;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class PushSubscriptionController
{
    #[OA\Get(
        path: '/api/user/push/vapid',
        summary: 'Get the VAPID public key for Web Push',
        tags: ['User - Session'],
        responses: [new OA\Response(response: 200, description: 'VAPID public key')]
    )]
    public function vapid(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        if (!WebPushNotifier::isEnabled()) {
            return ApiResponse::error('Web push is not enabled', 'PUSH_NOT_ENABLED', 404);
        }
        $publicKey = WebPushNotifier::publicKey();
        if ($publicKey === null || $publicKey === '') {
            return ApiResponse::error('Web push is not configured', 'PUSH_NOT_CONFIGURED', 503);
        }

        return ApiResponse::success([
            'publicKey' => $publicKey,
            'enabled' => true,
            'subscriptions' => PushSubscription::countForUser((int) $user['id']),
        ], 'VAPID public key', 200);
    }

    #[OA\Get(
        path: '/api/user/push/subscriptions',
        summary: 'List this account push subscriptions (no secrets)',
        tags: ['User - Session'],
        responses: [new OA\Response(response: 200, description: 'Subscriptions')]
    )]
    public function index(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        $rows = PushSubscription::listForUser((int) $user['id']);
        $safe = array_map(static function (array $row): array {
            return [
                'id' => $row['id'],
                'endpoint' => self::maskEndpoint((string) $row['endpoint']),
                'user_agent' => $row['user_agent'] ?? null,
                'created_at' => $row['created_at'] ?? null,
                'updated_at' => $row['updated_at'] ?? null,
            ];
        }, $rows);

        return ApiResponse::success([
            'enabled' => WebPushNotifier::isEnabled(),
            'subscriptions' => $safe,
        ], 'Push subscriptions', 200);
    }

    #[OA\Post(
        path: '/api/user/push/subscriptions',
        summary: 'Register or refresh a Web Push subscription',
        tags: ['User - Session'],
        responses: [new OA\Response(response: 200, description: 'Subscription saved')]
    )]
    public function store(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        if (!WebPushNotifier::isEnabled()) {
            return ApiResponse::error('Web push is not enabled', 'PUSH_NOT_ENABLED', 404);
        }

        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }

        $endpoint = trim((string) ($data['endpoint'] ?? ''));
        $keys = is_array($data['keys'] ?? null) ? $data['keys'] : [];
        $p256dh = trim((string) ($keys['p256dh'] ?? $data['p256dh'] ?? ''));
        $auth = trim((string) ($keys['auth'] ?? $data['auth'] ?? ''));
        $encoding = trim((string) ($data['contentEncoding'] ?? $data['content_encoding'] ?? 'aes128gcm'));
        $userAgent = substr((string) ($request->headers->get('User-Agent') ?? ''), 0, 512);

        if ($endpoint === '' || !preg_match('#^https://#i', $endpoint) || strlen($endpoint) > 512) {
            return ApiResponse::error('Invalid push endpoint', 'INVALID_PUSH_SUBSCRIPTION', 400);
        }
        if ($p256dh === '' || $auth === '' || strlen($p256dh) > 255 || strlen($auth) > 255) {
            return ApiResponse::error('Invalid push subscription keys', 'INVALID_PUSH_SUBSCRIPTION', 400);
        }
        if ($encoding === '') {
            $encoding = 'aes128gcm';
        }

        $saved = PushSubscription::upsert((int) $user['id'], $endpoint, $p256dh, $auth, $encoding, $userAgent !== '' ? $userAgent : null);
        if ($saved === null) {
            return ApiResponse::error('Failed to save push subscription', 'PUSH_SUBSCRIBE_FAILED', 500);
        }

        // Turn the channel on once the browser has a working subscription.
        $prefs = ExternalNotifier::getPreferences((string) $user['uuid']);
        if (empty($prefs['push_enabled'])) {
            $prefs['push_enabled'] = true;
            UserPreference::updatePreferences((string) $user['uuid'], [ExternalNotifier::PREF_KEY => $prefs]);
        }

        return ApiResponse::success([
            'id' => $saved['id'],
            'endpoint' => self::maskEndpoint((string) $saved['endpoint']),
        ], 'Push subscription saved', 200);
    }

    #[OA\Delete(
        path: '/api/user/push/subscriptions',
        summary: 'Remove a Web Push subscription by endpoint, or all of them',
        tags: ['User - Session'],
        responses: [new OA\Response(response: 200, description: 'Subscription removed')]
    )]
    public function destroy(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        $data = json_decode($request->getContent() ?: '{}', true);
        if (!is_array($data)) {
            $data = [];
        }
        $endpoint = trim((string) ($data['endpoint'] ?? $request->query->get('endpoint', '')));
        $all = !empty($data['all']) || $request->query->get('all') === '1';

        if ($all) {
            $removed = PushSubscription::deleteAllForUser((int) $user['id']);
            $prefs = ExternalNotifier::getPreferences((string) $user['uuid']);
            $prefs['push_enabled'] = false;
            UserPreference::updatePreferences((string) $user['uuid'], [ExternalNotifier::PREF_KEY => $prefs]);

            return ApiResponse::success(['removed' => $removed], 'Push subscriptions removed', 200);
        }

        if ($endpoint === '') {
            return ApiResponse::error('Missing endpoint', 'INVALID_PUSH_SUBSCRIPTION', 400);
        }
        PushSubscription::deleteForUserByEndpoint((int) $user['id'], $endpoint);
        if (PushSubscription::countForUser((int) $user['id']) === 0) {
            $prefs = ExternalNotifier::getPreferences((string) $user['uuid']);
            $prefs['push_enabled'] = false;
            UserPreference::updatePreferences((string) $user['uuid'], [ExternalNotifier::PREF_KEY => $prefs]);
        }

        return ApiResponse::success([], 'Push subscription removed', 200);
    }

    #[OA\Post(
        path: '/api/user/push/test',
        summary: 'Send a test Web Push to this account',
        tags: ['User - Session'],
        responses: [new OA\Response(response: 200, description: 'Test queued')]
    )]
    public function test(Request $request): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        if ($user === null) {
            return ApiResponse::error('You are not allowed to access this resource!', 'INVALID_ACCOUNT_TOKEN', 400, []);
        }
        $error = WebPushNotifier::test($user);
        if ($error !== null) {
            return ApiResponse::error($error, 'PUSH_TEST_FAILED', 400);
        }

        return ApiResponse::success([], 'Test push sent', 200);
    }

    private static function maskEndpoint(string $endpoint): string
    {
        if (strlen($endpoint) <= 48) {
            return $endpoint;
        }

        return substr($endpoint, 0, 32) . '…' . substr($endpoint, -12);
    }
}
