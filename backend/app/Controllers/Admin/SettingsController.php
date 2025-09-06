<?php

/*
 * This file is part of FeatherPanel.
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
use App\Plugins\Events\Events\SettingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

class SettingsController
{
    private $app;
    private $settings;
    private $settingsCategories = [
        'app' => [
            'name' => 'App',
            'description' => 'Some default settings for the application',
            'icon' => 'settings',
            'settings' => [
                ConfigInterface::APP_NAME,
                ConfigInterface::APP_URL,
                ConfigInterface::APP_LOGO,
                ConfigInterface::APP_TIMEZONE,
                ConfigInterface::APP_SUPPORT_URL,
            ],
        ],
        'security' => [
            'name' => 'Security',
            'description' => 'Security and authentication settings',
            'icon' => 'shield',
            'settings' => [
                ConfigInterface::TURNSTILE_ENABLED,
                ConfigInterface::TURNSTILE_KEY_PUB,
                ConfigInterface::TURNSTILE_KEY_PRIV,
                ConfigInterface::REGISTRATION_ENABLED,
            ],
        ],
        'email' => [
            'name' => 'Email',
            'description' => 'Email configuration settings',
            'icon' => 'mail',
            'settings' => [
                ConfigInterface::SMTP_ENABLED,
                ConfigInterface::SMTP_HOST,
                ConfigInterface::SMTP_PORT,
                ConfigInterface::SMTP_USER,
                ConfigInterface::SMTP_PASS,
                ConfigInterface::SMTP_FROM,
                ConfigInterface::SMTP_ENCRYPTION,
            ],
        ],
        'other' => [
            'name' => 'Other',
            'description' => 'Other configuration settings',
            'icon' => 'settings',
            'settings' => [
                ConfigInterface::LEGAL_TOS,
                ConfigInterface::LEGAL_PRIVACY,
            ],
        ],
    ];

    public function __construct()
    {
        $this->app = App::getInstance(true);
        $this->settings = [
            ConfigInterface::APP_NAME => [
                'name' => ConfigInterface::APP_NAME,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_NAME, 'FeatherPanel'),
                'description' => 'The name of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'FeatherPanel',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::APP_LOGO => [
                'name' => ConfigInterface::APP_LOGO,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_LOGO, 'https://cdn.mythical.systems/featherpanel/logo.png'),
                'description' => 'The logo of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'https://cdn.mythical.systems/featherpanel/logo.png',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'app',
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
                'category' => 'app',
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
                'category' => 'app',
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
                'category' => 'app',
            ],
            ConfigInterface::SMTP_ENABLED => [
                'name' => ConfigInterface::SMTP_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SMTP_ENABLED, 'false'),
                'description' => 'The SMTP enabled of the application',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'email',
            ],
            ConfigInterface::SMTP_HOST => [
                'name' => ConfigInterface::SMTP_HOST,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SMTP_HOST, 'localhost'),
                'description' => 'The SMTP host of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'localhost',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'email',
            ],
            ConfigInterface::SMTP_PORT => [
                'name' => ConfigInterface::SMTP_PORT,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SMTP_PORT, '587'),
                'description' => 'The SMTP port of the application',
                'type' => 'number',
                'required' => true,
                'placeholder' => '587',
                'validation' => 'required|integer|min:1|max:65535',
                'options' => [],
                'category' => 'email',
            ],
            ConfigInterface::SMTP_USER => [
                'name' => ConfigInterface::SMTP_USER,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SMTP_USER, 'example@example.com'),
                'description' => 'The SMTP user of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'example@example.com',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'email',
            ],
            ConfigInterface::SMTP_PASS => [
                'name' => ConfigInterface::SMTP_PASS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SMTP_PASS, 'password'),
                'description' => 'The SMTP password of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'password',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'email',
            ],
            ConfigInterface::SMTP_FROM => [
                'name' => ConfigInterface::SMTP_FROM,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SMTP_FROM, 'noreply@featherpanel.com'),
                'description' => 'The SMTP from of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'noreply@featherpanel.com',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'email',
            ],
            ConfigInterface::SMTP_ENCRYPTION => [
                'name' => ConfigInterface::SMTP_ENCRYPTION,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SMTP_ENCRYPTION, 'tls'),
                'description' => 'The SMTP encryption of the application',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'tls',
                'validation' => 'required|string|max:255',
                'options' => ['tls', 'ssl'],
                'category' => 'email',
            ],
            ConfigInterface::TURNSTILE_ENABLED => [
                'name' => ConfigInterface::TURNSTILE_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TURNSTILE_ENABLED, 'false'),
                'description' => 'The Turnstile enabled of the application',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::TURNSTILE_KEY_PUB => [
                'name' => ConfigInterface::TURNSTILE_KEY_PUB,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TURNSTILE_KEY_PUB, ''),
                'description' => 'The Turnstile key pub of the application',
                'type' => 'text',
                'required' => false,
                'placeholder' => '',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'security',
            ],
            ConfigInterface::TURNSTILE_KEY_PRIV => [
                'name' => ConfigInterface::TURNSTILE_KEY_PRIV,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TURNSTILE_KEY_PRIV, ''),
                'description' => 'The Turnstile key priv of the application',
                'type' => 'text',
                'required' => false,
                'placeholder' => '',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'security',
            ],
            ConfigInterface::LEGAL_TOS => [
                'name' => ConfigInterface::LEGAL_TOS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::LEGAL_TOS, '/tos'),
                'description' => 'The legal TOS of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => '/tos',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'other',
            ],
            ConfigInterface::LEGAL_PRIVACY => [
                'name' => ConfigInterface::LEGAL_PRIVACY,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::LEGAL_PRIVACY, '/privacy'),
                'description' => 'The legal privacy of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => '/privacy',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'other',
            ],
            ConfigInterface::REGISTRATION_ENABLED => [
                'name' => ConfigInterface::REGISTRATION_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::REGISTRATION_ENABLED, 'false'),
                'description' => 'Can users register themselves?',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
        ];
    }

    public function index(Request $request): Response
    {
        $category = $request->query->get('category');

        if ($category) {
            return $this->getSettingsByCategory($category);
        }

        $organizedSettings = $this->organizeSettingsByCategory();

        // Emit event
        global $eventManager;
        $eventManager->emit(
            SettingsEvent::onSettingsRetrieved(),
            [
                'settings' => $this->settings,
                'categories' => $this->settingsCategories,
                'organized_settings' => $organizedSettings,
            ]
        );

        return ApiResponse::success([
            'settings' => $this->settings,
            'categories' => $this->settingsCategories,
            'organized_settings' => $organizedSettings,
        ], 'Settings fetched successfully', 200);
    }

    public function categories(Request $request): Response
    {
        $categories = [];

        foreach ($this->settingsCategories as $key => $category) {
            $categories[$key] = [
                'id' => $key,
                'name' => $category['name'],
                'description' => $category['description'],
                'icon' => $category['icon'],
                'settings_count' => count($category['settings']),
            ];
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            SettingsEvent::onSettingsByCategoryRetrieved(),
            [
                'categories' => $categories,
            ]
        );

        return ApiResponse::success(['categories' => $categories], 'Categories fetched successfully', 200);
    }

    public function getSettingsByCategory(string $category): Response
    {
        if (!isset($this->settingsCategories[$category])) {
            return ApiResponse::error('Category not found', 404);
        }

        $categorySettings = [];
        $categoryConfig = $this->settingsCategories[$category];

        foreach ($categoryConfig['settings'] as $settingKey) {
            if (isset($this->settings[$settingKey])) {
                $categorySettings[$settingKey] = $this->settings[$settingKey];
            }
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            SettingsEvent::onSettingsByCategoryRetrieved(),
            [
                'category' => $category,
                'category_config' => $categoryConfig,
                'settings' => $categorySettings,
            ]
        );

        return ApiResponse::success([
            'category' => $categoryConfig,
            'settings' => $categorySettings,
        ], 'Category settings fetched successfully', 200);
    }

    public function show(Request $request, string $setting): Response
    {
        if (!isset($this->settings[$setting])) {
            return ApiResponse::error('Setting not found', 404);
        }

        // Emit event
        global $eventManager;
        $eventManager->emit(
            SettingsEvent::onSettingRetrieved(),
            [
                'setting_name' => $setting,
                'setting_data' => $this->settings[$setting],
            ]
        );

        return ApiResponse::success(['setting' => $this->settings[$setting]], 'Setting fetched successfully', 200);
    }

    public function update(Request $request): Response
    {
        $data = $request->getContent();
        $data = json_decode($data, true);
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
            $app->getLogger()->debug("Updating setting: {$setting} with value: {$value}");
            // Update the setting
            if ($app->getConfig()->setSetting($setting, $value)) {
                $updatedSettings[] = $setting;
            } else {
                return ApiResponse::error("Failed to update setting: {$setting}", 500);
            }
        }

        // Log the activity
        if (!empty($updatedSettings)) {
            Activity::createActivity([
                'user_uuid' => $request->get('user')['uuid'] ?? null,
                'name' => 'update_settings',
                'context' => 'Updated settings: ' . implode(', ', $updatedSettings),
                'ip_address' => CloudFlareRealIP::getRealIP(),
            ]);

            // Emit event
            global $eventManager;
            $eventManager->emit(
                SettingsEvent::onSettingsUpdated(),
                [
                    'updated_settings' => $updatedSettings,
                    'settings_data' => $data,
                    'user' => $request->get('user'),
                ]
            );
        }

        return ApiResponse::success([
            'message' => 'Settings updated successfully',
            'updated_settings' => $updatedSettings,
        ], 'Settings updated successfully', 200);
    }

    private function organizeSettingsByCategory(): array
    {
        $organized = [];

        foreach ($this->settingsCategories as $categoryKey => $categoryConfig) {
            $organized[$categoryKey] = [
                'category' => $categoryConfig,
                'settings' => [],
            ];

            foreach ($categoryConfig['settings'] as $settingKey) {
                if (isset($this->settings[$settingKey])) {
                    $organized[$categoryKey]['settings'][$settingKey] = $this->settings[$settingKey];
                }
            }
        }

        return $organized;
    }
}
