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

use App\Chat\UserDevice;
use App\Config\ConfigFactory;
use App\Config\ConfigInterface;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class UserDeviceRegistrationGuard
{
    public static function assertRegistrationAllowed(Request $request, ConfigFactory $config): ?Response
    {
        if ($config->getSetting(ConfigInterface::REGISTRATION_DEVICE_LIMIT_ENABLED, 'false') !== 'true') {
            return null;
        }

        $maxAccounts = max(1, (int) $config->getSetting(ConfigInterface::REGISTRATION_DEVICE_MAX_ACCOUNTS, '1'));

        $clientToken = UserDeviceTracker::extractClientToken($request);
        if ($clientToken === null) {
            return null;
        }

        $deviceHash = UserDevice::hashClientToken($clientToken);
        $accountCount = UserDevice::countDistinctUsersByDeviceHash($deviceHash);

        if ($accountCount < $maxAccounts) {
            return null;
        }

        $mainAccount = UserDevice::getMainAccountForDeviceHash($deviceHash);
        $supportUrl = trim((string) $config->getSetting(ConfigInterface::APP_SUPPORT_URL, ''));

        if ($mainAccount !== null) {
            $message = sprintf(
                'Too many accounts on this device. Please use your main account: %s, or contact support.',
                $mainAccount['username']
            );
        } else {
            $message = 'Too many accounts on this device. Please use your main account or contact support.';
        }

        return ApiResponse::error($message, 'DEVICE_ACCOUNT_LIMIT', 403, [
            'main_account' => $mainAccount !== null ? [
                'uuid' => $mainAccount['uuid'],
                'username' => $mainAccount['username'],
            ] : null,
            'support_url' => $supportUrl !== '' ? $supportUrl : null,
            'max_accounts' => $maxAccounts,
        ]);
    }
}
