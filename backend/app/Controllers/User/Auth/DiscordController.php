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
use App\Chat\Activity;
use App\Helpers\UUIDUtils;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Helpers\EmailDomainValidator;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\RedirectResponse;

class DiscordController
{
    /**
     * Initiate Discord OAuth login.
     * GET /api/user/auth/discord/login.
     */
    public function login(Request $request): RedirectResponse
    {
        return $this->startDiscordFlow($request);
    }

    /**
     * Initiate Discord account linking for an authenticated user.
     * GET /api/user/auth/discord/link.
     */
    public function linkAccount(Request $request): RedirectResponse
    {
        $user = $request->attributes->get('user');
        if (!$user || empty($user['uuid'])) {
            return new RedirectResponse('/auth/login?redirect=' . urlencode('/dashboard/account?tab=settings'));
        }

        return $this->startDiscordFlow($request, (string) $user['uuid']);
    }

    /**
     * Handle Discord OAuth callback.
     * GET /api/user/auth/discord/callback.
     */
    public function callback(Request $request): RedirectResponse
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $code = $request->query->get('code');
        $state = $request->query->get('state');
        $error = $request->query->get('error');

        // Handle error from Discord
        if ($error) {
            return new RedirectResponse('/auth/login?error=discord_error');
        }

        // Validate state
        $cachedState = $state ? Cache::get('discord_oauth_state_' . $state) : null;
        if (!$state || $cachedState === null) {
            return new RedirectResponse('/auth/login?error=invalid_state');
        }

        $isLinkFlow = is_array($cachedState)
            && isset($cachedState['link_user_uuid'])
            && is_string($cachedState['link_user_uuid'])
            && $cachedState['link_user_uuid'] !== '';

        // Remove used state
        Cache::forget('discord_oauth_state_' . $state);

        // Exchange code for access token
        $clientId = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_ID, '');
        $clientSecret = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET, '');
        $redirectUri = rtrim($app->getConfig()->getSetting(ConfigInterface::APP_URL, ''), '/') . '/api/user/auth/discord/callback';

        $tokenUrl = 'https://discord.com/api/oauth2/token';
        $postData = http_build_query([
            'client_id' => $clientId,
            'client_secret' => $clientSecret,
            'grant_type' => 'authorization_code',
            'code' => $code,
            'redirect_uri' => $redirectUri,
        ]);

        $ch = curl_init($tokenUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        $tokenResponse = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $tokenData = json_decode($tokenResponse, true);
        // curl_close() is deprecated in PHP 8.5 (no-op since PHP 8.0)

        if (!isset($tokenData['access_token'])) {
            $app->getLogger()->error('Discord OAuth token exchange failed. HTTP ' . $httpCode . ' Response: ' . ($tokenResponse ?: 'Empty'));

            return $this->discordErrorRedirect('discord_token_failed', $isLinkFlow);
        }

        $accessToken = $tokenData['access_token'];

        // Get user info from Discord
        $userUrl = 'https://discord.com/api/users/@me';
        $userCh = curl_init($userUrl);
        curl_setopt($userCh, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($userCh, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
        curl_setopt($userCh, CURLOPT_CONNECTTIMEOUT, 5);
        curl_setopt($userCh, CURLOPT_TIMEOUT, 10);
        $userResponse = curl_exec($userCh);
        $discordUser = json_decode($userResponse, true);
        // curl_close() is deprecated in PHP 8.5 (no-op since PHP 8.0)

        if (!isset($discordUser['id'])) {
            return $this->discordErrorRedirect('discord_user_failed', $isLinkFlow);
        }

        $discordId = $discordUser['id'];
        $discordUsername = $discordUser['username'] ?? '';
        $discordDiscriminator = $discordUser['discriminator'] ?? '0000';
        $discordName = $discordUsername . '#' . $discordDiscriminator;
        $discordEmail = $discordUser['email'] ?? '';

        if ($isLinkFlow) {
            return $this->completeAccountLink(
                $cachedState['link_user_uuid'],
                $discordId,
                $accessToken,
                $discordUsername,
                $discordName
            );
        }

        // Check if user exists with this Discord ID
        $existingUser = $this->findUserByDiscordId($discordId);

        if ($existingUser && $existingUser['discord_oauth2_linked'] === 'true') {
            // User exists and is already linked, generate temporary token and redirect to login
            $tempToken = bin2hex(random_bytes(32));

            // Store user UUID and Discord data with temporary token (5 minute expiration)
            Cache::put('discord_login_token_' . $tempToken, [
                'user_uuid' => $existingUser['uuid'],
                'discord_id' => $discordId,
                'discord_access_token' => $accessToken,
                'discord_username' => $discordUsername,
                'discord_name' => $discordName,
            ], 5);

            return new RedirectResponse('/auth/login?discord_token=' . $tempToken);
        }

        // User not linked yet — offer registration only when no matching account exists
        $registrationEnabled = $config->getSetting(ConfigInterface::REGISTRATION_ENABLED, 'true') === 'true';
        $matchingUser = $this->findMatchingUserForDiscord($discordUsername, $discordEmail);

        if ($registrationEnabled && $matchingUser === null) {
            $tempToken = bin2hex(random_bytes(32));

            // Store Discord data with temporary token (10 minute expiration for registration)
            Cache::put('discord_link_token_' . $tempToken, [
                'discord_id' => $discordId,
                'discord_access_token' => $accessToken,
                'discord_username' => $discordUsername,
                'discord_name' => $discordName,
                'discord_email' => $discordEmail,
                'is_registration' => true,
            ], 10);

            return new RedirectResponse('/auth/register?discord_link_token=' . $tempToken);
        }

        // Registration is disabled or a matching account already exists — link to existing account
        $tempToken = bin2hex(random_bytes(32));

        // Store Discord data with temporary token (10 minute expiration for linking)
        Cache::put('discord_link_token_' . $tempToken, [
            'discord_id' => $discordId,
            'discord_access_token' => $accessToken,
            'discord_username' => $discordUsername,
            'discord_name' => $discordName,
            'discord_email' => $discordEmail,
        ], 10);

        return new RedirectResponse('/auth/login?discord_link_token=' . $tempToken);
    }

    /**
     * Authenticate user with Discord token.
     * Called by LoginController to complete Discord login.
     */
    public function authenticateWithToken(string $token): ?array
    {
        $data = Cache::get('discord_login_token_' . $token);
        if (!$data) {
            return null;
        }

        // Delete token after use
        Cache::forget('discord_login_token_' . $token);

        $user = User::getUserByUuid($data['user_uuid']);
        if (!$user) {
            return null;
        }

        // Update Discord info with latest data
        User::updateUser($user['uuid'], [
            'discord_oauth2_id' => $data['discord_id'],
            'discord_oauth2_access_token' => $data['discord_access_token'],
            'discord_oauth2_username' => $data['discord_username'],
            'discord_oauth2_name' => $data['discord_name'],
        ]);

        return $user;
    }

    /**
     * Link Discord account to existing user.
     * PUT /api/user/auth/discord/link.
     */
    public function link(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);

        // Check if Discord OAuth is enabled
        if ($config->getSetting(ConfigInterface::DISCORD_OAUTH_ENABLED, 'false') !== 'true') {
            return ApiResponse::error('Discord OAuth is not enabled', 'DISCORD_OAUTH_DISABLED', 400);
        }

        $token = $data['token'] ?? '';
        $usernameOrEmail = $data['username_or_email'] ?? $data['email'] ?? '';
        $password = $data['password'] ?? '';

        if (empty($token) || empty($usernameOrEmail) || empty($password)) {
            return ApiResponse::error('Missing required fields', 'MISSING_REQUIRED_FIELDS', 400);
        }

        // Get pending Discord data
        $pendingData = Cache::get('discord_link_token_' . $token);
        if (!$pendingData) {
            return ApiResponse::error('Invalid or expired link token', 'INVALID_TOKEN', 400);
        }

        // Verify user credentials - try email first, then username
        $user = null;
        if (filter_var($usernameOrEmail, FILTER_VALIDATE_EMAIL)) {
            $user = User::getUserByEmail($usernameOrEmail);
        }
        if (!$user) {
            $user = User::getUserByUsername($usernameOrEmail);
        }
        if (!$user) {
            return ApiResponse::error('Invalid username/email or password', 'INVALID_CREDENTIALS', 401);
        }

        if (!password_verify($password, $user['password'])) {
            return ApiResponse::error('Invalid username/email or password', 'INVALID_CREDENTIALS', 401);
        }

        // Check if Discord ID is already linked to another account
        $existingLinkedUser = $this->findUserByDiscordId($pendingData['discord_id']);
        if ($existingLinkedUser && $existingLinkedUser['uuid'] !== $user['uuid']) {
            return ApiResponse::error('Discord account is already linked to another user', 'DISCORD_ALREADY_LINKED', 409);
        }

        // Link Discord account
        $updated = User::updateUser($user['uuid'], [
            'discord_oauth2_id' => $pendingData['discord_id'],
            'discord_oauth2_access_token' => $pendingData['discord_access_token'],
            'discord_oauth2_linked' => 'true',
            'discord_oauth2_username' => $pendingData['discord_username'],
            'discord_oauth2_name' => $pendingData['discord_name'],
        ]);

        if (!$updated) {
            return ApiResponse::error('Failed to link Discord account', 'LINK_FAILED', 500);
        }

        // Delete pending data
        Cache::forget('discord_link_token_' . $token);

        return ApiResponse::success([], 'Discord account linked successfully', 200);
    }

    /**
     * Unlink Discord account.
     * DELETE /api/user/auth/discord/unlink.
     */
    public function unlink(Request $request): Response
    {
        // Get current user from request (set by auth middleware)
        $user = $request->attributes->get('user');
        if (!$user) {
            return ApiResponse::error('Unauthorized', 'UNAUTHORIZED', 401);
        }

        // Unlink Discord account
        $updated = User::updateUser($user['uuid'], [
            'discord_oauth2_id' => null,
            'discord_oauth2_access_token' => null,
            'discord_oauth2_linked' => 'false',
            'discord_oauth2_username' => null,
            'discord_oauth2_name' => null,
        ]);

        if (!$updated) {
            return ApiResponse::error('Failed to unlink Discord account', 'UNLINK_FAILED', 500);
        }

        return ApiResponse::success([], 'Discord account unlinked successfully', 200);
    }

    /**
     * Handle Discord registration confirmation.
     *
     * PUT /api/user/auth/discord/register
     */
    public function register(Request $request): Response
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $data = json_decode($request->getContent(), true);
        $token = $data['token'] ?? null;

        if (!$token || !is_string($token)) {
            return ApiResponse::error('Missing registration token', 'MISSING_TOKEN', 400);
        }

        $cached = Cache::get('discord_link_token_' . $token);
        if (!$cached || !is_array($cached)) {
            return ApiResponse::error('Invalid or expired registration token', 'INVALID_TOKEN', 400);
        }

        if (!isset($cached['is_registration']) || $cached['is_registration'] !== true) {
            return ApiResponse::error('This token is not for registration', 'INVALID_TOKEN_TYPE', 400);
        }

        $registrationEnabled = $config->getSetting(ConfigInterface::REGISTRATION_ENABLED, 'true') === 'true';
        if (!$registrationEnabled) {
            return ApiResponse::error('Registration is disabled', 'REGISTRATION_DISABLED', 403);
        }

        $newUser = $this->autoProvisionUser(
            $cached['discord_id'],
            $cached['discord_username'],
            $cached['discord_name'],
            $cached['discord_email'],
            $cached['discord_access_token']
        );

        if (!$newUser) {
            return ApiResponse::error('Failed to create account. Email might be in use or domain is blocked.', 'PROVISION_FAILED', 500);
        }

        Cache::forget('discord_link_token_' . $token);

        $loginController = new LoginController();

        return $loginController->completeLogin($newUser);
    }

    /**
     * Find user by Discord OAuth ID.
     */
    private function findUserByDiscordId(string $discordId): ?array
    {
        $pdo = \App\Chat\Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_users WHERE discord_oauth2_id = :discord_id AND deleted = \'false\' LIMIT 1');
        $stmt->execute(['discord_id' => $discordId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }

    /**
     * Auto-provision a new FeatherPanel user account from Discord OAuth data.
     * Returns the created user array on success, or null on failure.
     */
    private function autoProvisionUser(
        string $discordId,
        string $discordUsername,
        string $discordName,
        string $discordEmail,
        string $accessToken,
    ): ?array {
        $app = App::getInstance(true);
        $config = $app->getConfig();

        // Derive a clean base username from the Discord username
        $baseUsername = preg_replace('/[^a-zA-Z0-9_]/', '_', strtolower($discordUsername)) ?: 'user';
        $baseUsername = substr($baseUsername, 0, 27);

        // Derive first / last name from Discord display name
        $nameParts = explode(' ', $discordName, 2);
        $firstName = !empty($nameParts[0]) ? substr($nameParts[0], 0, 64) : $discordUsername;
        $lastName = !empty($nameParts[1]) ? substr($nameParts[1], 0, 64) : 'Discord';

        // Ensure first and last names meet minimum length
        if (strlen($firstName) < 3) {
            $firstName = str_pad($firstName, 3, '_');
        }
        if (strlen($lastName) < 3) {
            $lastName = str_pad($lastName, 3, '_');
        }

        // Use Discord email if available; otherwise generate a placeholder
        if (!empty($discordEmail) && filter_var($discordEmail, FILTER_VALIDATE_EMAIL)) {
            // Check email domain blocking
            $domainRejection = EmailDomainValidator::getRejection($config, $discordEmail);
            if ($domainRejection !== null) {
                $app->getLogger()->warning('Discord auto-provision rejected email domain: ' . $discordEmail);

                return null;
            }
            // Check if email is already in use
            if (User::getUserByEmail($discordEmail) !== null) {
                $app->getLogger()->warning('Discord auto-provision: email already in use: ' . $discordEmail);

                return null;
            }
            $emailValue = $discordEmail;
        } else {
            // No usable Discord email — cannot provision without a valid email address
            $app->getLogger()->warning('Discord auto-provision: no valid email from Discord for user: ' . $discordUsername);

            return null;
        }

        $uuid = UUIDUtils::generateV4();
        $password = bin2hex(random_bytes(32));
        $hashedPassword = password_hash($password, PASSWORD_BCRYPT);
        $ip = CloudFlareRealIP::getRealIP();

        $userId = false;
        $username = '';
        $maxAttempts = 5;

        for ($attempt = 0; $attempt < $maxAttempts; ++$attempt) {
            if ($attempt === 0) {
                $username = substr($baseUsername, 0, 32);
            } else {
                $suffix = bin2hex(random_bytes(2));
                $username = substr($baseUsername . '_' . $suffix, 0, 32);
            }

            if (User::getUserByUsername($username) !== null) {
                continue;
            }

            try {
                $userId = User::createUser([
                    'username' => $username,
                    'first_name' => $firstName,
                    'last_name' => $lastName,
                    'email' => $emailValue,
                    'password' => $hashedPassword,
                    'uuid' => $uuid,
                    'remember_token' => User::generateAccountToken(),
                    'first_ip' => $ip,
                    'last_ip' => $ip,
                ], true);
            } catch (\PDOException $e) {
                $app->getLogger()->warning('Discord auto-provision username collision for ' . $username . ': ' . $e->getMessage());
                $userId = false;
            }

            if ($userId !== false) {
                break;
            }
        }

        if ($userId === false) {
            $app->getLogger()->error('Discord auto-provision: failed to create user for Discord ID: ' . $discordId);

            return null;
        }

        // Link the Discord account immediately
        User::updateUser($uuid, [
            'discord_oauth2_id' => $discordId,
            'discord_oauth2_access_token' => $accessToken,
            'discord_oauth2_linked' => 'true',
            'discord_oauth2_username' => $discordUsername,
            'discord_oauth2_name' => $discordName,
        ]);

        // Log registration activity
        Activity::createActivity([
            'user_uuid' => $uuid,
            'name' => 'register',
            'context' => 'User registered via Discord OAuth',
            'ip_address' => $ip,
        ]);

        // Send first-user role promotion if applicable
        $createdUser = User::getUserByUuid($uuid);
        if ($createdUser && (int) $userId === 1) {
            User::updateUser($uuid, ['role_id' => 4]);
            $createdUser = User::getUserByUuid($uuid);
        }

        return $createdUser;
    }

    private function startDiscordFlow(Request $request, ?string $linkUserUuid = null): RedirectResponse
    {
        $app = App::getInstance(true);
        $config = $app->getConfig();
        $isLinkFlow = $linkUserUuid !== null;

        // Check if Discord OAuth is enabled
        if ($config->getSetting(ConfigInterface::DISCORD_OAUTH_ENABLED, 'false') !== 'true') {
            return $this->discordErrorRedirect('discord_disabled', $isLinkFlow);
        }

        $clientId = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_ID, '');
        $clientSecret = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET, '');

        if (empty($clientId) || empty($clientSecret)) {
            return $this->discordErrorRedirect('discord_not_configured', $isLinkFlow);
        }

        // Generate state for CSRF protection
        $state = bin2hex(random_bytes(16));
        $stateData = [];
        if ($isLinkFlow) {
            $stateData['link_user_uuid'] = $linkUserUuid;
        }

        // Store state in cache with 10 minute expiration
        Cache::put('discord_oauth_state_' . $state, $stateData, 10);

        // Build Discord OAuth URL
        $redirectUri = urlencode(rtrim($app->getConfig()->getSetting(ConfigInterface::APP_URL, ''), '/') . '/api/user/auth/discord/callback');
        $scopes = urlencode('identify email');
        $url = "https://discord.com/api/oauth2/authorize?client_id={$clientId}&redirect_uri={$redirectUri}&response_type=code&scope={$scopes}&state={$state}";

        return new RedirectResponse($url);
    }

    private function completeAccountLink(
        string $userUuid,
        string $discordId,
        string $accessToken,
        string $discordUsername,
        string $discordName,
    ): RedirectResponse {
        $user = User::getUserByUuid($userUuid);
        if (!$user) {
            return new RedirectResponse('/dashboard/account?tab=settings&error=discord_user_not_found');
        }

        if (($user['discord_oauth2_linked'] ?? 'false') === 'true') {
            return new RedirectResponse('/dashboard/account?tab=settings&error=discord_already_linked');
        }

        $existingLinkedUser = $this->findUserByDiscordId($discordId);
        if ($existingLinkedUser && $existingLinkedUser['uuid'] !== $userUuid) {
            return new RedirectResponse('/dashboard/account?tab=settings&error=discord_already_linked');
        }

        $updated = User::updateUser($userUuid, [
            'discord_oauth2_id' => $discordId,
            'discord_oauth2_access_token' => $accessToken,
            'discord_oauth2_linked' => 'true',
            'discord_oauth2_username' => $discordUsername,
            'discord_oauth2_name' => $discordName,
        ]);

        if (!$updated) {
            return new RedirectResponse('/dashboard/account?tab=settings&error=discord_link_failed');
        }

        return new RedirectResponse('/dashboard/account?tab=settings&linked=discord');
    }

    private function discordErrorRedirect(string $errorCode, bool $accountSettings): RedirectResponse
    {
        $target = $accountSettings ? '/dashboard/account?tab=settings&error=' : '/auth/login?error=';

        return new RedirectResponse($target . urlencode($errorCode));
    }

    private function findMatchingUserForDiscord(string $discordUsername, string $discordEmail): ?array
    {
        if (!empty($discordEmail) && filter_var($discordEmail, FILTER_VALIDATE_EMAIL)) {
            $user = User::getUserByEmail($discordEmail);
            if ($user) {
                return $user;
            }
        }

        $baseUsername = preg_replace('/[^a-zA-Z0-9_]/', '_', strtolower($discordUsername)) ?: 'user';

        return User::getUserByUsername(substr($baseUsername, 0, 32));
    }
}
