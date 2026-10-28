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

namespace App\Services\Storage\Providers;

use App\Chat\UserStorageDestination;
use Psr\Http\Message\ResponseInterface;
use App\Services\Storage\StorageSettings;
use App\Services\Storage\StorageException;
use App\Services\Notifications\InboxNotifier;

/**
 * Shared OAuth 2.0 authorization code flow (with PKCE) and token handling for cloud providers.
 *
 * Tokens live in the destination's encrypted config: refresh_token, access_token, access_expires_at.
 * When the provider rejects the refresh token (invalid_grant) the destination is marked revoked and
 * the owner is notified; backups on it stay listed and work again after reconnecting.
 */
abstract class OAuthProvider implements StorageProviderInterface
{
    public function isOAuth(): bool
    {
        return true;
    }

    public function available(): bool
    {
        [$id, $secret] = StorageSettings::oauthClient($this->key());

        return $id !== '' && $secret !== '';
    }

    public function redirectUri(): string
    {
        return \App\Helpers\AppUrlHelper::baseUrl() . '/api/user/storage-destinations/oauth/' . $this->key() . '/callback';
    }

    public function authorizeUrl(string $state, string $codeChallenge): string
    {
        [$clientId] = StorageSettings::oauthClient($this->key());
        $query = [
            'client_id' => $clientId,
            'redirect_uri' => $this->redirectUri(),
            'response_type' => 'code',
            'scope' => implode(' ', $this->scopes()),
            'state' => $state,
            'code_challenge' => $codeChallenge,
            'code_challenge_method' => 'S256',
        ] + $this->authorizeExtras();

        return ProviderHttp::url($this->authorizeEndpoint() . '?' . http_build_query($query, '', '&', PHP_QUERY_RFC3986));
    }

    /**
     * Exchange the authorization code and prepare the destination config.
     *
     * @return array<string, mixed>
     */
    public function exchangeCode(string $code, string $verifier): array
    {
        $tokens = $this->tokenRequest([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $this->redirectUri(),
            'code_verifier' => $verifier,
        ]);
        if (empty($tokens['refresh_token'])) {
            throw new StorageException('The provider did not return a refresh token; remove the panel from your connected apps and try again', 'OAUTH_NO_REFRESH_TOKEN', 400);
        }
        $config = [
            'refresh_token' => (string) $tokens['refresh_token'],
            'access_token' => (string) $tokens['access_token'],
            'access_expires_at' => time() + max(60, (int) ($tokens['expires_in'] ?? 3600)),
        ];

        return $config + $this->initialize((string) $tokens['access_token']);
    }

    /** A valid access token, refreshed (and saved) when it expires within $minLifetime seconds. */
    public function accessToken(array $dest, int $minLifetime = 120, bool $forceRefresh = false): string
    {
        // Re-read the row: another request may have refreshed (or rotated) the tokens since $dest was loaded.
        $dest = UserStorageDestination::getById((int) $dest['id']) ?? $dest;
        $config = UserStorageDestination::config($dest);
        if ((string) $dest['status'] === UserStorageDestination::STATUS_REVOKED) {
            throw new StorageException('This storage was disconnected; reconnect it to use it again', 'DESTINATION_REVOKED', 409);
        }
        if (!$forceRefresh && !empty($config['access_token']) && (int) ($config['access_expires_at'] ?? 0) > time() + $minLifetime) {
            return (string) $config['access_token'];
        }
        if (empty($config['refresh_token'])) {
            throw new StorageException('This storage is not connected', 'DESTINATION_NOT_CONNECTED', 409);
        }
        try {
            $tokens = $this->tokenRequest(['grant_type' => 'refresh_token', 'refresh_token' => (string) $config['refresh_token']]);
        } catch (StorageException $e) {
            if ($e->errorCode() === 'OAUTH_INVALID_GRANT') {
                $this->markRevoked($dest, 'Access was revoked at the provider. Reconnect this storage.');
                throw new StorageException('Access to this storage was revoked at the provider; reconnect it', 'DESTINATION_REVOKED', 409);
            }
            throw $e;
        }
        $config['access_token'] = (string) $tokens['access_token'];
        $config['access_expires_at'] = time() + max(60, (int) ($tokens['expires_in'] ?? 3600));
        if (!empty($tokens['refresh_token'])) {
            // Microsoft rotates refresh tokens.
            $config['refresh_token'] = (string) $tokens['refresh_token'];
        }
        UserStorageDestination::update((int) $dest['id'], ['config' => $config]);

        return (string) $config['access_token'];
    }

    /** Lose access for good: status revoked, owner notified once. */
    public function markRevoked(array $dest, string $reason): void
    {
        if ((string) $dest['status'] === UserStorageDestination::STATUS_REVOKED) {
            return;
        }
        UserStorageDestination::update((int) $dest['id'], ['status' => UserStorageDestination::STATUS_REVOKED, 'last_error' => $reason]);
        InboxNotifier::storageDisconnected($dest, UserStorageDestination::countBackups((int) $dest['id']));
    }

    public static function fileName(array $server, array $backup): string
    {
        $name = preg_replace('/[^A-Za-z0-9._-]+/', '_', (string) ($backup['name'] ?? 'backup')) ?: 'backup';

        return mb_substr($name, 0, 80) . '-' . substr((string) $backup['uuid'], 0, 8) . '.tar.gz';
    }

    abstract protected function authorizeEndpoint(): string;

    abstract protected function tokenEndpoint(): string;

    /** @return list<string> */
    abstract protected function scopes(): array;

    /**
     * Extra query parameters for the consent URL.
     *
     * @return array<string, string>
     */
    protected function authorizeExtras(): array
    {
        return [];
    }

    /** Called once after the code exchange: read the account, prepare the backup folder. Returns config additions. */
    abstract protected function initialize(string $accessToken): array;

    /**
     * @param array<string, string> $params
     *
     * @return array<string, mixed>
     */
    protected function tokenRequest(array $params): array
    {
        [$clientId, $secret] = StorageSettings::oauthClient($this->key());
        if ($clientId === '' || $secret === '') {
            throw new StorageException('This storage provider is not configured on the panel', 'PROVIDER_NOT_CONFIGURED', 503);
        }
        $res = ProviderHttp::request('POST', $this->tokenEndpoint(), [
            'form_params' => $params + ['client_id' => $clientId, 'client_secret' => $secret],
            'headers' => ['Accept' => 'application/json'],
        ]);
        $data = ProviderHttp::json($res);
        if ($res->getStatusCode() !== 200 || empty($data['access_token'])) {
            $err = (string) ($data['error'] ?? '');
            if ($err === 'invalid_grant') {
                throw new StorageException('The provider rejected the authorization: ' . ProviderHttp::describe($res), 'OAUTH_INVALID_GRANT', 400);
            }
            throw new StorageException('Token request failed: ' . ProviderHttp::describe($res), 'OAUTH_TOKEN_FAILED', 502);
        }

        return $data;
    }

    /** @return array<string, string> */
    protected function bearer(array $dest, int $minLifetime = 120): array
    {
        return ['Authorization' => 'Bearer ' . $this->accessToken($dest, $minLifetime)];
    }

    /**
     * An API call with the user's access token. A 401 (token revoked early, clock skew) gets one retry
     * with a freshly refreshed token. Not for requests with a streamed body.
     *
     * @param array<string, mixed> $options
     */
    protected function authed(array $dest, string $method, string $url, array $options = []): ResponseInterface
    {
        $options['headers'] = $this->bearer($dest) + ($options['headers'] ?? []);
        $res = ProviderHttp::request($method, $url, $options);
        if ($res->getStatusCode() === 401) {
            $options['headers']['Authorization'] = 'Bearer ' . $this->accessToken($dest, 120, true);
            $res = ProviderHttp::request($method, $url, $options);
        }

        return $res;
    }

    protected function fail(string $what, ResponseInterface $res, string $code = 'PROVIDER_ERROR'): StorageException
    {
        return new StorageException($what . ' failed: ' . ProviderHttp::describe($res), $code, $res->getStatusCode() === 401 || $res->getStatusCode() === 403 ? 409 : 502);
    }
}
