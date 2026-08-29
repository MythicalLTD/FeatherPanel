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

namespace App\Controllers\Quilld\Sftp;

use App\App;
use App\Chat\User;
use App\Permissions;
use App\Chat\WebSpace;
use App\Chat\UserSshKey;
use App\Helpers\ApiResponse;
use App\Chat\WebSpaceSubuser;
use App\Helpers\WebSpaceGateway;
use App\Helpers\PermissionHelper;
use App\WebSpaceSubuserPermissions;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * FeatherQuilld → panel SFTP auth for WebSpaces (username.uuidShort).
 */
class SftpAuthController
{
    public function authenticate(Request $request): Response
    {
        try {
            $data = json_decode($request->getContent(), true);
            if (
                !is_array($data)
                || !isset($data['type'], $data['username'], $data['password'])
                || !in_array($data['type'], ['password', 'public_key'], true)
            ) {
                return ApiResponse::sendManualResponse(['error' => 'Invalid request data'], 400);
            }

            $parsed = $this->parseUsername((string) $data['username']);
            if ($parsed === null) {
                return ApiResponse::sendManualResponse(['error' => 'Invalid username format'], 400);
            }

            $space = WebSpace::getByUuidShort($parsed['serverId']);
            if (!$space) {
                return ApiResponse::sendManualResponse(['error' => 'WebSpace not found'], 404);
            }

            $user = $this->authenticateUser($parsed['username'], (string) $data['password'], (string) $data['type']);
            if (!$user) {
                return ApiResponse::sendManualResponse(['error' => 'Invalid credentials'], 401);
            }

            $userUuid = (string) ($user['uuid'] ?? '');
            $spaceUuid = (string) ($space['uuid'] ?? '');
            if ($userUuid === '' || $spaceUuid === '' || !WebSpaceGateway::canUserAccessWebSpace($userUuid, $spaceUuid)) {
                return ApiResponse::sendManualResponse(['error' => 'Access denied'], 403);
            }

            $permissions = $this->resolvePermissions($user, $space);
            if ($permissions === null) {
                return ApiResponse::sendManualResponse(['error' => 'SFTP access denied'], 403);
            }

            App::getInstance(true)->getLogger()->info('Quilld SFTP auth success for webspace ' . $spaceUuid);

            return ApiResponse::sendManualResponse([
                'server' => $spaceUuid,
                'user' => $userUuid,
                'permissions' => $permissions,
            ], 200);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->error('Quilld SFTP auth error: ' . $e->getMessage());

            return ApiResponse::sendManualResponse(['error' => 'Internal server error'], 500);
        }
    }

    /**
     * Match an OpenSSH authorized_keys line or base64 SSH wire blob against stored user keys.
     */
    public static function userHasMatchingPublicKey(int $userId, string $keyMaterial): bool
    {
        $keyMaterial = trim($keyMaterial);
        if ($userId <= 0 || $keyMaterial === '') {
            return false;
        }

        $fingerprint = UserSshKey::generateFingerprint($keyMaterial);
        if ($fingerprint !== '' && UserSshKey::getUserSshKeyByFingerprint($fingerprint, $userId)) {
            return true;
        }

        // Daemon may send raw base64 of the wire key; also try wrapping common type prefixes.
        if (!str_contains($keyMaterial, ' ')) {
            foreach (['ssh-ed25519', 'ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'] as $algo) {
                $wrapped = $algo . ' ' . $keyMaterial;
                if (!UserSshKey::isValidSshPublicKey($wrapped)) {
                    continue;
                }
                $fp = UserSshKey::generateFingerprint($wrapped);
                if ($fp !== '' && UserSshKey::getUserSshKeyByFingerprint($fp, $userId)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * @param array<string, mixed> $user
     * @param array<string, mixed> $space
     *
     * @return list<string>|null
     */
    private function resolvePermissions(array $user, array $space): ?array
    {
        $userUuid = (string) ($user['uuid'] ?? '');
        if (
            PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_VIEW)
            || PermissionHelper::hasPermission($userUuid, Permissions::ADMIN_WEBSPACES_EDIT)
        ) {
            return ['*'];
        }

        if (isset($space['owner_id']) && (int) $space['owner_id'] === (int) $user['id']) {
            return ['*'];
        }

        $subuser = WebSpaceSubuser::getByUserAndWebSpace((int) $user['id'], (int) $space['id']);
        if (!$subuser) {
            return null;
        }

        $perms = $subuser['permissions'] ?? [];
        if (!is_array($perms)) {
            return null;
        }

        if (in_array('*', $perms, true)) {
            return ['*'];
        }

        if (!in_array(WebSpaceSubuserPermissions::FILE_SFTP, $perms, true)) {
            return null;
        }

        return array_values($perms);
    }

    /**
     * @return array{username: string, serverId: string}|null
     */
    private function parseUsername(string $username): ?array
    {
        if (!preg_match('/^(.+)\.([a-zA-Z0-9]{8})$/i', $username, $matches)) {
            return null;
        }

        return [
            'username' => strtolower($matches[1]),
            'serverId' => strtolower($matches[2]),
        ];
    }

    /**
     * @return array<string, mixed>|null
     */
    private function authenticateUser(string $username, string $password, string $type): ?array
    {
        $user = User::getUserByUsername($username);
        if (!$user || (($user['banned'] ?? 'false') === 'true')) {
            return null;
        }

        if ($type === 'password') {
            $password = trim($password);
            if ($password === '' || !password_verify($password, (string) $user['password'])) {
                return null;
            }

            return $user;
        }

        if ($type === 'public_key') {
            return self::userHasMatchingPublicKey((int) $user['id'], $password) ? $user : null;
        }

        return null;
    }
}
