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

namespace App\Controllers\User\Storage;

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Helpers\AppUrlHelper;
use App\Middleware\AuthMiddleware;
use App\Chat\UserStorageDestination;
use App\CloudFlare\CloudFlareRealIP;
use App\Services\Storage\StorageSettings;
use App\Services\Storage\StorageException;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Services\Storage\StorageDestinationService;
use App\Services\Storage\Providers\ProviderRegistry;
use Symfony\Component\HttpFoundation\RedirectResponse;

/**
 * OAuth connect flow for cloud backup storage (authorization code + PKCE).
 *
 * start: creates a "pending" destination (or marks an existing one for reconnecting) holding the
 * SHA-256 of a random state secret and the PKCE verifier, and returns the consent URL. The state
 * sent to the provider is "<destination uuid>.<secret>", so the callback can only complete a
 * destination of the signed-in user that has a matching, unexpired secret (CSRF safe).
 */
class StorageOAuthController
{
    public function start(Request $request, string $provider): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        $userId = (int) $user['id'];
        if (!StorageSettings::byoEnabled()) {
            return ApiResponse::error('Bring-your-own backup storage is disabled on this panel', 'BYO_STORAGE_DISABLED', 403);
        }
        if (!ProviderRegistry::has($provider) || !in_array($provider, StorageSettings::allowedProviders(), true)) {
            return ApiResponse::error('This storage provider is not allowed on this panel', 'PROVIDER_NOT_ALLOWED', 403);
        }
        $oauth = ProviderRegistry::oauth($provider);
        if (!$oauth->available()) {
            return ApiResponse::error('This storage provider is not configured on the panel', 'PROVIDER_NOT_CONFIGURED', 503);
        }
        $body = json_decode($request->getContent(), true);
        $body = is_array($body) ? $body : [];

        $secret = bin2hex(random_bytes(24));
        $verifier = rtrim(strtr(base64_encode(random_bytes(48)), '+/', '-_'), '=');
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
        $pending = ['oauth_state' => hash('sha256', $secret), 'oauth_verifier' => $verifier, 'oauth_started' => time()];

        UserStorageDestination::purgeStalePending();
        if (!empty($body['reconnect_id'])) {
            $row = UserStorageDestination::getForUser((int) $body['reconnect_id'], $userId);
            if ($row === null || (string) $row['provider'] !== $provider) {
                return ApiResponse::error('Storage destination not found', 'DESTINATION_NOT_FOUND', 404);
            }
            UserStorageDestination::update((int) $row['id'], ['config' => $pending + UserStorageDestination::config($row)]);
        } else {
            $name = mb_substr(trim((string) ($body['name'] ?? '')), 0, 100);
            if ($name === '') {
                $name = $oauth->label();
            }
            UserStorageDestination::purgePendingForUser($userId);
            if (UserStorageDestination::countForUser($userId) >= StorageSettings::maxDestinationsPerUser()) {
                return ApiResponse::error('You reached the maximum number of storage destinations', 'DESTINATION_LIMIT_REACHED', 400);
            }
            $id = UserStorageDestination::create($userId, $name, $provider, $pending, UserStorageDestination::STATUS_PENDING);
            if (!$id) {
                return ApiResponse::error('Failed to save the storage destination', 'DESTINATION_CREATE_FAILED', 500);
            }
            $row = UserStorageDestination::getById($id);
        }

        return ApiResponse::success([
            'authorize_url' => $oauth->authorizeUrl((string) $row['uuid'] . '.' . $secret, $challenge),
            'redirect_uri' => $oauth->redirectUri(),
        ], 'Continue at the provider');
    }

    public function callback(Request $request, string $provider): Response
    {
        $user = AuthMiddleware::getCurrentUser($request);
        $userId = (int) $user['id'];
        $state = (string) $request->query->get('state', '');
        $parts = explode('.', $state, 2);
        $row = (count($parts) === 2 && preg_match('/^[a-f0-9-]{36}$/', $parts[0])) ? UserStorageDestination::getByUuidForUser($parts[0], $userId) : null;
        $config = $row !== null ? UserStorageDestination::config($row) : [];
        $fresh = (int) ($config['oauth_started'] ?? 0) > time() - UserStorageDestination::PENDING_TTL_SECONDS;
        if ($row === null || (string) $row['provider'] !== $provider || empty($config['oauth_state']) || !$fresh
            || !hash_equals((string) $config['oauth_state'], hash('sha256', (string) $parts[1]))) {
            return $this->back(null, 'OAUTH_STATE_INVALID');
        }
        $isPending = (string) $row['status'] === UserStorageDestination::STATUS_PENDING;
        $clean = $config;
        unset($clean['oauth_state'], $clean['oauth_verifier'], $clean['oauth_started']);

        $error = (string) $request->query->get('error', '');
        $code = (string) $request->query->get('code', '');
        if ($error !== '' || $code === '') {
            $isPending ? UserStorageDestination::hardDeletePending((int) $row['id']) : UserStorageDestination::update((int) $row['id'], ['config' => $clean]);

            return $this->back(null, $error === 'access_denied' ? 'OAUTH_DENIED' : 'OAUTH_FAILED');
        }

        try {
            $oauth = ProviderRegistry::oauth($provider);
            $connected = $oauth->exchangeCode($code, (string) $config['oauth_verifier']);
            if (!$isPending) {
                // Reconnecting: must be the same account, and the existing folder keeps its backups.
                if (!empty($clean['account']) && !empty($connected['account']) && strcasecmp((string) $clean['account'], (string) $connected['account']) !== 0) {
                    UserStorageDestination::update((int) $row['id'], ['config' => $clean]);

                    return $this->back(null, 'OAUTH_ACCOUNT_MISMATCH');
                }
                foreach (['folder_id', 'root', 'drive_id'] as $keep) {
                    if (!empty($clean[$keep])) {
                        $connected[$keep] = $clean[$keep];
                    }
                }
            }
            UserStorageDestination::update((int) $row['id'], [
                'config' => $connected + $clean,
                'status' => UserStorageDestination::STATUS_ACTIVE,
                'last_error' => null,
                'last_tested_at' => date('Y-m-d H:i:s'),
            ]);
        } catch (StorageException $e) {
            App::getInstance(true)->getLogger()->warning('Storage OAuth callback failed for ' . $provider . ': ' . $e->getMessage());
            $isPending ? UserStorageDestination::hardDeletePending((int) $row['id']) : UserStorageDestination::update((int) $row['id'], ['config' => $clean]);

            return $this->back(null, $e->errorCode());
        }

        // Fill in quota right away (best effort; the user can test again later).
        $fresh = UserStorageDestination::getById((int) $row['id']);
        if ($fresh !== null) {
            StorageDestinationService::test($fresh);
        }

        Activity::createActivity([
            'user_uuid' => $user['uuid'],
            'name' => $isPending ? 'storage_destination_created' : 'storage_destination_reconnected',
            'context' => ($isPending ? 'Connected' : 'Reconnected') . ' backup storage "' . $row['name'] . '" (' . $provider . ')',
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);

        return $this->back((string) $row['uuid'], null);
    }

    private function back(?string $uuid, ?string $error): Response
    {
        $query = $error !== null ? 'storage_error=' . rawurlencode($error) : 'storage_connected=' . rawurlencode((string) $uuid);

        return new RedirectResponse(AppUrlHelper::baseUrl() . '/dashboard/account?tab=storage&' . $query, 302);
    }
}
