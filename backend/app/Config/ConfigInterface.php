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

interface ConfigInterface
{
    /**
     * App.
     */
    public const APP_NAME = 'app_name';
    public const APP_URL = 'app_url';
    /**
     * Optional URL Wings uses for panel callbacks (SFTP auth, remote APIs).
     * Use a DNS-only / non-proxied hostname when Cloudflare Precursor Maximize Security
     * or Under Attack Mode blocks machine clients hitting APP_URL. Empty = use APP_URL.
     * Must match JWT issuer claims sent to Wings; re-fetch node config after changing.
     */
    public const WINGS_REMOTE_URL = 'wings_remote_url';
    public const APP_DEVELOPER_MODE = 'app_developer_mode';
    public const APP_TIMEZONE = 'app_timezone';
    public const APP_LOGO_WHITE = 'app_logo_white';
    public const APP_LOGO_DARK = 'app_logo_dark';
    public const APP_SUPPORT_URL = 'app_support_url';
    public const APP_SSO_REDIRECT_PATH = 'app_sso_redirect_path';
    /** Default SSO login token lifetime in minutes (admin-generated tokens). */
    public const APP_SSO_TOKEN_LIFETIME_MINUTES = 'app_sso_token_lifetime_minutes';
    /** When true, VNC wss_url is built from APP_URL so the browser connects to the panel; reverse proxy must forward /vnc-proxy/ to Proxmox. */
    public const VNC_PROXY_VIA_PANEL = 'vnc_proxy_via_panel';
    /** When true, create a short-lived PVE user, grant console ACL, get ticket and return pve_redirect_url so the frontend can open Proxmox noVNC in the browser. */
    public const VNC_USE_PVE_REDIRECT = 'vnc_use_pve_redirect';
    /**
     * Appearance / Branding.
     *
     * These are safe to expose publicly and control high-level UI defaults.
     */
    public const APP_BACKGROUND_IMAGE_URL = 'app_background_image_url';
    public const APP_BACKGROUND_LOCK = 'app_background_lock';
    public const APP_ACCENT_COLOR_DEFAULT = 'app_accent_color_default';
    public const APP_ACCENT_COLOR_LOCK = 'app_accent_color_lock';
    public const APP_THEME_DEFAULT = 'app_theme_default';
    public const APP_THEME_LOCK = 'app_theme_lock';
    public const APP_BACKGROUND_TYPE_DEFAULT = 'app_background_type_default';
    public const APP_BACKGROUND_TYPE_LOCK = 'app_background_type_lock';
    /** When false, hide FeatherPanel "powered by" branding (FeatherPanel Premium / Mythic entitlement). */
    public const BRANDING_SHOW_POWERED_BY = 'branding_show_powered_by';
    /** When false, hide the panel version badge in the sidebar (FeatherPanel Premium / Mythic entitlement). */
    public const BRANDING_SHOW_VERSION = 'branding_show_version';
    public const APP_BACKDROP_BLUR_DEFAULT = 'app_backdrop_blur_default';
    public const APP_BACKDROP_BLUR_LOCK = 'app_backdrop_blur_lock';
    public const APP_BACKDROP_DARKEN_DEFAULT = 'app_backdrop_darken_default';
    public const APP_BACKDROP_DARKEN_LOCK = 'app_backdrop_darken_lock';
    public const APP_BACKGROUND_IMAGE_FIT_DEFAULT = 'app_background_image_fit_default';
    public const APP_BACKGROUND_IMAGE_FIT_LOCK = 'app_background_image_fit_lock';
    /**
     * Social Media Links.
     */
    public const LINKEDIN_URL = 'linkedin_url';
    public const TELEGRAM_URL = 'telegram_url';
    public const TIKTOK_URL = 'tiktok_url';
    public const TWITTER_URL = 'twitter_url';
    public const WHATSAPP_URL = 'whatsapp_url';
    public const YOUTUBE_URL = 'youtube_url';
    public const DISCORD_URL = 'discord_url';
    public const WEBSITE_URL = 'website_url';
    public const STATUS_PAGE_URL = 'status_page_url';
    /**
     * Captcha Settings.
     */
    public const CAPTCHA_PROVIDER = 'captcha_provider'; // turnstile, hcaptcha, recaptcha, friendlycaptcha, reforge
    public const TURNSTILE_ENABLED = 'turnstile_enabled';
    public const TURNSTILE_KEY_PUB = 'turnstile_key_pub';
    public const TURNSTILE_KEY_PRIV = 'turnstile_key_priv';
    public const HCAPTCHA_SITE_KEY = 'hcaptcha_site_key';
    public const HCAPTCHA_SECRET_KEY = 'hcaptcha_secret_key';
    public const RECAPTCHA_SITE_KEY = 'recaptcha_site_key';
    public const RECAPTCHA_SECRET_KEY = 'recaptcha_secret_key';
    /** reCAPTCHA widget type: v2 (checkbox) or v3 (score). */
    public const RECAPTCHA_VERSION = 'recaptcha_version';
    /** Minimum v3 score (0.0–1.0); ignored for v2. */
    public const RECAPTCHA_V3_MIN_SCORE = 'recaptcha_v3_min_score';
    /** v3 action name sent to Google (must match frontend execute action). */
    public const RECAPTCHA_V3_ACTION = 'recaptcha_v3_action';
    public const FRIENDLY_CAPTCHA_SITE_KEY = 'friendly_captcha_site_key';
    public const FRIENDLY_CAPTCHA_SECRET_KEY = 'friendly_captcha_secret_key';
    /** reForge Captcha (https://reforgecaptcha.cloud/) public site key. */
    public const REFORGE_CAPTCHA_SITE_KEY = 'reforge_captcha_site_key';
    /** reForge Captcha secret key (server-side verify only). */
    public const REFORGE_CAPTCHA_SECRET_KEY = 'reforge_captcha_secret_key';
    /** Widget type: checkbox, invisible, managed, image. */
    public const REFORGE_CAPTCHA_WIDGET_TYPE = 'reforge_captcha_widget_type';
    /** Theme: auto, dark, light. */
    public const REFORGE_CAPTCHA_THEME = 'reforge_captcha_theme';
    /** Size: normal, compact. */
    public const REFORGE_CAPTCHA_SIZE = 'reforge_captcha_size';
    /** Optional UI language (e.g. en, nl, de). Empty = widget default. */
    public const REFORGE_CAPTCHA_LANG = 'reforge_captcha_lang';
    /** Minimum verify score (0.0–1.0) when the API returns a score; extra check after success. */
    public const REFORGE_CAPTCHA_MIN_SCORE = 'reforge_captcha_min_score';
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
    public const REGISTRATION_REQUIRE_EMAIL_VERIFICATION = 'registration_require_email_verification';
    /** Limit how many panel accounts may register from the same browser/device fingerprint. */
    public const REGISTRATION_DEVICE_LIMIT_ENABLED = 'registration_device_limit_enabled';
    public const REGISTRATION_DEVICE_MAX_ACCOUNTS = 'registration_device_max_accounts';
    /** When true, reject registration/email changes whose domain matches featherpanel_blocked_email_domains (admin-managed). */
    public const EMAIL_DOMAIN_BLOCKING_ENABLED = 'email_domain_blocking_enabled';
    public const REQUIRE_TWO_FA_ADMINS = 'require_two_fa_admins';

    /**
     * AbuseIPDB (https://docs.abuseipdb.com/).
     */
    public const ABUSEIPDB_ENABLED = 'abuseipdb_enabled';
    public const ABUSEIPDB_API_KEY = 'abuseipdb_api_key';
    public const ABUSEIPDB_CHECK_ON_REGISTER = 'abuseipdb_check_on_register';
    /** Minimum abuseConfidenceScore (0-100) to treat an IP as reported. */
    public const ABUSEIPDB_MIN_CONFIDENCE_SCORE = 'abuseipdb_min_confidence_score';
    /** How far back (days) to consider reports when checking an IP. */
    public const ABUSEIPDB_MAX_AGE_DAYS = 'abuseipdb_max_age_days';
    /** What to do when a registering IP meets the score threshold: block | log | auto_ban */
    public const ABUSEIPDB_REGISTER_ACTION = 'abuseipdb_register_action';

    /**
     * Email Login (Passwordless authentication with 6-digit OTP).
     */
    public const EMAIL_LOGIN_ENABLED = 'email_login_enabled';

    /**
     * Login page layout (public settings exposed via PublicConfig).
     *
     * login_default_method: local | ldap | email_code | discord | oidc
     * login_methods_order: comma-separated method ids (see frontend loginPageConfig)
     * login_hidden_methods: comma-separated method ids to hide on the login page
     */
    public const LOGIN_DEFAULT_METHOD = 'login_default_method';
    public const LOGIN_METHODS_ORDER = 'login_methods_order';
    public const LOGIN_HIDDEN_METHODS = 'login_hidden_methods';

    /**
     * Telemetry.
     */
    public const TELEMETRY = 'telemetry';

    /**
     * SEO Settings.
     */
    public const APP_SEO_TITLE = 'app_seo_title';
    public const APP_SEO_DESCRIPTION = 'app_seo_description';
    public const APP_SEO_KEYWORDS = 'app_seo_keywords';
    public const APP_SEO_INDEXING = 'app_seo_indexing';

    /**
     * PWA Settings.
     */
    public const APP_PWA_ENABLED = 'app_pwa_enabled';
    public const APP_PWA_SHORT_NAME = 'app_pwa_short_name';
    public const APP_PWA_DESCRIPTION = 'app_pwa_description';
    public const APP_PWA_THEME_COLOR = 'app_pwa_theme_color';
    public const APP_PWA_BG_COLOR = 'app_pwa_bg_color';

    /**
     * Discord OAuth.
     */
    public const DISCORD_OAUTH_ENABLED = 'discord_oauth_enabled';
    public const DISCORD_OAUTH_CLIENT_ID = 'discord_oauth_client_id';
    public const DISCORD_OAUTH_CLIENT_SECRET = 'discord_oauth_client_secret';

    /**
     * OpenID Connect (OIDC) - generic SSO provider.
     *
     * These settings allow configuring a single OIDC provider in a
     * provider-agnostic way (Keycloak, Authentik, Azure AD, etc.).
     */
    public const OIDC_ENABLED = 'oidc_enabled';
    public const OIDC_PROVIDER_NAME = 'oidc_provider_name';
    public const OIDC_ISSUER_URL = 'oidc_issuer_url';
    public const OIDC_CLIENT_ID = 'oidc_client_id';
    public const OIDC_CLIENT_SECRET = 'oidc_client_secret';
    public const OIDC_SCOPES = 'oidc_scopes';
    public const OIDC_AUTO_PROVISION = 'oidc_auto_provision';
    public const OIDC_REQUIRE_EMAIL_VERIFIED = 'oidc_require_email_verified';
    public const OIDC_EMAIL_CLAIM = 'oidc_email_claim';
    public const OIDC_SUBJECT_CLAIM = 'oidc_subject_claim';
    public const OIDC_ALLOWED_GROUP_CLAIM = 'oidc_allowed_group_claim';
    public const OIDC_ALLOWED_GROUP_VALUE = 'oidc_allowed_group_value';
    public const OIDC_DISABLE_LOCAL_LOGIN = 'oidc_disable_local_login';

    /**
     * Servers Related Configs.
     */
    public const SERVER_ALLOW_EGG_CHANGE = 'server_allow_egg_change';
    public const SERVER_ALLOW_USER_SERVER_DELETION = 'server_allow_user_server_deletion';
    public const SERVER_ALLOW_STARTUP_CHANGE = 'server_allow_startup_change';
    /** When true, users may enter a custom Docker image string; otherwise only spell-listed images are allowed. */
    public const SERVER_ALLOW_CUSTOM_DOCKER_IMAGE = 'server_allow_custom_docker_image';
    public const SERVER_ALLOW_SUBUSERS = 'server_allow_subusers';
    public const SERVER_ALLOW_SCHEDULES = 'server_allow_schedules';
    /**
     * Wings server backups and VM instance backups: hard_limit blocks new backups at the limit;
     * fifo_rolling deletes the oldest eligible backup to make room.
     */
    public const SERVER_BACKUP_RETENTION_MODE = 'server_backup_retention_mode';
    /** When true, server owners may change backup_limit and backup_retention_mode via the user API. */
    public const SERVER_ALLOW_USER_BACKUP_POLICY_EDIT = 'server_allow_user_backup_policy_edit';
    public const SERVER_ALLOW_ALLOCATION_SELECT = 'server_allow_allocation_select';
    public const SERVER_ALLOW_USER_MADE_FIREWALL = 'server_allow_user_made_firewall';
    public const SERVER_ALLOW_USER_MADE_PROXY = 'server_allow_user_made_proxy';
    public const SERVER_PROXY_MAX_PER_SERVER = 'server_proxy_max_per_server';
    public const SERVER_ALLOW_CROSS_REALM_SPELL_CHANGE = 'server_allow_cross_realm_spell_change';
    public const SERVER_ALLOW_USER_MADE_IMPORT = 'server_allow_user_made_import';
    public const SERVER_ALLOW_USER_MADE_FASTDL = 'server_allow_user_made_fastdl';
    public const SERVER_ALLOW_USER_MADE_SUBDOMAINS = 'server_allow_user_made_subdomains';
    public const SERVER_HIDE_IPS = 'server_hide_ips';
    /** When false, lifecycle hook UI and execution are disabled (default off until enabled by an administrator). */
    public const SERVER_LIFECYCLE_HOOKS_ENABLED = 'server_lifecycle_hooks_enabled';
    /**
     * When false, the lifecycle Container Shell (docker exec) step type cannot be created/updated
     * and will not execute. Default off docker exec is a security-sensitive capability.
     */
    public const SERVER_LIFECYCLE_HOOKS_CONTAINER_SHELL_ENABLED = 'server_lifecycle_hooks_container_shell_enabled';

    /**
     * File trash bin (soft-delete via FeatherWings).
     */
    public const FILE_TRASH_ENABLED = 'file_trash_enabled';
    /** Maximum total size of trashed files per server, in megabytes (0 = unlimited). */
    public const FILE_TRASH_MAX_SIZE_MB = 'file_trash_max_size_mb';
    /** Automatically purge trashed files older than this many days (0 = never by age). */
    public const FILE_TRASH_RETENTION_DAYS = 'file_trash_retention_days';

    /**
     * User Related Configs.
     */
    /** Default avatar provider: gravatar, panel_logo, ui_avatars, robohash, dicebear, custom */
    public const AVATAR_PROVIDER = 'avatar_provider';
    /** Custom avatar URL template (only when avatar_provider is custom). Placeholders: {email}, {username}, {name}, {hash}, {app_url} */
    public const AVATAR_CUSTOM_URL = 'avatar_custom_url';
    public const USER_ALLOW_AVATAR_CHANGE = 'user_allow_avatar_change';
    public const USER_ALLOW_USERNAME_CHANGE = 'user_allow_username_change';
    public const USER_ALLOW_EMAIL_CHANGE = 'user_allow_email_change';
    public const USER_ALLOW_FIRST_NAME_CHANGE = 'user_allow_first_name_change';
    public const USER_ALLOW_LAST_NAME_CHANGE = 'user_allow_last_name_change';
    public const USER_ALLOW_API_KEYS_CREATE = 'user_allow_api_keys_create';
    /** Allow users to permanently delete their own account */
    public const USER_ALLOW_ACCOUNT_DELETION = 'user_allow_account_deletion';
    /** How deletions are processed: instant, delayed, after_services */
    public const USER_ACCOUNT_DELETION_MODE = 'user_account_deletion_mode';
    /** Days to wait before hard-deleting when mode is delayed */
    public const USER_ACCOUNT_DELETION_DELAY_DAYS = 'user_account_deletion_delay_days';
    /** Require TOTP 2FA verification for self-service deletion */
    public const USER_ACCOUNT_DELETION_VERIFY_2FA = 'user_account_deletion_verify_2fa';
    /** Require email OTP verification for self-service deletion */
    public const USER_ACCOUNT_DELETION_VERIFY_EMAIL_OTP = 'user_account_deletion_verify_email_otp';

    /**
     * Subdomain Manager Configs.
     */
    public const SUBDOMAIN_CF_EMAIL = 'subdomain_cf_email';
    public const SUBDOMAIN_CF_API_KEY = 'subdomain_cf_api_key';
    public const SUBDOMAIN_MAX_PER_SERVER = 'subdomain_max_per_server';

    /**
     * FeatherCloud / Mythic Panel API access.
     *
     * CLOUD_* = panel identity keys (FCPUB-/FCPRIV-) used as X-Panel-* when calling panels.mythicalsystems.org
     * ACCESS_* = Mythic-issued callback keys (cloud_api_key/secret) for Mythic → panel auth
     */
    public const FEATHERCLOUD_ACCESS_PUBLIC_KEY = 'feathercloud_access_public_key';
    public const FEATHERCLOUD_ACCESS_PRIVATE_KEY = 'feathercloud_access_private_key';
    public const FEATHERCLOUD_ACCESS_LAST_ROTATED = 'feathercloud_access_last_rotated';
    public const FEATHERCLOUD_CLOUD_PUBLIC_KEY = 'feathercloud_cloud_public_key';
    public const FEATHERCLOUD_CLOUD_PRIVATE_KEY = 'feathercloud_cloud_private_key';
    public const FEATHERCLOUD_CLOUD_LAST_ROTATED = 'feathercloud_cloud_last_rotated';
    /** Mythic Panel API base (prod: https://panels.mythicalsystems.org, dev: https://panels-dev.mythicalsystems.org) */
    public const FEATHERCLOUD_API_BASE_URL = 'feathercloud_api_base_url';
    /** Mythic OAuth link page (https://my.mythicalsystems.org/oauth2) not www, not panels */
    public const FEATHERCLOUD_OAUTH_URL = 'feathercloud_oauth_url';
    /** @deprecated Use FEATHERCLOUD_MEMBER_MAP / authorizer settings never collect this in UI */
    public const FEATHERCLOUD_MEMBER_USER_UUID = 'feathercloud_member_user_uuid';
    /** Linked Mythic team uuid from OAuth / handshake */
    public const FEATHERCLOUD_TEAM_UUID = 'feathercloud_team_uuid';
    /** Mythic numeric user id of the admin who authorized the OAuth link */
    public const FEATHERCLOUD_AUTHORIZER_MYTHIC_USER_ID = 'feathercloud_authorizer_mythic_user_id';
    /** FeatherPanel user uuid of the admin who completed OAuth */
    public const FEATHERCLOUD_AUTHORIZER_FEATHER_UUID = 'feathercloud_authorizer_feather_uuid';
    /** JSON map: { by_email: {}, by_feather_uuid: {}, synced_at } for X-Panel-User-Uuid */
    public const FEATHERCLOUD_MEMBER_MAP = 'feathercloud_member_map';
    /** ISO timestamp when OAuth finish successfully linked Mythic */
    public const FEATHERCLOUD_LINKED_AT = 'feathercloud_linked_at';
    /** ISO timestamp when an admin intentionally started an OAuth relink flow */
    public const FEATHERCLOUD_RELINK_PENDING_AT = 'feathercloud_relink_pending_at';
    public const FEATHERCLOUD_CLOUD_ID = 'feathercloud_cloud_id';
    public const FEATHERCLOUD_CLOUD_NAME = 'feathercloud_cloud_name';
    public const FEATHERCLOUD_TEAM_NAME = 'feathercloud_team_name';
    public const FEATHERCLOUD_TEAM_SLUG = 'feathercloud_team_slug';
    public const FEATHERCLOUD_AUTHORIZER_EMAIL = 'feathercloud_authorizer_email';
    public const FEATHERCLOUD_AUTHORIZER_NAME = 'feathercloud_authorizer_name';
    public const FEATHERCLOUD_MARKETPLACE_ENABLED = 'feathercloud_marketplace_enabled';
    public const FEATHERCLOUD_EGGS_ENABLED = 'feathercloud_eggs_enabled';
    /** Mythic Eggs API base (prod: https://eggs.mythicalsystems.org, dev: https://eggs-dev.mythicalsystems.org) */
    public const FEATHERCLOUD_EGGS_BASE_URL = 'feathercloud_eggs_base_url';
    public const FEATHERCLOUD_PASTES_ENABLED = 'feathercloud_pastes_enabled';
    public const FEATHERCLOUD_ISSUES_ENABLED = 'feathercloud_issues_enabled';
    public const FEATHERCLOUD_LAST_SYNCED_AT = 'feathercloud_last_synced_at';
    /** Mythic Translations API base (https://translate.mythicalsystems.org) public, no panel keys */
    public const FEATHERCLOUD_TRANSLATE_BASE_URL = 'feathercloud_translate_base_url';
    /** Default Mythic translation project slug */
    public const FEATHERCLOUD_TRANSLATE_PROJECT = 'feathercloud_translate_project';

    /**
     * FeatherPanel Premium (team-scoped Mythic entitlement from GET /panel/summary).
     */
    public const FEATHERPANEL_PREMIUM_ACTIVE = 'featherpanel_premium_active';
    /** JSON object of entitlement feature flags */
    public const FEATHERPANEL_PREMIUM_FEATURES = 'featherpanel_premium_features';
    public const FEATHERPANEL_PREMIUM_CHECKED_AT = 'featherpanel_premium_checked_at';
    /** ISO timestamp when the cached active grant expires if Mythic cannot be reached */
    public const FEATHERPANEL_PREMIUM_EXPIRES_AT = 'featherpanel_premium_expires_at';
    /** ISO timestamp of the last failed Mythic entitlement refresh (grace cache in use) */
    public const FEATHERPANEL_PREMIUM_LAST_FAILURE_AT = 'featherpanel_premium_last_failure_at';

    /**
     * Temp uploads (public file sharing from server file manager via Wings).
     */
    public const TEMP_FILES_ENABLED = 'temp_files_enabled';
    /** Optional temp uploads API token (tf_…). Empty = anonymous 15GB; set = 30GB. */
    public const TEMP_FILES_API_TOKEN = 'temp_files_api_token';

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
    /** Premium: custom AI display name (empty = default FeatherPanel AI) */
    public const CHATBOT_DISPLAY_NAME = 'chatbot_display_name';
    /** Premium: custom AI avatar URL (empty = panel logo) */
    public const CHATBOT_AVATAR_URL = 'chatbot_avatar_url';

    /**
     * Premium custom sidebar navigation (hide / order / custom links JSON).
     * Panel name + logos stay free via App settings.
     */
    public const SIDEBAR_NAVIGATION_CONFIG = 'sidebar_navigation_config';

    /**
     * Status Page Settings.
     */
    public const STATUS_PAGE_ENABLED = 'status_page_enabled';
    public const STATUS_PAGE_PUBLIC_ENABLED = 'status_page_public_enabled';
    public const STATUS_PAGE_SHOW_NODE_STATUS = 'status_page_show_node_status';
    public const STATUS_PAGE_SHOW_LOAD_USAGE = 'status_page_show_load_usage';
    public const STATUS_PAGE_SHOW_TOTAL_SERVERS = 'status_page_show_total_servers';
    public const STATUS_PAGE_SHOW_INDIVIDUAL_NODES = 'status_page_show_individual_nodes';
    public const STATUS_PAGE_ALLOW_IFRAME = 'status_page_allow_iframe';
    public const STATUS_PAGE_SHOW_RAW_VALUES = 'status_page_show_raw_values';
    public const STATUS_PAGE_SHOW_PLAYER_COUNT = 'status_page_show_player_count';

    /**
     * Knowledgebase Settings.
     */
    public const KNOWLEDGEBASE_ENABLED = 'knowledgebase_enabled';
    public const KNOWLEDGEBASE_PUBLIC_ENABLED = 'knowledgebase_public_enabled';
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

    public const APP_DEMO_YES = 'app_demo_yes';
}
