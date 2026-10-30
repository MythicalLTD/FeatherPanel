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

import {
    Activity,
    Boxes,
    Brush,
    Code2,
    Database,
    Disc3,
    FileText,
    Globe,
    HardDrive,
    Image,
    KeyRound,
    Languages,
    Link2,
    LineChart,
    Lock,
    Mail,
    MonitorPlay,
    Network,
    Palette,
    QrCode,
    Scale,
    Search,
    Server,
    Settings,
    Share2,
    Shield,
    ShieldAlert,
    ShieldCheck,
    Shuffle,
    SlidersHorizontal,
    Smartphone,
    Sparkles,
    Ticket,
    TimerOff,
    Trash2,
    UploadCloud,
    UserCircle,
    UserCog,
    Wand2,
    Bell,
    CalendarClock,
    Camera,
    Cloud,
    type LucideIcon,
} from 'lucide-react';

export interface SettingsGroupDef {
    id: string;
    icon: LucideIcon;
    /** Master toggle shown as an On/Off pill in the section header. */
    master?: string;
    match: (key: string) => boolean;
    /** Expand this section by default when the tab loads. */
    defaultOpen?: boolean;
    /** Always expanded; hide the collapse chevron for this section. */
    alwaysOpen?: boolean;
}

export const starts =
    (...prefixes: string[]) =>
    (key: string) =>
        prefixes.some((p) => key.startsWith(p));

export const oneOf =
    (...keys: string[]) =>
    (key: string) =>
        keys.includes(key);

/** Fallback bucket used when no group matcher claims a setting. */
export const OTHER_GROUP: SettingsGroupDef = {
    id: 'other',
    icon: SlidersHorizontal,
    match: () => true,
};

const VDS_GROUPS: SettingsGroupDef[] = [
    {
        id: 'console',
        icon: MonitorPlay,
        defaultOpen: true,
        match: (key) =>
            starts('vnc_', 'vds_ctrl_alt_del')(key) ||
            (key.startsWith('vds_console_') && !key.startsWith('vds_console_brand_')),
    },
    { id: 'graphs', icon: LineChart, master: 'vds_graphs_enabled', match: starts('vds_graphs_') },
    { id: 'iso', icon: Disc3, match: starts('vds_iso_', 'vds_rescue_') },
    { id: 'snapshots', icon: Camera, master: 'vds_snapshots_enabled', match: starts('vds_snapshots_') },
    { id: 'firewall', icon: Shield, master: 'vds_firewall_enabled', match: starts('vds_firewall_') },
    { id: 'schedules', icon: CalendarClock, master: 'vds_schedules_enabled', match: starts('vds_schedules_') },
    { id: 'bandwidth', icon: Network, master: 'vds_bandwidth_enabled', match: starts('vds_bandwidth_') },
    {
        id: 'alerts',
        icon: Bell,
        master: 'vds_monitor_enabled',
        match: starts('vds_monitor_', 'vds_notify_', 'vds_high_cpu_'),
    },
    { id: 'security', icon: ShieldCheck, match: starts('vds_reauth_') },
    { id: 'expiry', icon: TimerOff, match: starts('vds_expiry_', 'vds_suspend_') },
    { id: 'placement', icon: Shuffle, match: starts('vds_placement_', 'vds_migration_') },
    { id: 'branding', icon: Palette, match: starts('vds_console_brand_') },
];

/** Display order for VDS: branding last (matchers already non-overlapping). */
const VDS_DISPLAY = [...VDS_GROUPS.filter((g) => g.id !== 'branding'), ...VDS_GROUPS.filter((g) => g.id === 'branding')];

export const CATEGORY_GROUPS: Record<string, SettingsGroupDef[]> = {
    app: [
        {
            id: 'identity',
            icon: Settings,
            defaultOpen: true,
            match: oneOf(
                'app_name',
                'app_url',
                'wings_remote_url',
                'app_logo_white',
                'app_logo_dark',
                'app_timezone',
            ),
        },
        {
            id: 'sso_api',
            icon: KeyRound,
            match: starts('app_sso_', 'api_clients_'),
        },
        { id: 'locale', icon: Languages, match: starts('app_locale_') },
        {
            id: 'theme',
            icon: Palette,
            match: starts('app_accent_color_', 'app_theme_', 'app_ui_pack_'),
        },
        {
            id: 'background',
            icon: Image,
            match: starts('app_background_', 'app_backdrop_'),
        },
        { id: 'spell_banner', icon: Wand2, match: starts('app_server_spell_banner_') },
        { id: 'temp_files', icon: UploadCloud, master: 'temp_files_enabled', match: starts('temp_files_') },
    ],
    modules: [{ id: 'modules', icon: Boxes, alwaysOpen: true, match: () => true }],
    vds: VDS_DISPLAY,
    links: [
        {
            id: 'support',
            icon: Link2,
            defaultOpen: true,
            match: oneOf('app_support_url', 'website_url', 'status_page_url'),
        },
        {
            id: 'social',
            icon: Share2,
            match: oneOf(
                'discord_url',
                'linkedin_url',
                'telegram_url',
                'tiktok_url',
                'twitter_url',
                'whatsapp_url',
                'youtube_url',
            ),
        },
        { id: 'legal', icon: Scale, match: starts('legal_') },
    ],
    auth_page: [
        {
            id: 'copy',
            icon: FileText,
            defaultOpen: true,
            match: oneOf(
                'auth_shell_tagline',
                'auth_aside_title',
                'auth_login_headline',
                'auth_login_subheadline',
                'auth_register_headline',
                'auth_register_subheadline',
                'auth_sso_headline',
                'auth_sso_subheadline',
            ),
        },
        {
            id: 'layout',
            icon: Brush,
            match: oneOf(
                'auth_show_marketing_panel',
                'auth_aside_image_url',
                'auth_template',
                'auth_visual_preset',
                'auth_form_density',
                'auth_secondary_layout',
                'auth_footer_style',
                'auth_show_theme_customizer',
            ),
        },
        { id: 'qr', icon: QrCode, match: oneOf('auth_show_qr_login') },
        { id: 'login_methods', icon: KeyRound, match: starts('login_') },
    ],
    telemetry: [{ id: 'telemetry', icon: Activity, alwaysOpen: true, match: () => true }],
    security: [
        {
            id: 'login',
            icon: Lock,
            defaultOpen: true,
            match: (key) =>
                starts('registration_', 'email_domain_blocking_')(key) ||
                oneOf('email_login_enabled', 'require_two_fa_admins')(key),
        },
        {
            id: 'captcha',
            icon: ShieldAlert,
            match: starts(
                'captcha_',
                'turnstile_',
                'hcaptcha_',
                'recaptcha_',
                'friendly_captcha_',
            ),
        },
        { id: 'abuseipdb', icon: Shield, master: 'abuseipdb_enabled', match: starts('abuseipdb_') },
        {
            id: 'avatars',
            icon: UserCircle,
            match: (key) => starts('avatar_')(key) || key === 'user_allow_avatar_change',
        },
        {
            id: 'profile',
            icon: UserCog,
            match: oneOf(
                'user_allow_username_change',
                'user_allow_email_change',
                'user_allow_first_name_change',
                'user_allow_last_name_change',
                'user_allow_api_keys_create',
            ),
        },
        {
            id: 'account_deletion',
            icon: Trash2,
            master: 'user_allow_account_deletion',
            match: (key) => starts('user_account_deletion_')(key) || key === 'user_allow_account_deletion',
        },
    ],
    email: [
        {
            id: 'provider',
            icon: Mail,
            defaultOpen: true,
            master: 'smtp_enabled',
            match: oneOf('smtp_enabled', 'mail_provider_preset', 'mail_transport', 'smtp_from'),
        },
        {
            id: 'smtp',
            icon: Server,
            match: oneOf('smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_encryption'),
        },
        { id: 'api', icon: Cloud, match: starts('mail_api_') },
    ],
    status_page: [
        {
            id: 'enablement',
            icon: Activity,
            defaultOpen: true,
            master: 'status_page_enabled',
            match: (key) =>
                starts('maintenance_mode_')(key) ||
                oneOf('status_page_enabled', 'status_page_public_enabled')(key),
        },
        {
            id: 'visibility',
            icon: Globe,
            match: starts('status_page_show_', 'status_page_allow_', 'status_page_servers_'),
        },
    ],
    knowledgebase: [
        {
            id: 'knowledgebase',
            icon: FileText,
            alwaysOpen: true,
            master: 'knowledgebase_enabled',
            match: () => true,
        },
    ],
    oauth: [
        {
            id: 'discord',
            icon: Share2,
            defaultOpen: true,
            master: 'discord_oauth_enabled',
            match: starts('discord_oauth_'),
        },
        { id: 'google', icon: Globe, master: 'sso_google_enabled', match: starts('sso_google_') },
        { id: 'github', icon: Code2, master: 'sso_github_enabled', match: starts('sso_github_') },
        {
            id: 'shared',
            icon: ShieldCheck,
            match: oneOf('sso_allowed_email_domains', 'sso_allow_registration', 'sso_auto_link_verified_email'),
        },
    ],
    servers: [
        {
            id: 'permissions',
            icon: ShieldCheck,
            defaultOpen: true,
            match: (key) =>
                key.startsWith('server_allow_') &&
                !oneOf(
                    'server_allow_user_backup_policy_edit',
                    'server_allow_user_made_proxy',
                    'server_allow_user_auto_start',
                )(key),
        },
        {
            id: 'lifecycle',
            icon: Sparkles,
            master: 'server_lifecycle_hooks_enabled',
            match: starts('server_lifecycle_', 'server_run_script_'),
        },
        {
            id: 'backups',
            icon: HardDrive,
            match: (key) => starts('server_backup_')(key) || key === 'server_allow_user_backup_policy_edit',
        },
        {
            id: 'proxy_upload',
            icon: UploadCloud,
            match: (key) =>
                starts('server_proxy_', 'server_upload_')(key) || key === 'server_allow_user_made_proxy',
        },
        {
            id: 'network',
            icon: Network,
            match: oneOf('server_require_subdomain', 'server_hide_ips'),
        },
        {
            id: 'auto_start',
            icon: TimerOff,
            match: (key) => starts('server_auto_start_')(key) || key === 'server_allow_user_auto_start',
        },
        { id: 'trash', icon: Trash2, master: 'file_trash_enabled', match: starts('file_trash_') },
    ],
    chatbot: [
        {
            id: 'core',
            icon: Sparkles,
            defaultOpen: true,
            master: 'chatbot_enabled',
            match: oneOf(
                'chatbot_enabled',
                'chatbot_ai_provider',
                'chatbot_temperature',
                'chatbot_max_tokens',
                'chatbot_max_history',
                'chatbot_system_prompt',
                'chatbot_user_prompt',
            ),
        },
        { id: 'google', icon: Cloud, match: starts('chatbot_google_ai_') },
        { id: 'openrouter', icon: Cloud, match: starts('chatbot_openrouter_') },
        { id: 'openai', icon: Cloud, match: starts('chatbot_openai_') },
        { id: 'ollama', icon: Server, match: starts('chatbot_ollama_') },
        { id: 'grok', icon: Cloud, match: starts('chatbot_grok_') },
        { id: 'perplexity', icon: Search, match: starts('chatbot_perplexity_') },
    ],
    ticket_system: [
        {
            id: 'ticket_system',
            icon: Ticket,
            alwaysOpen: true,
            master: 'ticket_system_enabled',
            match: () => true,
        },
    ],
    seo: [{ id: 'seo', icon: Search, alwaysOpen: true, match: () => true }],
    pwa: [
        {
            id: 'pwa',
            icon: Smartphone,
            alwaysOpen: true,
            master: 'app_pwa_enabled',
            match: () => true,
        },
    ],
    other: [{ id: 'other', icon: Code2, alwaysOpen: true, match: () => true }],
    backup_storage: [
        {
            id: 'panel_s3',
            icon: Database,
            defaultOpen: true,
            master: 'backup_s3_enabled',
            match: starts('backup_s3_'),
        },
        {
            id: 'upload',
            icon: UploadCloud,
            match: oneOf(
                'backup_upload_part_size_mb',
                'backup_max_concurrent_uploads',
                'backup_presign_ttl_minutes',
            ),
        },
        {
            id: 'byo',
            icon: HardDrive,
            master: 'backup_byo_enabled',
            match: oneOf(
                'backup_byo_enabled',
                'backup_byo_providers',
                'backup_byo_max_per_user',
                'backup_byo_count_toward_limit',
                'backup_byo_relay_enabled',
            ),
        },
        {
            id: 'oauth_apps',
            icon: KeyRound,
            match: starts(
                'backup_byo_google_',
                'backup_byo_dropbox_',
                'backup_byo_onedrive_',
            ),
        },
    ],
};

export function getGroupsForCategory(categoryKey: string): SettingsGroupDef[] {
    return CATEGORY_GROUPS[categoryKey] ?? [{ id: 'other', icon: SlidersHorizontal, alwaysOpen: true, match: () => true }];
}

export function findGroupForSetting(categoryKey: string, settingKey: string): SettingsGroupDef {
    const groups = getGroupsForCategory(categoryKey);
    return groups.find((g) => g.match(settingKey)) ?? OTHER_GROUP;
}

/** Group title + description for accordion sections (searchable). */
export function groupSearchText(
    categoryKey: string,
    settingKey: string,
    t: (key: string) => string,
): string {
    const group = findGroupForSetting(categoryKey, settingKey);
    const id = group.id;
    const titleKey = `admin.settings.groups.${categoryKey}.${id}.title`;
    const descKey = `admin.settings.groups.${categoryKey}.${id}.description`;
    const title = t(titleKey);
    const desc = t(descKey);
    return [title !== titleKey ? title : id, desc !== descKey ? desc : ''].filter(Boolean).join('\n');
}

/** @deprecated Prefer groupSearchText — kept for any leftover VDS-only call sites. */
export function vdsGroupSearchText(settingKey: string, t: (key: string) => string): string {
    return groupSearchText('vds', settingKey, t);
}
