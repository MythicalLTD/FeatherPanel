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

namespace App\Config;

interface ConfigInterface
{
    /**
     * App.
     */
    public const APP_NAME = 'app_name';
    public const APP_URL = 'app_url';
    public const APP_DEVELOPER_MODE = 'app_developer_mode';
    public const APP_TIMEZONE = 'app_timezone';
    public const APP_LOGO_WHITE = 'app_logo_white';
    public const APP_LOGO_DARK = 'app_logo_dark';
    public const APP_SUPPORT_URL = 'app_support_url';
    /**
     * Turnstile.
     */
    public const TURNSTILE_ENABLED = 'turnstile_enabled';
    public const TURNSTILE_KEY_PUB = 'turnstile_key_pub';
    public const TURNSTILE_KEY_PRIV = 'turnstile_key_priv';
    /**
     * SMTP.
     */
    public const SMTP_ENABLED = 'smtp_enabled';
    public const SMTP_HOST = 'smtp_host';
    public const SMTP_PORT = 'smtp_port';
    public const SMTP_USER = 'smtp_user';
    public const SMTP_PASS = 'smtp_pass';
    public const SMTP_FROM = 'smtp_from';
    public const SMTP_ENCRYPTION = 'smtp_encryption';
    /**
     * Legal Values.
     */
    public const LEGAL_TOS = 'legal_tos';
    public const LEGAL_PRIVACY = 'legal_privacy';
    /**
     * Registration.
     */
    public const REGISTRATION_ENABLED = 'registration_enabled';
    public const REQUIRE_TWO_FA_ADMINS = 'require_two_fa_admins';
    /**
     * Telemetry.
     */
    public const TELEMETRY = 'telemetry';

    /**
     * Discord OAuth.
     */
    public const DISCORD_OAUTH_ENABLED = 'discord_oauth_enabled';
    public const DISCORD_OAUTH_CLIENT_ID = 'discord_oauth_client_id';
    public const DISCORD_OAUTH_CLIENT_SECRET = 'discord_oauth_client_secret';

    /**
     * Servers Related Configs.
     */
    public const SERVER_ALLOW_EGG_CHANGE = 'server_allow_egg_change';
    public const SERVER_ALLOW_STARTUP_CHANGE = 'server_allow_startup_change';
    public const SERVER_ALLOW_SUBUSERS = 'server_allow_subusers';
    public const SERVER_ALLOW_SCHEDULES = 'server_allow_schedules';

    /**
     * User Related Configs.
     */
    public const USER_ALLOW_AVATAR_CHANGE = 'user_allow_avatar_change';

    /**
     * Subdomain Manager Configs.
     */
    public const SUBDOMAIN_CF_EMAIL = 'subdomain_cf_email';
    public const SUBDOMAIN_CF_API_KEY = 'subdomain_cf_api_key';
    public const SUBDOMAIN_MAX_PER_SERVER = 'subdomain_max_per_server';
}
