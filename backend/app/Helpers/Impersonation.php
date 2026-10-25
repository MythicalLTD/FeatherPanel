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

namespace App\Helpers;

use App\App;
use App\Chat\User;
use App\Permissions;
use App\Chat\Activity;
use App\CloudFlare\CloudFlareRealIP;

/**
 * "View as user" for staff. The admin keeps their own session cookie; a second,
 * HMAC signed cookie names the target. It only takes effect while it belongs to the
 * same signed-in admin, who still holds the impersonate permission, and expires
 * after an hour. Impersonation is read only: every write request is refused.
 */
class Impersonation
{
    public const COOKIE = 'fp_impersonate';
    private const TTL = 3600;

    public static function canImpersonate(array $admin, array $target): ?string
    {
        if (($admin['uuid'] ?? '') === ($target['uuid'] ?? '')) {
            return 'You cannot view the panel as yourself';
        }
        if (($target['deleted'] ?? 'false') === 'true') {
            return 'This user is deleted';
        }
        if (!PermissionHelper::hasPermission((string) $admin['uuid'], Permissions::ADMIN_USERS_IMPERSONATE)) {
            return 'You are not allowed to view the panel as other users';
        }
        // Staff accounts can only be viewed by full admins.
        if (
            PermissionHelper::hasPermission((string) $target['uuid'], Permissions::ADMIN_DASHBOARD_VIEW)
            && !PermissionHelper::hasPermission((string) $admin['uuid'], Permissions::ADMIN_ROOT)
        ) {
            return 'Only full admins can view the panel as another staff member';
        }
        // Rank check on top: accounts holding root-level permissions stay off limits.
        $rankDenied = AdminRank::check($admin, $target);
        if ($rankDenied !== null) {
            return $rankDenied;
        }

        return null;
    }

    public static function start(array $admin, array $target): void
    {
        $expires = time() + self::TTL;
        $payload = $admin['uuid'] . '|' . $target['uuid'] . '|' . $expires;
        setcookie(self::COOKIE, $payload . '|' . self::sign($payload), self::cookieOptions($expires));
        self::log($admin, $target, 'impersonation_start', 'Started viewing the panel as ' . ($target['username'] ?? $target['uuid']));
    }

    public static function stop(array $admin, ?array $target): void
    {
        setcookie(self::COOKIE, '', self::cookieOptions(time() - 3600));
        if ($target !== null) {
            self::log($admin, $target, 'impersonation_stop', 'Stopped viewing the panel as ' . ($target['username'] ?? $target['uuid']));
        }
    }

    /**
     * Resolve the impersonated user for this signed-in admin, or null.
     *
     * @return array{target: array, admin: array}|null
     */
    public static function resolve(array $admin): ?array
    {
        $raw = $_COOKIE[self::COOKIE] ?? null;
        if (!is_string($raw) || $raw === '') {
            return null;
        }
        $parts = explode('|', $raw);
        if (count($parts) !== 4) {
            return null;
        }
        [$adminUuid, $targetUuid, $expires, $sig] = $parts;
        if (!hash_equals(self::sign($adminUuid . '|' . $targetUuid . '|' . $expires), $sig)) {
            return null;
        }
        if ((int) $expires < time() || $adminUuid !== ($admin['uuid'] ?? null)) {
            return null;
        }
        $target = User::getUserByUuid($targetUuid);
        if (!$target || ($target['banned'] ?? 'false') === 'true' || self::canImpersonate($admin, $target) !== null) {
            return null;
        }

        return ['target' => $target, 'admin' => $admin];
    }

    public static function isBlockedWrite(string $method, string $path): bool
    {
        if (in_array(strtoupper($method), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return false;
        }

        // Stopping (and logging out, which stops it too) is always allowed.
        return !in_array($path, ['/api/user/impersonation', '/api/user/auth/logout'], true);
    }

    private static function log(array $admin, array $target, string $name, string $context): void
    {
        $ip = CloudFlareRealIP::getRealIP();
        Activity::createActivity(['user_uuid' => $admin['uuid'], 'name' => $name, 'context' => $context, 'ip_address' => $ip]);
        Activity::createActivity([
            'user_uuid' => $target['uuid'],
            'name' => $name,
            'context' => 'Staff member ' . ($admin['username'] ?? $admin['uuid']) . ' ' . ($name === 'impersonation_start' ? 'started' : 'stopped') . ' viewing the panel as you',
            'ip_address' => $ip,
        ]);
    }

    private static function sign(string $payload): string
    {
        $key = (string) (App::env('DATABASE_ENCRYPTION_KEY') ?? '');
        if ($key === '') {
            // No key, no impersonation: a random key makes every cookie invalid.
            $key = bin2hex(random_bytes(32));
        }

        return hash_hmac('sha256', 'impersonate|' . $payload, $key);
    }

    private static function cookieOptions(int $expires): array
    {
        $https = (!empty($_SERVER['HTTPS']) && strtolower((string) $_SERVER['HTTPS']) !== 'off')
            || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https';

        return ['expires' => $expires, 'path' => '/', 'secure' => $https, 'httponly' => true, 'samesite' => 'Strict'];
    }
}
