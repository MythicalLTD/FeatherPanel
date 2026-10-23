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
namespace App\Services\Security;

use App\App;
use App\Chat\Database;
use App\Chat\MailList;
use App\Chat\MailQueue;
use App\Helpers\IpAddressMatcher;

/**
 * Admin security center policy: 2FA per role, password rules, panel IP allow list
 * and new login alerts. Stored as one JSON setting so it can grow without migrations.
 */
class SecurityPolicy
{
    public const SETTING_KEY = 'security_center_policy';

    private static ?array $cache = null;

    public static function defaults(): array
    {
        return [
            'require_2fa_role_ids' => [],
            'password_min_length' => 8,
            'password_require_upper' => false,
            'password_require_lower' => false,
            'password_require_number' => false,
            'password_require_symbol' => false,
            'ip_allow_list' => '',
            'ip_allow_scope' => 'admins',
            'new_login_alerts' => true,
        ];
    }

    public static function get(): array
    {
        if (self::$cache !== null) {
            return self::$cache;
        }
        $raw = App::getInstance(true)->getConfig()->getSetting(self::SETTING_KEY, '');
        $decoded = is_string($raw) && $raw !== '' ? json_decode($raw, true) : null;

        return self::$cache = self::normalize(is_array($decoded) ? $decoded : []);
    }

    public static function normalize(array $input): array
    {
        $d = self::defaults();
        $roles = array_values(array_unique(array_filter(array_map('intval', (array) ($input['require_2fa_role_ids'] ?? [])), static fn (int $id): bool => $id > 0)));

        return [
            'require_2fa_role_ids' => $roles,
            'password_min_length' => max(8, min(128, (int) ($input['password_min_length'] ?? $d['password_min_length']))),
            'password_require_upper' => (bool) ($input['password_require_upper'] ?? false),
            'password_require_lower' => (bool) ($input['password_require_lower'] ?? false),
            'password_require_number' => (bool) ($input['password_require_number'] ?? false),
            'password_require_symbol' => (bool) ($input['password_require_symbol'] ?? false),
            'ip_allow_list' => IpAddressMatcher::normalizeAllowedIpsInput((string) ($input['ip_allow_list'] ?? '')),
            'ip_allow_scope' => ($input['ip_allow_scope'] ?? 'admins') === 'all' ? 'all' : 'admins',
            'new_login_alerts' => (bool) ($input['new_login_alerts'] ?? true),
        ];
    }

    public static function save(array $policy): bool
    {
        self::$cache = null;

        return App::getInstance(true)->getConfig()->setSetting(self::SETTING_KEY, json_encode(self::normalize($policy)));
    }

    /** @return string|null error message when the password breaks the policy */
    public static function validatePassword(string $password): ?string
    {
        $p = self::get();
        $problems = [];
        if (strlen($password) < $p['password_min_length']) {
            $problems[] = 'at least ' . $p['password_min_length'] . ' characters';
        }
        if ($p['password_require_upper'] && !preg_match('/\p{Lu}/u', $password)) {
            $problems[] = 'an uppercase letter';
        }
        if ($p['password_require_lower'] && !preg_match('/\p{Ll}/u', $password)) {
            $problems[] = 'a lowercase letter';
        }
        if ($p['password_require_number'] && !preg_match('/\d/', $password)) {
            $problems[] = 'a number';
        }
        if ($p['password_require_symbol'] && !preg_match('/[^\p{L}\d]/u', $password)) {
            $problems[] = 'a symbol';
        }

        return $problems === [] ? null : 'Password needs ' . implode(', ', $problems) . '.';
    }

    public static function requiresTwoFactor(array $user): bool
    {
        if (($user['two_fa_enabled'] ?? 'false') === 'true') {
            return false;
        }
        $roleId = (int) ($user['role_id'] ?? 0);

        return $roleId > 0 && in_array($roleId, self::get()['require_2fa_role_ids'], true);
    }

    /** Whether the IP allow list lets this user in from this IP. */
    public static function ipAllowed(array $user, string $ip): bool
    {
        $p = self::get();
        if ($p['ip_allow_list'] === '') {
            return true;
        }
        if ($p['ip_allow_scope'] === 'admins' && !\App\Helpers\PermissionHelper::hasPermission((string) ($user['uuid'] ?? ''), \App\Permissions::ADMIN_DASHBOARD_VIEW)) {
            return true;
        }

        return IpAddressMatcher::clientMatchesAllowedList($ip, $p['ip_allow_list']);
    }

    /**
     * Email the user when they sign in from an IP we have not seen on a login before.
     * Call before the new login activity is written.
     */
    public static function maybeSendNewLoginAlert(array $user, string $ip, ?string $userAgent): void
    {
        try {
            if (!self::get()['new_login_alerts'] || empty($user['uuid']) || empty($user['email'])) {
                return;
            }
            $pdo = Database::getPdoConnection();
            $stmt = $pdo->prepare("SELECT COUNT(*) AS total, SUM(ip_address = :ip) AS seen FROM featherpanel_activity WHERE user_uuid = :uuid AND name = 'login'");
            $stmt->execute(['ip' => $ip, 'uuid' => $user['uuid']]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC) ?: [];
            // First ever login is not "new", and a known IP is not either.
            if ((int) ($row['total'] ?? 0) === 0 || (int) ($row['seen'] ?? 0) > 0) {
                return;
            }
            $app = App::getInstance(true);
            $appName = (string) $app->getConfig()->getSetting(\App\Config\ConfigInterface::APP_NAME, 'FeatherPanel');
            $esc = static fn (string $s): string => htmlspecialchars($s, ENT_QUOTES, 'UTF-8');
            $body = '<h2>New sign-in to your account</h2>'
                . '<p>Your ' . $esc($appName) . ' account was just signed in to from a new IP address.</p>'
                . '<p>IP address: ' . $esc($ip) . '<br>Device: ' . $esc(mb_substr((string) $userAgent, 0, 200)) . '<br>Time: ' . gmdate('Y-m-d H:i') . ' UTC</p>'
                . '<p>If this was you, no action is needed. If not, change your password and enable two-factor authentication right away.</p>';
            $id = MailQueue::create(['user_uuid' => $user['uuid'], 'subject' => $appName . ': new sign-in to your account', 'body' => $body]);
            if ($id === false || $id === true) {
                return;
            }
            MailList::create(['queue_id' => $id, 'user_uuid' => $user['uuid']]);
        } catch (\Throwable $e) {
            App::getInstance(true)->getLogger()->warning('New login alert failed: ' . $e->getMessage());
        }
    }
}
