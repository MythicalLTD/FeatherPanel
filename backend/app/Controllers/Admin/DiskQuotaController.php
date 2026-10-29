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

use App\Chat\User;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Services\Quota\DiskQuota;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

/** Per-user disk quota: the panel default and per-user overrides. */
class DiskQuotaController
{
    public function settings(Request $request): Response
    {
        return ApiResponse::success(['default_mb' => DiskQuota::defaultMb()], 'Disk quota settings loaded');
    }

    public function updateSettings(Request $request): Response
    {
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !isset($data['default_mb']) || !is_numeric($data['default_mb']) || (int) $data['default_mb'] < 0) {
            return ApiResponse::error('default_mb must be 0 (unlimited) or a positive number of MiB', 'DISK_QUOTA_INVALID', 400);
        }
        if (!DiskQuota::setDefaultMb((int) $data['default_mb'])) {
            return ApiResponse::error('Failed to save the disk quota', 'DISK_QUOTA_SAVE_FAILED', 500);
        }
        $this->log($request, 'disk_quota_default_update', 'Set the default user disk quota to ' . DiskQuota::defaultMb() . ' MiB');

        return ApiResponse::success(['default_mb' => DiskQuota::defaultMb()], 'Disk quota saved');
    }

    public function show(Request $request, int $id): Response
    {
        if (User::getUserById($id) === null) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }

        return ApiResponse::success(DiskQuota::summary($id) + ['default_mb' => DiskQuota::defaultMb()], 'Disk quota loaded');
    }

    public function update(Request $request, int $id): Response
    {
        $user = User::getUserById($id);
        if ($user === null) {
            return ApiResponse::error('User not found', 'USER_NOT_FOUND', 404);
        }
        $data = json_decode($request->getContent(), true);
        if (!is_array($data) || !array_key_exists('quota_mb', $data)) {
            return ApiResponse::error('Send quota_mb (null for the default, 0 for unlimited)', 'DISK_QUOTA_INVALID', 400);
        }
        $value = $data['quota_mb'];
        if ($value !== null && (!is_numeric($value) || (int) $value < 0)) {
            return ApiResponse::error('quota_mb must be null, 0 (unlimited) or a positive number of MiB', 'DISK_QUOTA_INVALID', 400);
        }
        if (!DiskQuota::setOverride($id, $value === null ? null : (int) $value)) {
            return ApiResponse::error('Failed to save the disk quota', 'DISK_QUOTA_SAVE_FAILED', 500);
        }
        $this->log($request, 'disk_quota_user_update', 'Set disk quota for ' . $user['username'] . ' to ' . ($value === null ? 'the default' : DiskQuota::clamp((int) $value) . ' MiB'));

        return ApiResponse::success(DiskQuota::summary($id) + ['default_mb' => DiskQuota::defaultMb()], 'Disk quota saved');
    }

    private function log(Request $request, string $name, string $context): void
    {
        $admin = $request->attributes->get('user');
        Activity::createActivity([
            'user_uuid' => $admin['uuid'] ?? null,
            'name' => $name,
            'context' => $context,
            'ip_address' => CloudFlareRealIP::getRealIP(),
        ]);
    }
}
