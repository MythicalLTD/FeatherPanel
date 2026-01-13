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
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
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
        $app = App::getInstance(true);
        $config = $app->getConfig();

        // Check if Discord OAuth is enabled
        if ($config->getSetting(ConfigInterface::DISCORD_OAUTH_ENABLED, 'false') !== 'true') {
            return new RedirectResponse('/auth/login?error=discord_disabled');
        }

        $clientId = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_ID, '');
        $clientSecret = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET, '');

        if (empty($clientId) || empty($clientSecret)) {
            return new RedirectResponse('/auth/login?error=discord_not_configured');
        }

        // Generate state for CSRF protection
        $state = bin2hex(random_bytes(16));

        // Store state in cache with 10 minute expiration
        Cache::put('discord_oauth_state_' . $state, true, 10);

        // Build Discord OAuth URL
        $redirectUri = urlencode($app->getConfig()->getSetting(ConfigInterface::APP_URL, '') . '/api/user/auth/discord/callback');
        $scopes = urlencode('identify email');
        $url = "https://discord.com/api/oauth2/authorize?client_id={$clientId}&redirect_uri={$redirectUri}&response_type=code&scope={$scopes}&state={$state}";

        return new RedirectResponse($url);
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
        if (!$state || !Cache::exists('discord_oauth_state_' . $state)) {
            return new RedirectResponse('/auth/login?error=invalid_state');
        }

        // Remove used state
        Cache::forget('discord_oauth_state_' . $state);

        // Exchange code for access token
        $clientId = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_ID, '');
        $clientSecret = $config->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET, '');
        $redirectUri = $app->getConfig()->getSetting(ConfigInterface::APP_URL, '') . '/api/user/auth/discord/callback';

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
        $tokenResponse = curl_exec($ch);
        $tokenData = json_decode($tokenResponse, true);
        // curl_close() is deprecated in PHP 8.5 (no-op since PHP 8.0)

        if (!isset($tokenData['access_token'])) {
            return new RedirectResponse('/auth/login?error=discord_token_failed');
        }

        $accessToken = $tokenData['access_token'];

        // Get user info from Discord
        $userUrl = 'https://discord.com/api/users/@me';
        $ch = curl_init($userUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ['Authorization: Bearer ' . $accessToken]);
        $userResponse = curl_exec($ch);
        $discordUser = json_decode($userResponse, true);
        // curl_close() is deprecated in PHP 8.5 (no-op since PHP 8.0)

        if (!isset($discordUser['id'])) {
            return new RedirectResponse('/auth/login?error=discord_user_failed');
        }

        $discordId = $discordUser['id'];
        $discordUsername = $discordUser['username'] ?? '';
        $discordDiscriminator = $discordUser['discriminator'] ?? '0000';
        $discordName = $discordUsername . '#' . $discordDiscriminator;
        $discordEmail = $discordUser['email'] ?? '';

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

        // User not linked yet, store Discord data for linking
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
        $user = $request->get('user');
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
     * Find user by Discord OAuth ID.
     */
    private function findUserByDiscordId(string $discordId): ?array
    {
        $pdo = \App\Chat\Database::getPdoConnection();
        $stmt = $pdo->prepare('SELECT * FROM featherpanel_users WHERE discord_oauth2_id = :discord_id AND deleted = \'false\' LIMIT 1');
        $stmt->execute(['discord_id' => $discordId]);

        return $stmt->fetch(\PDO::FETCH_ASSOC) ?: null;
    }
}
