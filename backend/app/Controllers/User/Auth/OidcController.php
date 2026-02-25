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

namespace App\Controllers\User\Auth;

use App\App;
use App\Chat\User;
use App\Cache\Cache;
use App\Config\ConfigInterface;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

#[OA\Schema(
    schema: 'OidcLoginState',
    type: 'object',
    properties: [
        new OA\Property(property: 'state', type: 'string', description: 'CSRF state parameter'),
        new OA\Property(property: 'nonce', type: 'string', description: 'OIDC nonce for ID token'),
    ]
)]
class OidcController
{
    /**
     * Initiate OIDC login by redirecting to the provider's authorization endpoint.
     *
     * GET /api/user/auth/oidc/login.
     */
    #[OA\Get(
        path: '/api/user/auth/oidc/login',
        summary: 'Initiate OIDC login',
        description: 'Redirects the user to the configured OpenID Connect (OIDC) provider.',
        tags: ['User - Authentication']
    )]
    public function login(Request $request): RedirectResponse
    {
        $app = App::getInstance(true);
        $providerUuid = $request->query->get('provider');

        if (!is_string($providerUuid) || $providerUuid === '') {
            return new RedirectResponse('/auth/login?error=oidc_provider_missing');
        }

        $provider = \App\Chat\OidcProvider::getProviderByUuid($providerUuid);
        if (!$provider || ($provider['enabled'] ?? 'true') !== 'true') {
            return new RedirectResponse('/auth/login?error=oidc_provider_not_found');
        }

        $issuerUrl = rtrim((string) $provider['issuer_url'], '/');
        $clientId = (string) $provider['client_id'];
        $scopes = (string) ($provider['scopes'] ?? 'openid email profile');

        if ($issuerUrl === '' || $clientId === '') {
            return new RedirectResponse('/auth/login?error=oidc_not_configured');
        }

        $discoveryUrl = $issuerUrl . '/.well-known/openid-configuration';
        $discovery = $this->fetchJson($discoveryUrl);
        if (!is_array($discovery) || !isset($discovery['authorization_endpoint'])) {
            return new RedirectResponse('/auth/login?error=oidc_discovery_failed');
        }

        $authEndpoint = $discovery['authorization_endpoint'];

        $state = bin2hex(random_bytes(16));
        $nonce = bin2hex(random_bytes(16));

        Cache::put('oidc_state_' . $state, [
            'nonce' => $nonce,
            'provider_uuid' => $providerUuid,
        ], 10);

        $redirectUri = $app->getConfig()->getSetting(ConfigInterface::APP_URL, '') . '/api/user/auth/oidc/callback';
        $query = http_build_query([
            'client_id' => $clientId,
            'redirect_uri' => $redirectUri,
            'response_type' => 'code',
            'scope' => $scopes,
            'state' => $state,
            'nonce' => $nonce,
        ]);

        return new RedirectResponse($authEndpoint . '?' . $query);
    }

    /**
     * Handle OIDC callback, exchange code for tokens, validate ID token, and log the user in.
     *
     * GET /api/user/auth/oidc/callback.
     */
    #[OA\Get(
        path: '/api/user/auth/oidc/callback',
        summary: 'OIDC callback',
        description: 'Handles the OpenID Connect (OIDC) callback and logs the user in.',
        tags: ['User - Authentication']
    )]
    public function callback(Request $request): RedirectResponse | Response
    {
        $app = App::getInstance(true);
        $code = $request->query->get('code');
        $state = $request->query->get('state');
        $error = $request->query->get('error');

        if ($error) {
            return new RedirectResponse('/auth/login?error=oidc_error');
        }

        if (!$state || !is_string($state)) {
            return new RedirectResponse('/auth/login?error=oidc_invalid_state');
        }

        $cached = Cache::get('oidc_state_' . $state);
        if (!is_array($cached) || !isset($cached['nonce'], $cached['provider_uuid'])) {
            return new RedirectResponse('/auth/login?error=oidc_invalid_state');
        }

        if (!$code || !is_string($code)) {
            return new RedirectResponse('/auth/login?error=oidc_missing_code');
        }

        Cache::forget('oidc_state_' . $state);

        $providerUuid = (string) $cached['provider_uuid'];
        $provider = \App\Chat\OidcProvider::getProviderByUuid($providerUuid);
        if (!$provider || ($provider['enabled'] ?? 'true') !== 'true') {
            return new RedirectResponse('/auth/login?error=oidc_provider_not_found');
        }

        $issuerUrl = rtrim((string) $provider['issuer_url'], '/');
        $clientId = (string) $provider['client_id'];
        $clientSecretRaw = $provider['client_secret'] ?? '';
        if ($clientSecretRaw === '') {
            return new RedirectResponse('/auth/login?error=oidc_not_configured');
        }
        try {
            $clientSecret = $app->decryptValue((string) $clientSecretRaw);
        } catch (\Throwable $e) {
            $app->getLogger()->warning('OIDC client_secret decryption failed: ' . $e->getMessage());
            $clientSecret = (string) $clientSecretRaw;
        }

        if ($issuerUrl === '' || $clientId === '' || $clientSecret === '') {
            return new RedirectResponse('/auth/login?error=oidc_not_configured');
        }

        $discoveryUrl = $issuerUrl . '/.well-known/openid-configuration';
        $discovery = $this->fetchJson($discoveryUrl);
        if (!is_array($discovery) || !isset($discovery['token_endpoint'])) {
            return new RedirectResponse('/auth/login?error=oidc_discovery_failed');
        }

        $tokenEndpoint = $discovery['token_endpoint'];
        $redirectUri = $app->getConfig()->getSetting(ConfigInterface::APP_URL, '') . '/api/user/auth/oidc/callback';

        $postData = http_build_query([
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
        ]);

        $ch = curl_init($tokenEndpoint);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FAILONERROR, true);
        $tokenResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_errno($ch);
        $curlErrMsg = curl_error($ch);
        curl_close($ch);
        if ($curlErr !== 0 || $tokenResponse === false) {
            $app->getLogger()->warning('OIDC token request failed: ' . ($curlErrMsg ?: 'Unknown cURL error'));
            return new RedirectResponse('/auth/login?error=oidc_token_failed');
        }
        if ($httpCode < 200 || $httpCode >= 300) {
            $app->getLogger()->warning('OIDC token endpoint returned HTTP ' . $httpCode);
            return new RedirectResponse('/auth/login?error=oidc_token_failed');
        }
        $tokenData = json_decode($tokenResponse ?: '', true);

        if (!is_array($tokenData) || !isset($tokenData['id_token'])) {
            return new RedirectResponse('/auth/login?error=oidc_token_failed');
        }

        $idToken = $tokenData['id_token'];
        $claims = $this->decodeJwtWithoutVerification($idToken);
        if (!is_array($claims)) {
            return new RedirectResponse('/auth/login?error=oidc_invalid_id_token');
        }

        if (!isset($claims['iss']) || !is_string($claims['iss']) || rtrim($claims['iss'], '/') !== $issuerUrl) {
            return new RedirectResponse('/auth/login?error=oidc_invalid_issuer');
        }
        if (!isset($claims['aud'])) {
            return new RedirectResponse('/auth/login?error=oidc_invalid_audience');
        }
        $aud = $claims['aud'];
        if (is_string($aud) && $aud !== $clientId) {
            return new RedirectResponse('/auth/login?error=oidc_invalid_audience');
        }
        if (is_array($aud) && !in_array($clientId, $aud, true)) {
            return new RedirectResponse('/auth/login?error=oidc_invalid_audience');
        }

        $emailClaimKey = (string) ($provider['email_claim'] ?? 'email');
        $subjectClaimKey = (string) ($provider['subject_claim'] ?? 'sub');
        $requiredGroupClaim = (string) ($provider['group_claim'] ?? '');
        $requiredGroupValue = (string) ($provider['group_value'] ?? '');
        $requireEmailVerified = ($provider['require_email_verified'] ?? 'false') === 'true';

        $subject = $claims[$subjectClaimKey] ?? null;
        if (!is_string($subject) || $subject === '') {
            return new RedirectResponse('/auth/login?error=oidc_missing_subject');
        }

        $email = $claims[$emailClaimKey] ?? null;
        if ($email !== null && !is_string($email)) {
            $email = null;
        }

        if ($requireEmailVerified) {
            $emailVerified = $claims['email_verified'] ?? null;
            if ($emailVerified !== true && $emailVerified !== 'true') {
                return new RedirectResponse('/auth/login?error=oidc_email_not_verified');
            }
        }

        if ($requiredGroupClaim !== '' && $requiredGroupValue !== '') {
            $groupClaim = $claims[$requiredGroupClaim] ?? null;
            $allowed = false;
            if (is_string($groupClaim)) {
                $allowed = $groupClaim === $requiredGroupValue;
            } elseif (is_array($groupClaim)) {
                $allowed = in_array($requiredGroupValue, $groupClaim, true);
            }
            if (!$allowed) {
                return new RedirectResponse('/auth/login?error=oidc_access_denied');
            }
        }

        $emailVerified = $claims['email_verified'] ?? null;
        $emailVerifiedStrict = $emailVerified === true || $emailVerified === 'true';

        $providerId = $providerUuid;

        $user = $this->findUserByOidcSubject($providerId, $subject);
        if (!$user && $email && $emailVerifiedStrict) {
            $user = User::getUserByEmail($email);
        }

        $autoProvision = ($provider['auto_provision'] ?? 'false') === 'true';

        if (!$user && !$autoProvision) {
            return new RedirectResponse('/auth/login?error=oidc_user_not_found');
        }

        if (!$user) {
            $user = $this->autoProvisionUser($claims, $email, $providerId, $subject);
            if (!$user) {
                return new RedirectResponse('/auth/login?error=oidc_provision_failed');
            }
        } else {
            if ($requireEmailVerified && !$emailVerifiedStrict) {
                return new RedirectResponse('/auth/login?error=oidc_email_not_verified');
            }
            User::updateUser($user['uuid'], [
                'oidc_provider' => $providerId,
                'oidc_subject' => $subject,
                'oidc_email' => $email,
            ]);
        }

        $loginController = new LoginController();

        return $loginController->completeLogin($user);
    }

    /**
     * Find a user by OIDC provider and subject.
     */
    private function findUserByOidcSubject(string $provider, string $subject): ?array
    {
        $pdo = \App\Chat\Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_users WHERE oidc_provider = :provider AND oidc_subject = :subject LIMIT 1');
        $stmt->execute([
            'provider' => $provider,
            'subject' => $subject,
        ]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Auto-provision a user account based on OIDC claims.
     * Only accepts a real email (no preferred_username fallback); validates email format.
     * Retries username with random suffix on collision (up to 5 attempts).
     */
    private function autoProvisionUser(array $claims, ?string $email, string $providerId, string $subject): ?array
    {
        $app = App::getInstance(true);

        if ($email === null || !is_string($email) || trim($email) === '') {
            return null;
        }
        $emailValue = trim($email);
        if (!filter_var($emailValue, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        $usernameSource = $claims['preferred_username'] ?? $claims['name'] ?? $emailValue;
        if (!is_string($usernameSource) || trim($usernameSource) === '') {
            $usernameSource = $emailValue;
        }

        $baseUsername = preg_replace('/[^a-zA-Z0-9_]/', '_', strtolower($usernameSource)) ?: 'user';
        $baseUsername = substr($baseUsername, 0, 27);

        $firstName = '';
        $lastName = '';

        if (isset($claims['given_name']) && is_string($claims['given_name'])) {
            $firstName = $claims['given_name'];
        }
        if (isset($claims['family_name']) && is_string($claims['family_name'])) {
            $lastName = $claims['family_name'];
        }

        if ($firstName === '' && $lastName === '' && isset($claims['name']) && is_string($claims['name'])) {
            $parts = explode(' ', $claims['name'], 2);
            $firstName = $parts[0] ?? '';
            $lastName = $parts[1] ?? '';
        }

        $uuid = \App\Chat\User::generateUuid();
        $password = bin2hex(random_bytes(32));
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);

        $maxAttempts = 5;
        $userId = false;
        $username = '';

        for ($attempt = 0; $attempt < $maxAttempts; $attempt++) {
            if ($attempt === 0) {
                $username = substr($baseUsername, 0, 32);
            } else {
                $suffix = bin2hex(random_bytes(2));
                $username = substr($baseUsername . '_' . $suffix, 0, 32);
            }

            if ($firstName === '') {
                $firstName = $username;
            }
            if ($lastName === '') {
                $lastName = 'OIDC';
            }

            $userId = User::createUser([
                'username' => $username,
                'first_name' => $firstName,
                'last_name' => $lastName,
                'email' => $emailValue,
                'password' => $hashedPassword,
                'uuid' => $uuid,
                'oidc_provider' => $providerId,
                'oidc_subject' => $subject,
                'oidc_email' => $emailValue,
            ], true);

            if ($userId !== false) {
                break;
            }
        }

        if (!$userId) {
            $app->getLogger()->error('Failed to auto-provision OIDC user: ' . $emailValue);

            return null;
        }

        return User::getUserByUuid($uuid);
    }

    /**
     * Fetch JSON from an HTTP endpoint with timeouts and error handling.
     */
    private function fetchJson(string $url): array | null
    {
        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_FAILONERROR, true);
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlErr = curl_errno($ch);
        curl_close($ch);
        if ($curlErr !== 0 || $response === false || $httpCode < 200 || $httpCode >= 300) {
            return null;
        }
        $data = json_decode($response, true);

        return is_array($data) ? $data : null;
    }

    /**
     * Decode a JWT without verifying the signature.
     *
     * This is intentional for now to avoid pulling in additional dependencies.
     * The token is still validated for issuer and audience.
     */
    private function decodeJwtWithoutVerification(string $jwt): array | null
    {
        $parts = explode('.', $jwt);
        if (count($parts) !== 3) {
            return null;
        }

        $payload = $parts[1] ?? '';
        $payload .= str_repeat('=', (4 - strlen($payload) % 4) % 4);
        $decoded = base64_decode(strtr($payload, '-_', '+/'), true);

        if ($decoded === false) {
            return null;
        }

        $data = json_decode($decoded, true);

        return is_array($data) ? $data : null;
    }
}

