<?php

/*
 * This file is part of App.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\System;

use App\App;
use App\Config\PublicConfig;
use App\Helpers\ApiResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SettingsController
{
    public function index(Request $request): Response
    {
        $appInstance = App::getInstance(true);
        $settingsPublic = PublicConfig::getPublicSettingsWithDefaults();
        $settings = $appInstance->getConfig()->getSettings(array_keys($settingsPublic));
        // Fill in any missing settings with defaults
        foreach ($settingsPublic as $key => $defaultValue) {
            if (!isset($settings[$key])) {
                $settings[$key] = $defaultValue;
            }
        }

        return ApiResponse::success(['settings' => $settings], 'Providing settings', 200);
    }
}
