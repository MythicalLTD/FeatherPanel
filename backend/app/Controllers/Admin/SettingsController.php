<?php

/*
 * This file is part of FeatherPanel.
 *
 * MIT License
 *
 * Copyright (c) 2024-2026 MythicalSystems
 * Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
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
        new OA\Property(property: 'type', type: 'string', description: 'Setting input type', enum: ['text', 'select', 'number', 'textarea']),
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
        ConfigInterface::CHATBOT_GOOGLE_AI_API_KEY,
        ConfigInterface::CHATBOT_OPENROUTER_API_KEY,
        ConfigInterface::CHATBOT_OPENAI_API_KEY,
        ConfigInterface::CHATBOT_GROK_API_KEY,
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
                ConfigInterface::LINKEDIN_URL,
                ConfigInterface::TELEGRAM_URL,
                ConfigInterface::TIKTOK_URL,
                ConfigInterface::TWITTER_URL,
                ConfigInterface::WHATSAPP_URL,
                ConfigInterface::YOUTUBE_URL,
                ConfigInterface::WEBSITE_URL,
                ConfigInterface::STATUS_PAGE_URL,
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
                ConfigInterface::REQUIRE_TWO_FA_ADMINS,
                ConfigInterface::USER_ALLOW_AVATAR_CHANGE,
                ConfigInterface::USER_ALLOW_USERNAME_CHANGE,
                ConfigInterface::USER_ALLOW_EMAIL_CHANGE,
                ConfigInterface::USER_ALLOW_FIRST_NAME_CHANGE,
                ConfigInterface::USER_ALLOW_LAST_NAME_CHANGE,
                ConfigInterface::USER_ALLOW_API_KEYS_CREATE,
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
        'status_page' => [
            'name' => 'Status Page',
            'description' => 'User-facing status page configuration',
            'icon' => 'activity',
            'settings' => [
                ConfigInterface::STATUS_PAGE_ENABLED,
                ConfigInterface::STATUS_PAGE_SHOW_NODE_STATUS,
                ConfigInterface::STATUS_PAGE_SHOW_LOAD_USAGE,
                ConfigInterface::STATUS_PAGE_SHOW_TOTAL_SERVERS,
                ConfigInterface::STATUS_PAGE_SHOW_INDIVIDUAL_NODES,
            ],
        ],
        'knowledgebase' => [
            'name' => 'Knowledgebase',
            'description' => 'Knowledgebase and documentation settings',
            'icon' => 'book',
            'settings' => [
                ConfigInterface::KNOWLEDGEBASE_ENABLED,
                ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES,
                ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES,
                ConfigInterface::KNOWLEDGEBASE_SHOW_ATTACHMENTS,
                ConfigInterface::KNOWLEDGEBASE_SHOW_TAGS,
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
                ConfigInterface::SERVER_ALLOW_SUBUSERS,
                ConfigInterface::SERVER_ALLOW_SCHEDULES,
                ConfigInterface::SERVER_ALLOW_ALLOCATION_SELECT,
                ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL,
                ConfigInterface::SERVER_ALLOW_USER_MADE_PROXY,
                ConfigInterface::SERVER_PROXY_MAX_PER_SERVER,
                ConfigInterface::SERVER_ALLOW_CROSS_REALM_SPELL_CHANGE,
				ConfigInterface::SERVER_ALLOW_USER_SERVER_DELETION,
                ConfigInterface::SERVER_ALLOW_USER_MADE_IMPORT,
            ],
        ],
        'chatbot' => [
            'name' => 'Chatbot',
            'description' => 'AI chatbot configuration settings',
            'icon' => 'bot',
            'settings' => [
                ConfigInterface::CHATBOT_ENABLED,
                ConfigInterface::CHATBOT_AI_PROVIDER,
                ConfigInterface::CHATBOT_TEMPERATURE,
                ConfigInterface::CHATBOT_MAX_TOKENS,
                ConfigInterface::CHATBOT_MAX_HISTORY,
                ConfigInterface::CHATBOT_SYSTEM_PROMPT,
                ConfigInterface::CHATBOT_USER_PROMPT,
                ConfigInterface::CHATBOT_GOOGLE_AI_API_KEY,
                ConfigInterface::CHATBOT_GOOGLE_AI_MODEL,
                ConfigInterface::CHATBOT_OPENROUTER_API_KEY,
                ConfigInterface::CHATBOT_OPENROUTER_MODEL,
                ConfigInterface::CHATBOT_OPENAI_API_KEY,
                ConfigInterface::CHATBOT_OPENAI_MODEL,
                ConfigInterface::CHATBOT_OPENAI_BASE_URL,
                ConfigInterface::CHATBOT_OLLAMA_BASE_URL,
                ConfigInterface::CHATBOT_OLLAMA_MODEL,
                ConfigInterface::CHATBOT_GROK_API_KEY,
                ConfigInterface::CHATBOT_GROK_MODEL,
            ],
        ],
        'ticket_system' => [
            'name' => 'Ticket System',
            'description' => 'Ticket system configuration settings',
            'icon' => 'ticket',
            'settings' => [
                ConfigInterface::TICKET_SYSTEM_ENABLED,
                ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS,
                ConfigInterface::TICKET_SYSTEM_MAX_OPEN_TICKETS,
            ],
        ],
        'seo' => [
            'name' => 'SEO',
            'description' => 'Search Engine Optimization settings',
            'icon' => 'search',
            'settings' => [
                ConfigInterface::APP_SEO_TITLE,
                ConfigInterface::APP_SEO_DESCRIPTION,
                ConfigInterface::APP_SEO_KEYWORDS,
            ],
        ],
        'pwa' => [
            'name' => 'PWA',
            'description' => 'Progressive Web App settings',
            'icon' => 'smartphone',
            'settings' => [
                ConfigInterface::APP_PWA_ENABLED,
                ConfigInterface::APP_PWA_SHORT_NAME,
                ConfigInterface::APP_PWA_DESCRIPTION,
                ConfigInterface::APP_PWA_THEME_COLOR,
                ConfigInterface::APP_PWA_BG_COLOR,
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
                ConfigInterface::CUSTOM_JS,
                ConfigInterface::CUSTOM_CSS,
                ConfigInterface::CACHE_DRIVER,
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
            ConfigInterface::LINKEDIN_URL => [
                'name' => ConfigInterface::LINKEDIN_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::LINKEDIN_URL, ''),
                'description' => 'LinkedIn profile or page URL',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://linkedin.com/company/example',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::TELEGRAM_URL => [
                'name' => ConfigInterface::TELEGRAM_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TELEGRAM_URL, ''),
                'description' => 'Telegram channel or group URL',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://t.me/example',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::TIKTOK_URL => [
                'name' => ConfigInterface::TIKTOK_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TIKTOK_URL, ''),
                'description' => 'TikTok profile URL',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://tiktok.com/@example',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::TWITTER_URL => [
                'name' => ConfigInterface::TWITTER_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TWITTER_URL, ''),
                'description' => 'Twitter/X profile URL',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://twitter.com/example',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::WHATSAPP_URL => [
                'name' => ConfigInterface::WHATSAPP_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::WHATSAPP_URL, ''),
                'description' => 'WhatsApp contact or group URL',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://wa.me/1234567890',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::YOUTUBE_URL => [
                'name' => ConfigInterface::YOUTUBE_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::YOUTUBE_URL, ''),
                'description' => 'YouTube channel URL',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://youtube.com/@example',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::WEBSITE_URL => [
                'name' => ConfigInterface::WEBSITE_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::WEBSITE_URL, ''),
                'description' => 'Main website URL',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://example.com',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'app',
            ],
            ConfigInterface::STATUS_PAGE_URL => [
                'name' => ConfigInterface::STATUS_PAGE_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::STATUS_PAGE_URL, ''),
                'description' => 'Status page URL (e.g., status.example.com)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://status.example.com',
                'validation' => 'string|max:255',
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
            ConfigInterface::USER_ALLOW_AVATAR_CHANGE => [
                'name' => ConfigInterface::USER_ALLOW_AVATAR_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::USER_ALLOW_AVATAR_CHANGE, 'true'),
                'description' => 'Allow users to change their avatar',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::USER_ALLOW_USERNAME_CHANGE => [
                'name' => ConfigInterface::USER_ALLOW_USERNAME_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::USER_ALLOW_USERNAME_CHANGE, 'true'),
                'description' => 'Allow users to change their username',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::USER_ALLOW_EMAIL_CHANGE => [
                'name' => ConfigInterface::USER_ALLOW_EMAIL_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::USER_ALLOW_EMAIL_CHANGE, 'true'),
                'description' => 'Allow users to change their email address',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::USER_ALLOW_FIRST_NAME_CHANGE => [
                'name' => ConfigInterface::USER_ALLOW_FIRST_NAME_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::USER_ALLOW_FIRST_NAME_CHANGE, 'true'),
                'description' => 'Allow users to change their first name',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::USER_ALLOW_LAST_NAME_CHANGE => [
                'name' => ConfigInterface::USER_ALLOW_LAST_NAME_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::USER_ALLOW_LAST_NAME_CHANGE, 'true'),
                'description' => 'Allow users to change their last name',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::USER_ALLOW_API_KEYS_CREATE => [
                'name' => ConfigInterface::USER_ALLOW_API_KEYS_CREATE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::USER_ALLOW_API_KEYS_CREATE, 'true'),
                'description' => 'Allow users to create API keys',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
            ],
            ConfigInterface::REQUIRE_TWO_FA_ADMINS => [
                'name' => ConfigInterface::REQUIRE_TWO_FA_ADMINS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::REQUIRE_TWO_FA_ADMINS, 'false'),
                'description' => 'Require two-factor authentication for admins',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'security',
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
                'description' => 'Allow users to change the server spells/eggs',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_ALLOW_CROSS_REALM_SPELL_CHANGE => [
                'name' => ConfigInterface::SERVER_ALLOW_CROSS_REALM_SPELL_CHANGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_CROSS_REALM_SPELL_CHANGE, 'false'),
                'description' => 'Allow users to change server spells/eggs across different realms. When disabled, users can only select spells from the same realm as their server.',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_ALLOW_SUBUSERS => [
                'name' => ConfigInterface::SERVER_ALLOW_SUBUSERS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_SUBUSERS, 'true'),
                'description' => 'Allow users to add subusers to their servers',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
			ConfigInterface::SERVER_ALLOW_USER_SERVER_DELETION => [
				'name' => ConfigInterface::SERVER_ALLOW_USER_SERVER_DELETION,
				'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_SERVER_DELETION, 'false'),
				'description' => 'Allow users to delete their servers. When disabled, users can only delete their servers via the admin panel.',
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
            ConfigInterface::SERVER_ALLOW_SCHEDULES => [
                'name' => ConfigInterface::SERVER_ALLOW_SCHEDULES,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_SCHEDULES, 'true'),
                'description' => 'Allow users to create and manage schedules for their servers',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_ALLOW_ALLOCATION_SELECT => [
                'name' => ConfigInterface::SERVER_ALLOW_ALLOCATION_SELECT,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_ALLOCATION_SELECT, 'false'),
                'description' => 'Allow users to select which allocation to assign when auto-allocating',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL => [
                'name' => ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL, 'false'),
                'description' => 'Allow users to create and manage their own server firewall rules',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_ALLOW_USER_MADE_PROXY => [
                'name' => ConfigInterface::SERVER_ALLOW_USER_MADE_PROXY,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_PROXY, 'false'),
                'description' => 'Allow users to create and manage their own server reverse proxy configurations',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_PROXY_MAX_PER_SERVER => [
                'name' => ConfigInterface::SERVER_PROXY_MAX_PER_SERVER,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_PROXY_MAX_PER_SERVER, '5'),
                'description' => 'Maximum number of reverse proxy configurations per server',
                'type' => 'number',
                'required' => true,
                'placeholder' => '5',
                'validation' => 'required|integer|min:1|max:10',
                'options' => [],
                'category' => 'servers',
            ],
            ConfigInterface::SERVER_ALLOW_USER_MADE_IMPORT => [
                'name' => ConfigInterface::SERVER_ALLOW_USER_MADE_IMPORT,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::SERVER_ALLOW_USER_MADE_IMPORT, 'false'),
                'description' => 'Allow users to import server files from remote SFTP or FTP servers. The server must be offline for imports to work.',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'servers',
            ],
            ConfigInterface::CHATBOT_ENABLED => [
                'name' => ConfigInterface::CHATBOT_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_ENABLED, 'false'),
                'description' => 'Enable the AI chatbot',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'chatbot',
            ],
            // SEO Settings
            ConfigInterface::APP_SEO_TITLE => [
                'name' => ConfigInterface::APP_SEO_TITLE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_SEO_TITLE, 'FeatherPanel'),
                'description' => 'The default title for the application pages',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'FeatherPanel',
                'validation' => 'required|string|max:255',
                'options' => [],
                'category' => 'seo',
            ],
            ConfigInterface::APP_SEO_DESCRIPTION => [
                'name' => ConfigInterface::APP_SEO_DESCRIPTION,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_SEO_DESCRIPTION, 'A powerful game server management panel.'),
                'description' => 'The default description for the application pages',
                'type' => 'textarea',
                'required' => true,
                'placeholder' => 'A powerful game server management panel.',
                'validation' => 'required|string|max:500',
                'options' => [],
                'category' => 'seo',
            ],
            ConfigInterface::APP_SEO_KEYWORDS => [
                'name' => ConfigInterface::APP_SEO_KEYWORDS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_SEO_KEYWORDS, 'game, server, management, panel, hosting'),
                'description' => 'Comma-separated keywords for SEO',
                'type' => 'textarea',
                'required' => true,
                'placeholder' => 'game, server, management, panel, hosting',
                'validation' => 'required|string|max:500',
                'options' => [],
                'category' => 'seo',
            ],
            // PWA Settings
            ConfigInterface::APP_PWA_ENABLED => [
                'name' => ConfigInterface::APP_PWA_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_PWA_ENABLED, 'false'),
                'description' => 'Enable Progressive Web App features',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'pwa',
            ],
            ConfigInterface::APP_PWA_SHORT_NAME => [
                'name' => ConfigInterface::APP_PWA_SHORT_NAME,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_PWA_SHORT_NAME, 'FeatherPanel'),
                'description' => 'Short name for the PWA (used in app launcher)',
                'type' => 'text',
                'required' => true,
                'placeholder' => 'FeatherPanel',
                'validation' => 'required|string|max:50',
                'options' => [],
                'category' => 'pwa',
            ],
            ConfigInterface::APP_PWA_DESCRIPTION => [
                'name' => ConfigInterface::APP_PWA_DESCRIPTION,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_PWA_DESCRIPTION, 'Manage your game servers on the go.'),
                'description' => 'Description for the PWA',
                'type' => 'textarea',
                'required' => true,
                'placeholder' => 'Manage your game servers on the go.',
                'validation' => 'required|string|max:500',
                'options' => [],
                'category' => 'pwa',
            ],
            ConfigInterface::APP_PWA_THEME_COLOR => [
                'name' => ConfigInterface::APP_PWA_THEME_COLOR,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_PWA_THEME_COLOR, '#000000'),
                'description' => 'Theme color for the PWA browser bar',
                'type' => 'text',
                'required' => true,
                'placeholder' => '#000000',
                'validation' => 'required|string|max:7',
                'options' => [],
                'category' => 'pwa',
            ],
            ConfigInterface::APP_PWA_BG_COLOR => [
                'name' => ConfigInterface::APP_PWA_BG_COLOR,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::APP_PWA_BG_COLOR, '#ffffff'),
                'description' => 'Background color for the PWA splash screen',
                'type' => 'text',
                'required' => true,
                'placeholder' => '#ffffff',
                'validation' => 'required|string|max:7',
                'options' => [],
                'category' => 'pwa',
            ],

            ConfigInterface::CHATBOT_AI_PROVIDER => [
                'name' => ConfigInterface::CHATBOT_AI_PROVIDER,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_AI_PROVIDER, 'basic'),
                'description' => 'AI provider for the chatbot',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'basic',
                'validation' => 'required|string|max:255',
                'options' => ['basic', 'google_gemini', 'openrouter', 'openai', 'ollama', 'grok', 'perplexity'],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_TEMPERATURE => [
                'name' => ConfigInterface::CHATBOT_TEMPERATURE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_TEMPERATURE, '0.7'),
                'description' => 'Temperature for AI responses (0.0-1.0). Lower = more focused, Higher = more creative',
                'type' => 'number',
                'required' => false,
                'placeholder' => '0.7',
                'validation' => 'numeric|min:0|max:1',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_MAX_TOKENS => [
                'name' => ConfigInterface::CHATBOT_MAX_TOKENS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_MAX_TOKENS, '2048'),
                'description' => 'Maximum number of tokens in AI responses',
                'type' => 'number',
                'required' => false,
                'placeholder' => '2048',
                'validation' => 'integer|min:1|max:8192',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_MAX_HISTORY => [
                'name' => ConfigInterface::CHATBOT_MAX_HISTORY,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_MAX_HISTORY, '10'),
                'description' => 'Maximum number of previous messages to include in context',
                'type' => 'number',
                'required' => false,
                'placeholder' => '10',
                'validation' => 'integer|min:1|max:50',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_GOOGLE_AI_API_KEY => [
                'name' => ConfigInterface::CHATBOT_GOOGLE_AI_API_KEY,
                'value' => $this->maskSensitiveSetting(ConfigInterface::CHATBOT_GOOGLE_AI_API_KEY, ''),
                'description' => 'Google AI Studio API key for Gemini',
                'type' => 'password',
                'required' => false,
                'placeholder' => 'Enter API key to change',
                'sensitive' => true,
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_GOOGLE_AI_MODEL => [
                'name' => ConfigInterface::CHATBOT_GOOGLE_AI_MODEL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_GOOGLE_AI_MODEL, 'gemini-2.5-flash'),
                'description' => 'Google Gemini model to use (e.g., gemini-2.5-flash, gemini-2.5-pro)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'gemini-2.5-flash',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_OPENROUTER_API_KEY => [
                'name' => ConfigInterface::CHATBOT_OPENROUTER_API_KEY,
                'value' => $this->maskSensitiveSetting(ConfigInterface::CHATBOT_OPENROUTER_API_KEY, ''),
                'description' => 'OpenRouter API key',
                'type' => 'password',
                'required' => false,
                'placeholder' => 'Enter API key to change',
                'sensitive' => true,
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_OPENROUTER_MODEL => [
                'name' => ConfigInterface::CHATBOT_OPENROUTER_MODEL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_OPENROUTER_MODEL, 'openai/gpt-4o-mini'),
                'description' => 'OpenRouter model to use (e.g., openai/gpt-4o-mini, anthropic/claude-3-haiku)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'openai/gpt-4o-mini',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_OPENAI_API_KEY => [
                'name' => ConfigInterface::CHATBOT_OPENAI_API_KEY,
                'value' => $this->maskSensitiveSetting(ConfigInterface::CHATBOT_OPENAI_API_KEY, ''),
                'description' => 'OpenAI API key',
                'type' => 'password',
                'required' => false,
                'placeholder' => 'Enter API key to change',
                'sensitive' => true,
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_OPENAI_MODEL => [
                'name' => ConfigInterface::CHATBOT_OPENAI_MODEL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_OPENAI_MODEL, 'gpt-4o-mini'),
                'description' => 'OpenAI model to use (e.g., gpt-4o-mini, gpt-4o, gpt-3.5-turbo)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'gpt-4o-mini',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_OPENAI_BASE_URL => [
                'name' => ConfigInterface::CHATBOT_OPENAI_BASE_URL,
                'value' => $this->app->getConfig()->getSetting(
                    ConfigInterface::CHATBOT_OPENAI_BASE_URL,
                    'https://api.openai.com'
                ),
                'description' => 'OpenAI base URL (e.g., https://api.openai.com)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://api.openai.com',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_PERPLEXITY_API_KEY => [
                'name' => ConfigInterface::CHATBOT_PERPLEXITY_API_KEY,
                'value' => $this->maskSensitiveSetting(ConfigInterface::CHATBOT_PERPLEXITY_API_KEY, ''),
                'description' => 'Perplexity API key',
                'type' => 'password',
                'required' => false,
                'placeholder' => 'Enter API key to change',
                'validation' => 'string|max:255',
                'options' => [],
                'sensitive' => true,
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_PERPLEXITY_MODEL => [
                'name' => ConfigInterface::CHATBOT_PERPLEXITY_MODEL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_PERPLEXITY_MODEL, 'sonar-pro'),
                'description' => 'Perplexity model to use (e.g., sonar-pro, sonar-small-chat)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'sonar-pro',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_PERPLEXITY_BASE_URL => [
                'name' => ConfigInterface::CHATBOT_PERPLEXITY_BASE_URL,
                'value' => $this->app->getConfig()->getSetting(
                    ConfigInterface::CHATBOT_PERPLEXITY_BASE_URL,
                    'https://api.perplexity.ai'
                ),
                'description' => 'Perplexity base URL (e.g., https://api.perplexity.ai)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'https://api.perplexity.ai',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_SYSTEM_PROMPT => [
                'name' => ConfigInterface::CHATBOT_SYSTEM_PROMPT,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_SYSTEM_PROMPT, ''),
                'description' => 'System prompt to prepend to all messages (optional)',
                'type' => 'textarea',
                'required' => false,
                'placeholder' => 'You are a helpful assistant for FeatherPanel...',
                'validation' => 'string|max:1000',
                'max_length' => 1000,
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_USER_PROMPT => [
                'name' => ConfigInterface::CHATBOT_USER_PROMPT,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_USER_PROMPT, ''),
                'description' => 'User context prompt to append to all messages (optional)',
                'type' => 'textarea',
                'required' => false,
                'placeholder' => 'User is an admin with full access...',
                'validation' => 'string|max:1000',
                'max_length' => 1000,
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_OLLAMA_BASE_URL => [
                'name' => ConfigInterface::CHATBOT_OLLAMA_BASE_URL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_OLLAMA_BASE_URL, 'http://localhost:11434'),
                'description' => 'Ollama server base URL (e.g., http://localhost:11434)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'http://localhost:11434',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_OLLAMA_MODEL => [
                'name' => ConfigInterface::CHATBOT_OLLAMA_MODEL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_OLLAMA_MODEL, 'llama3.2'),
                'description' => 'Ollama model to use (e.g., llama3.2, mistral, codellama)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'llama3.2',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_GROK_API_KEY => [
                'name' => ConfigInterface::CHATBOT_GROK_API_KEY,
                'value' => $this->maskSensitiveSetting(ConfigInterface::CHATBOT_GROK_API_KEY, ''),
                'description' => 'xAI (Grok) API key',
                'type' => 'password',
                'required' => false,
                'placeholder' => 'xai-...',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::CHATBOT_GROK_MODEL => [
                'name' => ConfigInterface::CHATBOT_GROK_MODEL,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CHATBOT_GROK_MODEL, 'grok-2-1212'),
                'description' => 'xAI (Grok) model to use (e.g., grok-2-1212, grok-beta, grok-vision-beta)',
                'type' => 'text',
                'required' => false,
                'placeholder' => 'grok-2-1212',
                'validation' => 'string|max:255',
                'options' => [],
                'category' => 'chatbot',
            ],
            ConfigInterface::STATUS_PAGE_ENABLED => [
                'name' => ConfigInterface::STATUS_PAGE_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::STATUS_PAGE_ENABLED, 'false'),
                'description' => 'Enable the user-facing status page',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'status_page',
            ],
            ConfigInterface::STATUS_PAGE_SHOW_NODE_STATUS => [
                'name' => ConfigInterface::STATUS_PAGE_SHOW_NODE_STATUS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::STATUS_PAGE_SHOW_NODE_STATUS, 'true'),
                'description' => 'Show node status (healthy/unhealthy counts) on status page',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'status_page',
            ],
            ConfigInterface::STATUS_PAGE_SHOW_LOAD_USAGE => [
                'name' => ConfigInterface::STATUS_PAGE_SHOW_LOAD_USAGE,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::STATUS_PAGE_SHOW_LOAD_USAGE, 'true'),
                'description' => 'Show CPU, memory, and disk usage on status page',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'status_page',
            ],
            ConfigInterface::STATUS_PAGE_SHOW_TOTAL_SERVERS => [
                'name' => ConfigInterface::STATUS_PAGE_SHOW_TOTAL_SERVERS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::STATUS_PAGE_SHOW_TOTAL_SERVERS, 'true'),
                'description' => 'Show total server count on status page',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'status_page',
            ],
            ConfigInterface::STATUS_PAGE_SHOW_INDIVIDUAL_NODES => [
                'name' => ConfigInterface::STATUS_PAGE_SHOW_INDIVIDUAL_NODES,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::STATUS_PAGE_SHOW_INDIVIDUAL_NODES, 'false'),
                'description' => 'Show individual node details on status page',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'false',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'status_page',
            ],
            ConfigInterface::KNOWLEDGEBASE_ENABLED => [
                'name' => ConfigInterface::KNOWLEDGEBASE_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::KNOWLEDGEBASE_ENABLED, 'true'),
                'description' => 'Enable the knowledgebase feature for users',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'knowledgebase',
            ],
            ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES => [
                'name' => ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES, 'true'),
                'description' => 'Show category listings in knowledgebase',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'knowledgebase',
            ],
            ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES => [
                'name' => ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES, 'true'),
                'description' => 'Show article listings in knowledgebase',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'knowledgebase',
            ],
            ConfigInterface::KNOWLEDGEBASE_SHOW_ATTACHMENTS => [
                'name' => ConfigInterface::KNOWLEDGEBASE_SHOW_ATTACHMENTS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_ATTACHMENTS, 'true'),
                'description' => 'Show downloadable attachments in articles',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'knowledgebase',
            ],
            ConfigInterface::KNOWLEDGEBASE_SHOW_TAGS => [
                'name' => ConfigInterface::KNOWLEDGEBASE_SHOW_TAGS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::KNOWLEDGEBASE_SHOW_TAGS, 'true'),
                'description' => 'Show article tags in knowledgebase',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'knowledgebase',
            ],
            ConfigInterface::TICKET_SYSTEM_ENABLED => [
                'name' => ConfigInterface::TICKET_SYSTEM_ENABLED,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TICKET_SYSTEM_ENABLED, 'true'),
                'description' => 'Enable or disable the ticket system feature',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'ticket_system',
            ],
            ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS => [
                'name' => ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS, 'true'),
                'description' => 'Allow users to attach files to tickets',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'true',
                'validation' => 'required|string|max:255',
                'options' => ['true', 'false'],
                'category' => 'ticket_system',
            ],
            ConfigInterface::TICKET_SYSTEM_MAX_OPEN_TICKETS => [
                'name' => ConfigInterface::TICKET_SYSTEM_MAX_OPEN_TICKETS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::TICKET_SYSTEM_MAX_OPEN_TICKETS, '10'),
                'description' => 'Maximum number of open tickets a user can have at once (0 = unlimited)',
                'type' => 'number',
                'required' => true,
                'placeholder' => '10',
                'validation' => 'required|integer|min:0|max:1000',
                'options' => [],
                'category' => 'ticket_system',
            ],
            ConfigInterface::CUSTOM_JS => [
                'name' => ConfigInterface::CUSTOM_JS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CUSTOM_JS, '// dummy script - does nothing'),
                'description' => 'Custom JavaScript to inject into the page',
                'type' => 'textarea',
                'required' => false,
                'placeholder' => '// dummy script - does nothing',
                'validation' => 'string',
                'options' => [],
                'category' => 'other',
            ],
            ConfigInterface::CUSTOM_CSS => [
                'name' => ConfigInterface::CUSTOM_CSS,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CUSTOM_CSS, '/* dummy css - does nothing */'),
                'description' => 'Custom CSS to inject into the page',
                'type' => 'textarea',
                'required' => false,
                'placeholder' => '/* dummy css - does nothing */',
                'validation' => 'string',
                'options' => [],
                'category' => 'other',
            ],
            ConfigInterface::CACHE_DRIVER => [
                'name' => ConfigInterface::CACHE_DRIVER,
                'value' => $this->app->getConfig()->getSetting(ConfigInterface::CACHE_DRIVER, 'file'),
                'description' => 'Cache driver to use (file, redis) (redis is recommended for production) but redis can be unstable in some cases',
                'type' => 'select',
                'required' => true,
                'placeholder' => 'file',
                'validation' => 'required|string|max:255',
                'options' => ['file', 'redis'],
                'category' => 'other',
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

            // Get max length from setting config, default to 255
            $maxLength = $settingConfig['max_length'] ?? 255;
            if (!empty($value) && strlen($value) > $maxLength) {
                return ApiResponse::error("Setting {$setting} value is too long (max {$maxLength} characters)", 400);
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

    /**
     * Get the AI system prompt from the system-prompt.txt file.
     *
     * @param Request $request The HTTP request
     *
     * @return Response The HTTP response
     */
    #[OA\Get(
        path: '/api/admin/settings/chatbot/system-prompt',
        summary: 'Get AI system prompt',
        description: 'Retrieve the AI system prompt from the system-prompt.txt file.',
        tags: ['Admin - Settings'],
        responses: [
            new OA\Response(
                response: 200,
                description: 'System prompt retrieved successfully',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'system_prompt', type: 'string', description: 'The system prompt content'),
                    ]
                )
            ),
            new OA\Response(response: 401, description: 'Unauthorized - User not authenticated'),
            new OA\Response(response: 403, description: 'Forbidden - Admin access required'),
            new OA\Response(response: 404, description: 'Not found - System prompt file not found'),
            new OA\Response(response: 500, description: 'Internal server error - Failed to read system prompt'),
        ]
    )]
    public function getSystemPrompt(Request $request): Response
    {
        // Path relative to app directory: app/Services/Chatbot/system-prompt.txt
        // From app/Controllers/Admin/ we need to go up 2 levels to app/, then into Services/Chatbot/
        $systemPromptPath = __DIR__ . '/../../Services/Chatbot/system-prompt.txt';

        if (!file_exists($systemPromptPath)) {
            return ApiResponse::error('System prompt file not found', 'FILE_NOT_FOUND', 404);
        }

        $systemPrompt = file_get_contents($systemPromptPath);

        if ($systemPrompt === false) {
            return ApiResponse::error('Failed to read system prompt file', 'READ_ERROR', 500);
        }

        return ApiResponse::success([
            'system_prompt' => $systemPrompt,
        ]);
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
