<?php

/*
 * This file is part of MythicalPanel.
 * Please view the LICENSE file that was distributed with this source code.
 *
 * # MythicalSystems License v2.0
 *
 * ## Copyright (c) 2021–2025 MythicalSystems and Cassian Gherman
 *
 * Breaking any of the following rules will result in a permanent ban from the MythicalSystems community and all of its services.
 */

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SettingsController
{
    private $app;
    private $settings;

    public function __construct()
    {
        $this->app = App::getInstance(true);
        $this->settings = [
            ConfigInterface::APP_NAME => [
                'name' => ConfigInterface::APP_NAME,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_NAME, 'MythicalPanel'),
                'description' => 'The name of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'MythicalPanel',
                'validation' => 'required|string|max:255',
                'options' => [],
            ],
            ConfigInterface::APP_URL => [
                'name' => ConfigInterface::APP_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://panel.mythical.systems'),
                'description' => 'The URL of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'https://panel.mythical.systems',
                'validation' => 'required|string|max:255',
                'options' => [],
            ],

            ConfigInterface::APP_TIMEZONE => [
                'name' => ConfigInterface::APP_TIMEZONE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_TIMEZONE, 'UTC'),
                'description' => 'The timezone of the application',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'UTC',
                'validation' => 'required|string|max:255',
                'options' => \DateTimeZone::listIdentifiers(),
            ],
            ConfigInterface::APP_SUPPORT_URL => [
                'name' => ConfigInterface::APP_SUPPORT_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_SUPPORT_URL, 'https://mythical.systems'),
                'description' => 'The support URL of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'https://mythical.systems',
                'validation' => 'required|string|max:255',
                'options' => [],
            ],
        ];
    }

    public function index(Request $request): Response
    {
        return ApiResponse::success(['settings' => $this->settings], 'Settings fetched successfully', 200);
    }

    public function show(Request $request, string $setting): Response
    {
        if (!isset($this->settings[$setting])) {
            return ApiResponse::error('Setting not found', 404);
        }

        return ApiResponse::success(['setting' => $this->settings[$setting]], 'Setting fetched successfully', 200);
    }

    public function update(Request $request): Response
    {
        $data = $request->request->all();
        $app = App::getInstance(true);
        $updatedSettings = [];

        // Validate and update each setting
        foreach ($data as $setting => $value) {
            if (!isset($this->settings[$setting])) {
                return ApiResponse::error("Invalid setting: {$setting}", 400);
            }

            $settingConfig = $this->settings[$setting];

            // Basic validation
            if ($settingConfig['required'] && empty($value)) {
                return ApiResponse::error("Setting {$setting} is required", 400);
            }

            if (!empty($value) && strlen($value) > 255) {
                return ApiResponse::error("Setting {$setting} value is too long (max 255 characters)", 400);
            }

            // Update the setting
            $app->getConfig()->setSetting($setting, $value);
            $updatedSettings[] = $setting;
        }

        // Log the activity
        if (!empty($updatedSettings)) {
            Activity::createActivity([
                'user_uuid' => $request->get('user')['uuid'] ?? null,
                'name' => 'update_settings',
                'context' => 'Updated settings: ' . implode(', ', $updatedSettings),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);
        }

        return ApiResponse::success([
            'message' => 'Settings updated successfully',
            'updated_settings' => $updatedSettings,
        ], 'Settings updated successfully', 200);
    }
}
