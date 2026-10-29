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

namespace App\Controllers\Admin;

use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Helpers\IpAddressMatcher;
use App\Middleware\AuthMiddleware;
use App\CloudFlare\CloudFlareRealIP;
use App\Services\Security\SecurityPolicy;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityCenterController
{
    public function show(Request $request): Response
    {
        $pdo = \App\Chat\Database::getPdoConnection();
        $stats = $pdo->query("SELECT COUNT(*) AS users, SUM(two_fa_enabled = 'true') AS with_2fa FROM featherpanel_users WHERE deleted = 'false'")->fetch(\PDO::FETCH_ASSOC) ?: [];

        return ApiResponse::success([
            'policy' => SecurityPolicy::get(),
            'your_ip' => CloudFlareRealIP::getRealIP(),
            'stats' => [
                'users' => (int) ($stats['users'] ?? 0),
                'with_2fa' => (int) ($stats['with_2fa'] ?? 0),
            ],
        ], 'Security policy loaded');
    }

    public function update(Request $request): Response
    {
        $admin = AuthMiddleware::getCurrentUser($request);
        $data = json_decode($request->getContent(), true);
        if (!is_array($data)) {
            return ApiResponse::error('Invalid request body', 'INVALID_REQUEST_BODY', 400);
        }
        $old = SecurityPolicy::get();
        unset($data['require_2fa_since']);
        $merged = array_merge($old, $data);
        $ipError = IpAddressMatcher::validateAllowedIpsInput((string) ($merged['ip_allow_list'] ?? ''));
        if ($ipError !== null) {
            return ApiResponse::error($ipError, 'INVALID_IP_ALLOW_LIST', 422);
        }
        $policy = SecurityPolicy::stampRequirement(SecurityPolicy::normalize($merged), $old);
        // Never let an admin lock themselves out with an immediate 2FA requirement.
        if ($policy['require_2fa_grace_days'] === 0 && ($admin['two_fa_enabled'] ?? 'false') !== 'true'
            && ($policy['require_2fa_admins'] || in_array((int) ($admin['role_id'] ?? 0), $policy['require_2fa_role_ids'], true))) {
            return ApiResponse::error('Enable two-factor authentication on your own account first, or set a grace period', 'TWO_FACTOR_SELF_LOCKOUT', 422);
        }
        // Never let an admin lock themselves out with the allow list.
        $ip = CloudFlareRealIP::getRealIP();
        if ($policy['ip_allow_list'] !== '' && !IpAddressMatcher::clientMatchesAllowedList($ip, $policy['ip_allow_list'])) {
            return ApiResponse::error('Your current IP (' . $ip . ') is not in the allow list', 'IP_ALLOW_LIST_SELF_LOCKOUT', 422);
        }
        if (!SecurityPolicy::save($policy)) {
            return ApiResponse::error('Failed to save the security policy', 'SECURITY_POLICY_SAVE_FAILED', 500);
        }
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => 'security_center_update',
            'context' => 'Updated the security center policy (2FA: ' . ($policy['require_2fa_admins'] ? 'all admins' : 'admins not forced') . ', ' . count($policy['require_2fa_role_ids']) . ' roles, grace ' . $policy['require_2fa_grace_days'] . ' days)',
            'ip_address' => $ip,
        ]);

        return ApiResponse::success(['policy' => SecurityPolicy::get()], 'Security policy saved');
    }
}
