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
        $merged = array_merge(SecurityPolicy::get(), $data);
        $ipError = IpAddressMatcher::validateAllowedIpsInput((string) ($merged['ip_allow_list'] ?? ''));
        if ($ipError !== null) {
            return ApiResponse::error($ipError, 'INVALID_IP_ALLOW_LIST', 422);
        }
        $policy = SecurityPolicy::normalize($merged);
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
            'context' => 'Updated the security center policy',
            'ip_address' => $ip,
        ]);

        return ApiResponse::success(['policy' => SecurityPolicy::get()], 'Security policy saved');
    }
}
