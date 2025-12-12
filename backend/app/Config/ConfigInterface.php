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
     * Social Media Links.
     */
    public const LINKEDIN_URL = 'linkedin_url';
    public const TELEGRAM_URL = 'telegram_url';
    public const TIKTOK_URL = 'tiktok_url';
    public const TWITTER_URL = 'twitter_url';
    public const WHATSAPP_URL = 'whatsapp_url';
    public const YOUTUBE_URL = 'youtube_url';
    public const WEBSITE_URL = 'website_url';
    public const STATUS_PAGE_URL = 'status_page_url';
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
    public const SERVER_ALLOW_ALLOCATION_SELECT = 'server_allow_allocation_select';
    public const SERVER_ALLOW_USER_MADE_FIREWALL = 'server_allow_user_made_firewall';
    public const SERVER_ALLOW_USER_MADE_PROXY = 'server_allow_user_made_proxy';
    public const SERVER_PROXY_MAX_PER_SERVER = 'server_proxy_max_per_server';
    public const SERVER_ALLOW_CROSS_REALM_SPELL_CHANGE = 'server_allow_cross_realm_spell_change';

    /**
     * User Related Configs.
     */
    public const USER_ALLOW_AVATAR_CHANGE = 'user_allow_avatar_change';
    public const USER_ALLOW_USERNAME_CHANGE = 'user_allow_username_change';
    public const USER_ALLOW_EMAIL_CHANGE = 'user_allow_email_change';
    public const USER_ALLOW_FIRST_NAME_CHANGE = 'user_allow_first_name_change';
    public const USER_ALLOW_LAST_NAME_CHANGE = 'user_allow_last_name_change';
    public const USER_ALLOW_API_KEYS_CREATE = 'user_allow_api_keys_create';

    /**
     * Subdomain Manager Configs.
     */
    public const SUBDOMAIN_CF_EMAIL = 'subdomain_cf_email';
    public const SUBDOMAIN_CF_API_KEY = 'subdomain_cf_api_key';
    public const SUBDOMAIN_MAX_PER_SERVER = 'subdomain_max_per_server';

    /**
     * FeatherCloud access.
     */
    public const FEATHERCLOUD_ACCESS_PUBLIC_KEY = 'feathercloud_access_public_key';
    public const FEATHERCLOUD_ACCESS_PRIVATE_KEY = 'feathercloud_access_private_key';
    public const FEATHERCLOUD_ACCESS_LAST_ROTATED = 'feathercloud_access_last_rotated';
    public const FEATHERCLOUD_CLOUD_PUBLIC_KEY = 'feathercloud_cloud_public_key';
    public const FEATHERCLOUD_CLOUD_PRIVATE_KEY = 'feathercloud_cloud_private_key';
    public const FEATHERCLOUD_CLOUD_LAST_ROTATED = 'feathercloud_cloud_last_rotated';

    /**
     * Chatbot AI Settings.
     */
    public const CHATBOT_ENABLED = 'chatbot_enabled';
    public const CHATBOT_AI_PROVIDER = 'chatbot_ai_provider';
    public const CHATBOT_TEMPERATURE = 'chatbot_temperature';
    public const CHATBOT_MAX_TOKENS = 'chatbot_max_tokens';
    public const CHATBOT_MAX_HISTORY = 'chatbot_max_history';
    public const CHATBOT_GOOGLE_AI_API_KEY = 'chatbot_google_ai_api_key';
    public const CHATBOT_GOOGLE_AI_MODEL = 'chatbot_google_ai_model';
    public const CHATBOT_OPENROUTER_API_KEY = 'chatbot_openrouter_api_key';
    public const CHATBOT_OPENROUTER_MODEL = 'chatbot_openrouter_model';
    public const CHATBOT_OPENAI_API_KEY = 'chatbot_openai_api_key';
    public const CHATBOT_OPENAI_MODEL = 'chatbot_openai_model';
    public const CHATBOT_OPENAI_BASE_URL = 'chatbot_openai_base_url';
    public const CHATBOT_PERPLEXITY_API_KEY = 'chatbot_perplexity_api_key';
    public const CHATBOT_PERPLEXITY_MODEL = 'chatbot_perplexity_model';
    public const CHATBOT_PERPLEXITY_BASE_URL = 'chatbot_perplexity_base_url';
    public const CHATBOT_OLLAMA_BASE_URL = 'chatbot_ollama_base_url';
    public const CHATBOT_OLLAMA_MODEL = 'chatbot_ollama_model';
    public const CHATBOT_GROK_API_KEY = 'chatbot_grok_api_key';
    public const CHATBOT_GROK_MODEL = 'chatbot_grok_model';
    public const CHATBOT_SYSTEM_PROMPT = 'chatbot_system_prompt';
    public const CHATBOT_USER_PROMPT = 'chatbot_user_prompt';

    /**
     * Status Page Settings.
     */
    public const STATUS_PAGE_ENABLED = 'status_page_enabled';
    public const STATUS_PAGE_SHOW_NODE_STATUS = 'status_page_show_node_status';
    public const STATUS_PAGE_SHOW_LOAD_USAGE = 'status_page_show_load_usage';
    public const STATUS_PAGE_SHOW_TOTAL_SERVERS = 'status_page_show_total_servers';
    public const STATUS_PAGE_SHOW_INDIVIDUAL_NODES = 'status_page_show_individual_nodes';

    /**
     * Knowledgebase Settings.
     */
    public const KNOWLEDGEBASE_ENABLED = 'knowledgebase_enabled';
    public const KNOWLEDGEBASE_SHOW_CATEGORIES = 'knowledgebase_show_categories';
    public const KNOWLEDGEBASE_SHOW_ARTICLES = 'knowledgebase_show_articles';
    public const KNOWLEDGEBASE_SHOW_ATTACHMENTS = 'knowledgebase_show_attachments';
    public const KNOWLEDGEBASE_SHOW_TAGS = 'knowledgebase_show_tags';

    /**
     * Ticket System Settings.
     */
    public const TICKET_SYSTEM_ENABLED = 'ticket_system_enabled';
    public const TICKET_SYSTEM_ALLOW_ATTACHMENTS = 'ticket_system_allow_attachments';
    public const TICKET_SYSTEM_MAX_OPEN_TICKETS = 'ticket_system_max_open_tickets';

    /**
     * Custom JS/CSS.
     */
    public const CUSTOM_JS = 'custom_js';
    public const CUSTOM_CSS = 'custom_css';

    /**
     * Cache Driver.
     */
    public const CACHE_DRIVER = 'cache_driver'; // file, redis
}
