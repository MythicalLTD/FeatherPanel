<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2025 MythicalSystems
 * Copyright (c) 2025 Cassian Gherman (NaysKutzu)
 * Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

namespace App\Controllers\Admin;

use App\App;
use App\Chat\Activity;
use App\Helpers\ApiResponse;
use OpenApi\Attributes as OA;
use App\Config\ConfigInterface;
use App\CloudFlare\CloudFlareRealIP;
use App\Plugins\Events\Events\SettingsEvent;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\HttpFoundation\Response;

#[OA\Schema(
    schema: 'Setting',
    type: 'object',
    properties: [
        new OA\Property(property: 'name', type: 'string', description: 'Setting name/key'),
        new OA\Property(property: 'value', type: 'string', description: 'Current setting value'),
        new OA\Property(property: 'description', type: 'string', description: 'Setting description'),
        new OA\Property(property: 'type', type: 'string', description: 'Setting input type', enum: ['text', 'select', 'number']),
        new OA\Property(property: 'required', type: 'boolean', description: 'Whether the setting is required'),
        new OA\Property(property: 'placeholder', type: 'string', description: 'Placeholder text for the input'),
        new OA\Property(property: 'validation', type: 'string', description: 'Validation rules'),
        new OA\Property(property: 'options', type: 'array', items: new OA\Items(type: 'string'), description: 'Available options for select fields'),
        new OA\Property(property: 'category', type: 'string', description: 'Setting category', enum: ['app', 'security', 'email', 'other']),
    ]
)]
#[OA\Schema(
    schema: 'SettingCategory',
    type: 'object',
    properties: [
        new OA\Property(property: 'id', type: 'string', description: 'Category ID'),
        new OA\Property(property: 'name', type: 'string', description: 'Category name'),
        new OA\Property(property: 'description', type: 'string', description: 'Category description'),
        new OA\Property(property: 'icon', type: 'string', description: 'Category icon'),
        new OA\Property(property: 'settings_count', type: 'integer', description: 'Number of settings in this category'),
    ]
)]
#[OA\Schema(
    schema: 'SettingsUpdate',
    type: 'object',
    additionalProperties: new OA\AdditionalProperties(type: 'string'),
    description: 'Key-value pairs of settings to update'
)]
#[OA\Schema(
    schema: 'OrganizedSettings',
    type: 'object',
    additionalProperties: new OA\AdditionalProperties(
        type: 'object',
        properties: [
            new OA\Property(property: 'category', type: 'object', description: 'Category information'),
            new OA\Property(property: 'settings', type: 'object', additionalProperties: new OA\AdditionalProperties(ref: '#/components/schemas/Setting'), description: 'Settings in this category'),
        ]
    ),
    description: 'Settings organized by category'
)]
class SettingsController
{
    private $app;
    private $settings;
    private $sensitiveSettings = [
        ConfigInterface::SMTP_PASS,
        ConfigInterface::TURNSTILE_KEY_PRIV,
        // Add other sensitive settings here
    ];
    private $settingsCategories = [
        'app' => [
            'name' => 'App',
            'description' => 'Some default settings for the application',
            'icon' => 'settings',
            'settings' => [
                ConfigInterface::APP_NAME,
                ConfigInterface::APP_URL,
                ConfigInterface::APP_LOGO_WHITE,
                ConfigInterface::APP_LOGO_DARK,
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
                ConfigInterface::TELEMETRY,
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
                ConfigInterface::APP_DEVELOPER_MODE,
            ],
        ],
        'oauth' => [
            'name' => 'OAuth',
            'description' => 'OAuth configuration settings',
            'icon' => 'shield',
            'settings' => [
                ConfigInterface::DISCORD_OAUTH_ENABLED,
                ConfigInterface::DISCORD_OAUTH_CLIENT_ID,
                ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET,
            ],
        ],
        'servers' => [
            'name' => 'Servers',
            'description' => 'Servers configuration settings',
            'icon' => 'server',
            'settings' => [
                ConfigInterface::SERVER_ALLOW_EGG_CHANGE,
                ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE,
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
            ConfigInterface::APP_LOGO_WHITE => [
                'name' => ConfigInterface::APP_LOGO_WHITE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_LOGO_WHITE, 'https://github.com/mythicalltd.png'),
                'description' => 'The logo of the application (For white mode)',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'https://github.com/mythicalltd.png',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::TELEMETRY => [
                'name' => ConfigInterface::TELEMETRY,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TELEMETRY, 'true'),
                'description' => 'Should the application send telemetry data to the telemetry service?',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::APP_LOGO_DARK => [
                'name' => ConfigInterface::APP_LOGO_DARK,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_LOGO_DARK, 'https://cdn.mythical.systems/featherpanel/logo.png'),
                'description' => 'The logo of the application (For dark mode)',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'https://cdn.mythical.systems/featherpanel/logo.png',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::APP_URL => [
                'name' => ConfigInterface::APP_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems'),
                'description' => 'The URL of the application',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'https://featherpanel.mythical.systems',
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
                'value' => $this->maskSensitiveSetting(ConfigInterface::SMTP_PASS, 'password'),
                'description' => 'The SMTP password of the application',
                'type' => 'password',
                'required' => true,
                'placeholder' => 'Enter password to change',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'email',
                'sensitive' => true,
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
                'value' => $this->maskSensitiveSetting(ConfigInterface::TURNSTILE_KEY_PRIV, ''),
                'description' => 'The Turnstile private key of the application',
                'type' => 'password',
                'required' => false,
                'placeholder' => 'Enter private key to change',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'security',
                'sensitive' => true,
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
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::REGISTRATION_ENABLED, 'true'),
                'description' => 'Can users register themselves?',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::APP_DEVELOPER_MODE => [
                'name' => ConfigInterface::APP_DEVELOPER_MODE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_DEVELOPER_MODE, 'false'),
                'description' => 'Is the application in developer mode?',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'app',
            ],
            ConfigInterface::DISCORD_OAUTH_ENABLED => [
                'name' => ConfigInterface::DISCORD_OAUTH_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::DISCORD_OAUTH_ENABLED, 'false'),
                'description' => 'The Discord OAuth enabled of the application Callback URL: ' . $this->app->getConfig()->getSetting(ConfigInterface::APP_URL, 'https://featherpanel.mythical.systems') . '/api/user/auth/discord/callback',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'oauth',
            ],
            ConfigInterface::DISCORD_OAUTH_CLIENT_ID => [
                'name' => ConfigInterface::DISCORD_OAUTH_CLIENT_ID,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_ID, ''),
                'description' => 'The Discord OAuth client ID of the application',
                'type' => 'text',
                'required' => false,
                'placeholder' => '',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'oauth',
            ],
            ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET => [
                'name' => ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET,
                'value' => $this->maskSensitiveSetting(ConfigInterface::DISCORD_OAUTH_CLIENT_SECRET, ''),
                'description' => 'The Discord OAuth client secret of the application',
                'type' => 'password',
                'required' => false,
                'placeholder' => 'Enter client secret to change',
                'sensitive' => true,
            ],
            ConfigInterface::SERVER_ALLOW_EGG_CHANGE => [
                'name' => ConfigInterface::SERVER_ALLOW_EGG_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_EGG_CHANGE, 'false'),
                'description' => 'Allow users to change the server egg',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE => [
                'name' => ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE, 'true'),
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'description' => 'Allow users to change the server startup',
                'category' => 'servers',
            ],
        ];
    }

    #[OA\Get(
        path: '/api/admin/settings',
        summary: 'Get all settings',
        description: 'Retrieve all application settings organized by category. Can optionally filter by category using query parameter.',
        tags: ['Admin - Settings'],
        parameters: [
            new OA\Parameter(
                name: 'category',
                in: 'query',
                description: 'Filter settings by category',
                required: false,
                schema: new OA\Schema(type: 'string', enum: ['app', 'security', 'email', 'other'])
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Settings retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'settings', type: 'object', additionalProperties: new OA\AdditionalProperties(ref: '#/components/schemas/Setting'), description: 'All settings'),
                        new OA\Property(property: 'categories', type: 'object', additionalProperties: new OA\AdditionalProperties(type: 'object'), description: 'Settings categories'),
                        new OA\Property(property: 'organized_settings', ref: '#/components/schemas/OrganizedSettings', description: 'Settings organized by category'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
    public function index(Request $request): Response
    {
        $category = $request->query->get('category');

        if ($category) {
            return $this->getSettingsByCategory($category);
        }

        $organizedSettings = $this->organizeSettingsByCategory();

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SettingsEvent::onSettingsRetrieved(),
                [
                    'settings' => $this->settings,
                    'categories' => $this->settingsCategories,
                    'organized_settings' => $organizedSettings,
                ]
            );
        }

        return ApiResponse::success([
            'settings' => $this->settings,
            'categories' => $this->settingsCategories,
            'organized_settings' => $organizedSettings,
        ], 'Settings fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/settings/categories',
        summary: 'Get settings categories',
        description: 'Retrieve all available settings categories with their metadata.',
        tags: ['Admin - Settings'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Categories retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'categories', type: 'object', additionalProperties: new OA\AdditionalProperties(ref: '#/components/schemas/SettingCategory'), description: 'Settings categories'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
        ]
    )]
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
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SettingsEvent::onSettingsByCategoryRetrieved(),
                [
                    'categories' => $categories,
                ]
            );
        }

        return ApiResponse::success(['categories' => $categories], 'Categories fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/settings/category/{category}',
        summary: 'Get settings by category',
        description: 'Retrieve all settings belonging to a specific category.',
        tags: ['Admin - Settings'],
        parameters: [
            new OA\Parameter(
                name: 'category',
                in: 'path',
                description: 'Category name',
                required: true,
                schema: new OA\Schema(type: 'string', enum: ['app', 'security', 'email', 'other'])
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Category settings retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'category', type: 'object', description: 'Category information'),
                        new OA\Property(property: 'settings', type: 'object', additionalProperties: new OA\AdditionalProperties(ref: '#/components/schemas/Setting'), description: 'Settings in this category'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Category not found'),
        ]
    )]
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
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SettingsEvent::onSettingsByCategoryRetrieved(),
                [
                    'category' => $category,
                    'category_config' => $categoryConfig,
                    'settings' => $categorySettings,
                ]
            );
        }

        return ApiResponse::success([
            'category' => $categoryConfig,
            'settings' => $categorySettings,
        ], 'Category settings fetched successfully', 200);
    }

    #[OA\Get(
        path: '/api/admin/settings/{setting}',
        summary: 'Get specific setting',
        description: 'Retrieve a specific setting by its name/key.',
        tags: ['Admin - Settings'],
        parameters: [
            new OA\Parameter(
                name: 'setting',
                in: 'path',
                description: 'Setting name/key',
                required: true,
                schema: new OA\Schema(type: 'string')
            ),
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Setting retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'setting', ref: '#/components/schemas/Setting'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 404, description: 'Setting not found'),
        ]
    )]
    public function show(Request $request, string $setting): Response
    {
        if (!isset($this->settings[$setting])) {
            return ApiResponse::error('Setting not found', 404);
        }

        // Emit event
        global $eventManager;
        if (isset($eventManager) && $eventManager !== null) {
            $eventManager->emit(
                SettingsEvent::onSettingRetrieved(),
                [
                    'setting_name' => $setting,
                    'setting_data' => $this->settings[$setting],
                ]
            );
        }

        return ApiResponse::success(['setting' => $this->settings[$setting]], 'Setting fetched successfully', 200);
    }

    #[OA\Patch(
        path: '/api/admin/settings',
        summary: 'Update settings',
        description: 'Update multiple application settings with validation and activity logging.',
        tags: ['Admin - Settings'],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(ref: '#/components/schemas/SettingsUpdate')
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Settings updated successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', description: 'Success message'),
                        new OA\Property(property: 'updated_settings', type: 'array', items: new OA\Items(type: 'string'), description: 'List of updated setting names'),
                    ]
                )
            ),
            new OA\Response(response: 400, description: 'Bad request - Invalid setting name, required field empty, or value too long'),
            new OA\Response(response: 401, description: 'Unauthorized'),
            new OA\Response(response: 403, description: 'Forbidden - Insufficient permissions'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to update setting'),
        ]
    )]
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

            // Handle sensitive settings - only update if value is not masked
            if ($this->isSensitiveSetting($setting)) {
                // If the value is the masked value (••••••••), skip updating
                if ($value === '••••••••' || empty($value)) {
                    $app->getLogger()->debug("Skipping sensitive setting update for {$setting} - value not changed");
                    continue;
                }
            }

            // Basic validation
            if ($settingConfig['required'] && empty($value)) {
                return ApiResponse::error("Setting {$setting} is required", 400);
            }

            if (!empty($value) && strlen($value) > 255) {
                return ApiResponse::error("Setting {$setting} value is too long (max 255 characters)", 400);
            }

            $app->getLogger()->debug("Updating setting: {$setting} with value: " . ($this->isSensitiveSetting($setting) ? '[MASKED]' : $value));

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
            if (isset($eventManager) && $eventManager !== null) {
                $eventManager->emit(
                    SettingsEvent::onSettingsUpdated(),
                    [
                        'updated_settings' => $updatedSettings,
                        'settings_data' => $data,
                        'user' => $request->get('user'),
                    ]
                );
            }
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

    /**
     * Mask sensitive setting values for frontend display.
     */
    private function maskSensitiveSetting(string $settingKey, string $defaultValue = ''): string
    {
        $actualValue = $this->app->getConfig()->getSetting($settingKey, $defaultValue);

        // If the setting has a value, mask it
        if (!empty($actualValue)) {
            return '••••••••'; // Masked value
        }

        return ''; // Empty value remains empty
    }

    /**
     * Check if a setting is sensitive.
     */
    private function isSensitiveSetting(string $settingKey): bool
    {
        return in_array($settingKey, $this->sensitiveSettings);
    }
}
