/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
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
    server_allow_user_made_fastdl: string;
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
    app_seo_indexing?: string;
    app_pwa_enabled: string;
    app_pwa_short_name: string;
    app_pwa_description: string;
    app_pwa_theme_color: string;
    app_pwa_bg_color: string;
    /** Optional: default background image URL for all users (used as a starting point, users can still customize unless locked). */
    app_background_image_url?: string;
    /** When 'true', force the configured background image URL for all users. */
    app_background_lock?: string;
    /** Optional default accent color (purple, blue, etc.). */
    app_accent_color_default?: string;
    /** When 'true', force the configured accent color for all users. */
    app_accent_color_lock?: string;
    /** Optional default theme (light or dark). */
    app_theme_default?: string;
    /** When 'true', force the configured theme for all users. */
    app_theme_lock?: string;
    /** Optional default background type (aurora, gradient, solid, image, pattern). */
    app_background_type_default?: string;
    /** When 'true', force the configured background type for all users. */
    app_background_type_lock?: string;
    /** Optional default backdrop blur in pixels (0–24). */
    app_backdrop_blur_default?: string;
    /** When 'true', force the configured backdrop blur for all users. */
    app_backdrop_blur_lock?: string;
    /** Optional default backdrop darken in percent (0–100). */
    app_backdrop_darken_default?: string;
    /** When 'true', force the configured backdrop darken for all users. */
    app_backdrop_darken_lock?: string;
    /** Optional default background image fit (cover, contain, fill). */
    app_background_image_fit_default?: string;
    /** When 'true', force the configured background image fit for all users. */
    app_background_image_fit_lock?: string;
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
