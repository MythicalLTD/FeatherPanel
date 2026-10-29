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

namespace App\Services\Vm;

use App\App;
use App\Chat\User;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\Helpers\AccountLockoutHelper;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Re-confirmation (password or 2FA) for dangerous VDS actions, controlled by
 * vds_reauth_mode / vds_reauth_actions. The client sends X-Confirm-Password or
 * X-Confirm-Code; without them the API answers 403 REAUTH_REQUIRED with the method.
 */
class VdsReauth
{
    public const MODES = ['off', 'password', '2fa_or_password'];

    /** Returns null when the action may proceed, otherwise the error response. */
    public static function check(Request $request, string $action): ?Response
    {
        $config = App::getInstance(true)->getConfig();
        $mode = $config->getSetting(ConfigInterface::VDS_REAUTH_MODE, 'off');
        if (!in_array($mode, self::MODES, true) || $mode === 'off' || !in_array($action, self::actions(), true)) {
            return null;
        }
        $sessionUser = $request->attributes->get('user');
        $user = is_array($sessionUser) ? User::getUserByUuid((string) ($sessionUser['uuid'] ?? '')) : null;
        if (!$user) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        $method = self::method($user, $mode);
        if ($method === null) {
            return null; // no password and no 2FA (e.g. OAuth-only account): nothing to confirm with
        }
        $value = (string) $request->headers->get($method === '2fa' ? 'X-Confirm-Code' : 'X-Confirm-Password', '');
        if ($value === '') {
            return ApiResponse::error('Please confirm this action', 'REAUTH_REQUIRED', 403, ['method' => $method, 'action' => $action]);
        }
        $lockId = 'vds-reauth:' . $user['uuid'];
        if (!AccountLockoutHelper::reserveHardLockAttempt($lockId, maxAttempts: 5, lockoutSeconds: 900)) {
            return ApiResponse::error('Too many failed confirmations. Try again later.', 'ACCOUNT_LOCKED', 429, ['retry_after' => max(1, AccountLockoutHelper::getLockoutRemaining($lockId))]);
        }
        $ok = $method === '2fa'
            ? \App\Helpers\TotpVerifier::verify($user, $value)
            : password_verify($value, (string) $user['password']);
        if (!$ok) {
            return ApiResponse::error($method === '2fa' ? 'Invalid 2FA code' : 'Invalid password', 'REAUTH_FAILED', 403, ['method' => $method, 'action' => $action]);
        }
        AccountLockoutHelper::clear($lockId);

        return null;
    }

    /** Feature info for the frontend (null method = no confirmation needed). */
    public static function features(Request $request): array
    {
        $mode = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::VDS_REAUTH_MODE, 'off');
        $sessionUser = $request->attributes->get('user');
        $user = $mode !== 'off' && is_array($sessionUser) ? User::getUserByUuid((string) ($sessionUser['uuid'] ?? '')) : null;

        return [
            'mode' => in_array($mode, self::MODES, true) ? $mode : 'off',
            'actions' => $mode === 'off' ? [] : self::actions(),
            'method' => $user ? self::method($user, $mode) : null,
        ];
    }

    private static function method(array $user, string $mode): ?string
    {
        $has2fa = ($user['two_fa_enabled'] ?? 'false') === 'true' && !empty($user['two_fa_key']);
        if ($mode === '2fa_or_password' && $has2fa) {
            return '2fa';
        }

        return !empty($user['password']) ? 'password' : ($has2fa ? '2fa' : null);
    }

    private static function actions(): array
    {
        $raw = App::getInstance(true)->getConfig()->getSetting(ConfigInterface::VDS_REAUTH_ACTIONS, 'reinstall,rollback,restore');

        return array_values(array_filter(array_map('trim', explode(',', strtolower($raw)))));
    }
}
