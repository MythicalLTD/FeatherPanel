/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

export interface AppSettings {
    app_developer_mode: string;
    app_name: string;
    app_timezone: string;
    cache_driver: string;
    chatbot_ai_provider: string;
    chatbot_enabled: string;
    knowledgebase_enabled: string;
    server_allow_allocation_select: string;
    server_allow_egg_change: string;
    server_allow_user_made_firewall: string;
    server_allow_user_made_import: string;
    server_allow_user_made_proxy: string;
    server_allow_user_server_deletion: string;
    smtp_enabled: string;
    status_page_enabled: string;
    ticket_system_enabled: string;
    turnstile_enabled: string;
    turnstile_key_pub: string;
    app_url: string;
    app_logo_white: string;
    app_logo_dark: string;
    app_support_url: string;
    linkedin_url: string;
    telegram_url: string;
    tiktok_url: string;
    twitter_url: string;
    whatsapp_url: string;
    youtube_url: string;
    website_url: string;
    status_page_url: string;
    legal_tos: string;
    legal_privacy: string;
    registration_enabled: string;
    require_two_fa_admins: string;
    telemetry: string;
    discord_oauth_enabled: string;
    discord_oauth_client_id: string;
    server_allow_startup_change: string;
    server_allow_subusers: string;
    server_allow_schedules: string;
    server_proxy_max_per_server: string;
    server_allow_cross_realm_spell_change: string;
    user_allow_avatar_change: string;
    user_allow_username_change: string;
    user_allow_email_change: string;
    user_allow_first_name_change: string;
    user_allow_last_name_change: string;
    user_allow_api_keys_create: string;
    chatbot_temperature: string;
    chatbot_max_tokens: string;
    chatbot_max_history: string;
    knowledgebase_show_categories: string;
    knowledgebase_show_articles: string;
    knowledgebase_show_attachments: string;
    knowledgebase_show_tags: string;
    ticket_system_allow_attachments: string;
    ticket_system_max_open_tickets: string;
    custom_js: string;
    custom_css: string;
    app_version: string;
    app_seo_title: string;
    app_seo_description: string;
    app_seo_keywords: string;
    app_pwa_enabled: string;
    app_pwa_short_name: string;
    app_pwa_description: string;
    app_pwa_theme_color: string;
    app_pwa_bg_color: string;
}

export interface CoreInfo {
    version: string;
    upstream: string;
    os: string;
    php_version: string;
    server_software: string;
    server_name: string;
    kernel: string;
    os_name: string;
    hostname: string;
    telemetry: boolean;
    startup: string;
    request_id: string;
}

export interface SettingsResponse {
    success: boolean;
    message: string;
    data: {
        settings: AppSettings;
        core: CoreInfo;
    };
    error: boolean;
    error_message: string | null;
    error_code: string | null;
}
