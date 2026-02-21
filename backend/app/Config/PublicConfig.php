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

namespace App\Config;

class PublicConfig extends ConfigFactory
{
    /**
     * ⚠️ DANGER ZONE - HANDLE WITH EXTREME CAUTION ⚠️.
     *
     * This is a critical configuration section that defines default values for public settings.
     * Any changes made here will affect the entire application's behavior.
     *
     * IMPORTANT SECURITY CONSIDERATIONS:
     * - This is the ONLY place where default values should be modified
     * - All values defined here are PUBLIC and accessible from the frontend
     * - These values are visible to ALL users of the application
     * - The data is also collected and sent to telemetry services
     *
     * NEVER add sensitive information such as:
     * - API keys or tokens
     * - Passwords or credentials
     * - Private configuration values
     * - Internal system details
     *
     * Any sensitive data added here will be exposed publicly and could lead to
     * security vulnerabilities. Always use proper secure storage for sensitive values.
     *
     * @return array An array of public configuration defaults
     */
    public static function getPublicSettingsWithDefaults(): array
    {
        // Define settings configuration with defaults
        return [
            // App settings
            ConfigInterface::APP_NAME => 'FeatherPanel',
            ConfigInterface::APP_URL => 'https://featherpanel.mythical.systems',
            ConfigInterface::APP_DEVELOPER_MODE => 'false',
            ConfigInterface::APP_TIMEZONE => 'UTC',
            ConfigInterface::APP_LOGO_WHITE => 'https://github.com/featherpanel-com.png',
            ConfigInterface::APP_LOGO_DARK => 'https://github.com/featherpanel-com.png',

            ConfigInterface::APP_SUPPORT_URL => 'https://discord.mythical.systems',

            // SEO Settings
            ConfigInterface::APP_SEO_TITLE => 'FeatherPanel',
            ConfigInterface::APP_SEO_DESCRIPTION => 'A powerful game server management panel.',
            ConfigInterface::APP_SEO_KEYWORDS => 'game, server, management, panel, hosting',

            // PWA Settings
            ConfigInterface::APP_PWA_ENABLED => 'false',
            ConfigInterface::APP_PWA_SHORT_NAME => 'FeatherPanel',
            ConfigInterface::APP_PWA_DESCRIPTION => 'Manage your game servers on the go.',
            ConfigInterface::APP_PWA_THEME_COLOR => '#000000',
            ConfigInterface::APP_PWA_BG_COLOR => '#ffffff',

            // Social Media Links
            ConfigInterface::LINKEDIN_URL => '',
            ConfigInterface::TELEGRAM_URL => '',
            ConfigInterface::TIKTOK_URL => '',
            ConfigInterface::TWITTER_URL => '',
            ConfigInterface::WHATSAPP_URL => '',
            ConfigInterface::YOUTUBE_URL => '',
            ConfigInterface::WEBSITE_URL => '',
            ConfigInterface::STATUS_PAGE_URL => '',

            // Turnstile settings
            ConfigInterface::TURNSTILE_ENABLED => 'false',
            ConfigInterface::TURNSTILE_KEY_PUB => 'XXXX',

            // Legal links
            ConfigInterface::LEGAL_TOS => '/tos',
            ConfigInterface::LEGAL_PRIVACY => '/privacy',

            // Email settings
            ConfigInterface::SMTP_ENABLED => 'false',
            ConfigInterface::REGISTRATION_ENABLED => 'true',
            ConfigInterface::REQUIRE_TWO_FA_ADMINS => 'false',

            // Telemetry settings
            ConfigInterface::TELEMETRY => 'true',

            // Discord OAuth settings
            ConfigInterface::DISCORD_OAUTH_ENABLED => 'false',
            ConfigInterface::DISCORD_OAUTH_CLIENT_ID => 'XXXX',

            // Servers related settings
            ConfigInterface::SERVER_ALLOW_EGG_CHANGE => 'false',
            ConfigInterface::SERVER_ALLOW_STARTUP_CHANGE => 'true',
            ConfigInterface::SERVER_ALLOW_SUBUSERS => 'true',
            ConfigInterface::SERVER_ALLOW_SCHEDULES => 'true',
            ConfigInterface::SERVER_ALLOW_ALLOCATION_SELECT => 'false',
            ConfigInterface::SERVER_ALLOW_USER_MADE_FIREWALL => 'false',
            ConfigInterface::SERVER_ALLOW_USER_MADE_PROXY => 'false',
            ConfigInterface::SERVER_PROXY_MAX_PER_SERVER => '5',
            ConfigInterface::SERVER_ALLOW_USER_SERVER_DELETION => 'false',
            ConfigInterface::SERVER_ALLOW_CROSS_REALM_SPELL_CHANGE => 'false',
            ConfigInterface::SERVER_ALLOW_USER_MADE_IMPORT => 'false',
            ConfigInterface::SERVER_ALLOW_USER_MADE_FASTDL => 'false',

            // User related settings
            ConfigInterface::USER_ALLOW_AVATAR_CHANGE => 'true',
            ConfigInterface::USER_ALLOW_USERNAME_CHANGE => 'true',
            ConfigInterface::USER_ALLOW_EMAIL_CHANGE => 'true',
            ConfigInterface::USER_ALLOW_FIRST_NAME_CHANGE => 'true',
            ConfigInterface::USER_ALLOW_LAST_NAME_CHANGE => 'true',
            ConfigInterface::USER_ALLOW_API_KEYS_CREATE => 'true',

            // Chatbot related settings
            ConfigInterface::CHATBOT_ENABLED => 'false',
            ConfigInterface::CHATBOT_AI_PROVIDER => 'basic',
            ConfigInterface::CHATBOT_TEMPERATURE => '0.7',
            ConfigInterface::CHATBOT_MAX_TOKENS => '2048',
            ConfigInterface::CHATBOT_MAX_HISTORY => '10',

            // Status page settings
            ConfigInterface::STATUS_PAGE_ENABLED => 'false',

            // Knowledgebase settings
            ConfigInterface::KNOWLEDGEBASE_ENABLED => 'true',
            ConfigInterface::KNOWLEDGEBASE_SHOW_CATEGORIES => 'true',
            ConfigInterface::KNOWLEDGEBASE_SHOW_ARTICLES => 'true',
            ConfigInterface::KNOWLEDGEBASE_SHOW_ATTACHMENTS => 'true',
            ConfigInterface::KNOWLEDGEBASE_SHOW_TAGS => 'true',

            // Ticket system settings
            ConfigInterface::TICKET_SYSTEM_ENABLED => 'true',
            ConfigInterface::TICKET_SYSTEM_ALLOW_ATTACHMENTS => 'true',
            ConfigInterface::TICKET_SYSTEM_MAX_OPEN_TICKETS => '10',

            // Custom JS/CSS settings
            ConfigInterface::CUSTOM_JS => '// dummy script - does nothing',
            ConfigInterface::CUSTOM_CSS => '/* dummy css - does nothing */',

            // Cache driver settings
            ConfigInterface::CACHE_DRIVER => 'file',
        ];
    }
}
