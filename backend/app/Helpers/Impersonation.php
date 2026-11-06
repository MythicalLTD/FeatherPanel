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
use App\Chat\Activity;
use App\Permissions;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Admin impersonation ("act as user").
 *
 * The admin keeps their own session cookie; a second, HMAC-signed cookie names
 * the target. It only takes effect while it belongs to the same signed-in admin,
 * who still holds the impersonate permission, and expires after an hour.
 *
 * Writes are allowed so support can reproduce and fix issues. Every mutating
 * request and every activity row is attributed as "admin X as user Y" in the
 * audit log (actor_uuid = admin, user_uuid = target). Nested impersonation,
 * self-impersonation, privilege escalation onto root staff, and a short list of
 * destructive account actions stay blocked.
 */
class Impersonation
{
    public const COOKIE = 'fp_impersonate';
    private const TTL = 3600;

    /**
     * Mutating paths that stay blocked while impersonating (destructive or
     * privilege-escalating). Stopping impersonation and logging out are always allowed.
     *
     * @var list<string>
     */
    private const BLOCKED_PREFIXES = [
        '/api/user/account/deletion',
    ];

    /**
     * @var list<string>
     */
    private const ALWAYS_ALLOWED = [
        '/api/user/impersonation',
        '/api/user/auth/logout',
    ];

    public static function canImpersonate(array $admin, array $target): ?string
    {
        if (($admin['uuid'] ?? '') === ($target['uuid'] ?? '')) {
            return 'You cannot impersonate yourself';
        }
        if (($target['deleted'] ?? 'false') === 'true') {
            return 'This user is deleted';
        }
        if (!PermissionHelper::hasPermission((string) $admin['uuid'], Permissions::ADMIN_USERS_IMPERSONATE)) {
            return 'You are not allowed to impersonate other users';
        }
        // Staff accounts can only be impersonated by full admins.
        if (
            PermissionHelper::hasPermission((string) $target['uuid'], Permissions::ADMIN_DASHBOARD_VIEW)
            && !PermissionHelper::hasPermission((string) $admin['uuid'], Permissions::ADMIN_ROOT)
        ) {
            return 'Only full admins can impersonate another staff member';
        }
        // Rank check on top: accounts holding root-level permissions stay off limits
        // unless the actor is root themselves.
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
        self::log(
            $admin,
            $target,
            'impersonation_start',
            'Started impersonating ' . ($target['username'] ?? $target['uuid'])
        );
    }

    public static function stop(array $admin, ?array $target): void
    {
        setcookie(self::COOKIE, '', self::cookieOptions(time() - 3600));
        if ($target !== null) {
            self::log(
                $admin,
                $target,
                'impersonation_stop',
                'Stopped impersonating ' . ($target['username'] ?? $target['uuid'])
            );
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
        // Never allow a loop: cookie target must differ from the signed-in admin.
        if ($targetUuid === ($admin['uuid'] ?? null)) {
            return null;
        }
        $target = User::getUserByUuid($targetUuid);
        if (!$target || ($target['banned'] ?? 'false') === 'true' || self::canImpersonate($admin, $target) !== null) {
            return null;
        }

        return ['target' => $target, 'admin' => $admin];
    }

    /**
     * Whether this mutating request must be refused while impersonating.
     */
    public static function isBlockedAction(string $method, string $path): bool
    {
        if (in_array(strtoupper($method), ['GET', 'HEAD', 'OPTIONS'], true)) {
            return false;
        }
        if (in_array($path, self::ALWAYS_ALLOWED, true)) {
            return false;
        }
        foreach (self::BLOCKED_PREFIXES as $prefix) {
            if ($path === $prefix || str_starts_with($path, $prefix . '/')) {
                return true;
            }
        }

        return false;
    }

    /**
     * Human-readable "admin X as user Y" label used in audit context.
     */
    public static function attributionLabel(array $admin, array $target): string
    {
        $adminName = (string) ($admin['username'] ?? $admin['uuid'] ?? 'admin');
        $targetName = (string) ($target['username'] ?? $target['uuid'] ?? 'user');

        return 'admin ' . $adminName . ' as user ' . $targetName;
    }

    /**
     * Record a mutating request made while impersonating, so every action is in the audit log
     * even when the endpoint itself does not call Activity::createActivity.
     */
    public static function logRequest(Request $request, Response $response): void
    {
        $admin = $request->attributes->get('impersonator');
        $target = $request->attributes->get('user');
        if (!is_array($admin) || !is_array($target)) {
            return;
        }
        $method = strtoupper($request->getMethod());
        if (in_array($method, ['GET', 'HEAD', 'OPTIONS'], true)) {
            return;
        }
        $path = $request->getPathInfo();
        if (in_array($path, self::ALWAYS_ALLOWED, true)) {
            return;
        }

        $status = $response->getStatusCode();
        $context = sprintf(
            '%s %s → %d (%s)',
            $method,
            $path,
            $status,
            self::attributionLabel($admin, $target)
        );

        Activity::createActivity([
            'user_uuid' => (string) $target['uuid'],
            'actor_uuid' => (string) $admin['uuid'],
            'name' => 'impersonation_action',
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }

    private static function log(array $admin, array $target, string $name, string $context): void
    {
        $ip = CloudFlareRealIP::getRealIP();
        $attribution = self::attributionLabel($admin, $target);

        // On the admin's timeline: they started/stopped impersonation.
        Activity::createActivity([
            'user_uuid' => $admin['uuid'],
            'actor_uuid' => $admin['uuid'],
            'name' => $name,
            'context' => $context . ' (' . $attribution . ')',
            'ip_address' => $ip,
        ]);

        // On the target's timeline: a staff member is acting as them.
        Activity::createActivity([
            'user_uuid' => $target['uuid'],
            'actor_uuid' => $admin['uuid'],
            'name' => $name,
            'context' => 'Staff member ' . ($admin['username'] ?? $admin['uuid']) . ' '
                . ($name === 'impersonation_start' ? 'started' : 'stopped')
                . ' impersonating you (' . $attribution . ')',
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
