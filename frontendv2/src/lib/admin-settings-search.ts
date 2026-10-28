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

import type { OrganizedSettings, Setting } from '@/lib/admin-settings-api';
import type { GlobalSearchResult } from '@/lib/global-search';
import Permissions from '@/lib/permissions';

const ADMIN_SETTING_DISPLAY_NAMES: Record<string, string> = {
    server_require_subdomain: 'Require subdomain before server start',
    server_lifecycle_hooks_enabled: 'Lifecycle hooks (pre-start / pre-stop / post-start / crash)',
    server_lifecycle_hooks_container_shell_enabled: 'Container Shell (docker exec) for lifecycle hooks & schedules',
};

/** First matching group wins - keep in sync with VdsSettingsSections GROUPS. */
const VDS_SETTING_GROUPS: { id: string; match: (key: string) => boolean }[] = [
    { id: 'branding', match: (k) => k.startsWith('vds_console_brand_') },
    {
        id: 'console',
        match: (k) => k.startsWith('vnc_') || k.startsWith('vds_console_') || k.startsWith('vds_ctrl_alt_del'),
    },
    { id: 'graphs', match: (k) => k.startsWith('vds_graphs_') },
    { id: 'iso', match: (k) => k.startsWith('vds_iso_') || k.startsWith('vds_rescue_') },
    { id: 'snapshots', match: (k) => k.startsWith('vds_snapshots_') },
    { id: 'firewall', match: (k) => k.startsWith('vds_firewall_') },
    { id: 'schedules', match: (k) => k.startsWith('vds_schedules_') },
    { id: 'bandwidth', match: (k) => k.startsWith('vds_bandwidth_') },
    {
        id: 'alerts',
        match: (k) => k.startsWith('vds_monitor_') || k.startsWith('vds_notify_') || k.startsWith('vds_high_cpu_'),
    },
    { id: 'security', match: (k) => k.startsWith('vds_reauth_') },
    { id: 'expiry', match: (k) => k.startsWith('vds_expiry_') || k.startsWith('vds_suspend_') },
    { id: 'placement', match: (k) => k.startsWith('vds_placement_') || k.startsWith('vds_migration_') },
];

export function formatAdminSettingName(name: string, key: string): string {
    if (ADMIN_SETTING_DISPLAY_NAMES[key]) {
        return ADMIN_SETTING_DISPLAY_NAMES[key];
    }
    const textToFormat = name || key;
    return textToFormat
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

function settingValueAsSearchText(setting: Setting): string {
    if (setting.type === 'password') return '';
    const value = setting.value;
    if (value === null || value === undefined) return '';
    return String(value);
}

export function resolveAdminSettingLabel(
    settingKey: string,
    setting: Setting,
    t: (key: string) => string,
): { title: string; description: string } {
    const labelKey = `admin.settings.fields.${settingKey}.label`;
    const descriptionKey = `admin.settings.fields.${settingKey}.description`;
    const translatedLabel = t(labelKey);
    const translatedDescription = t(descriptionKey);

    return {
        title: translatedLabel !== labelKey ? translatedLabel : formatAdminSettingName(setting.name, settingKey),
        description: translatedDescription !== descriptionKey ? translatedDescription : setting.description,
    };
}

/** Group title + description for VDS accordion sections (searchable). */
export function vdsGroupSearchText(settingKey: string, t: (key: string) => string): string {
    const group = VDS_SETTING_GROUPS.find((g) => g.match(settingKey));
    const id = group?.id ?? 'other';
    const titleKey = `admin.settings.vds_groups.${id}.title`;
    const descKey = `admin.settings.vds_groups.${id}.description`;
    const title = t(titleKey);
    const desc = t(descKey);
    return [title !== titleKey ? title : id, desc !== descKey ? desc : ''].filter(Boolean).join('\n');
}

export function matchesAdminSettingQuery(
    query: string,
    settingKey: string,
    setting: Setting,
    categoryKey: string,
    categoryName: string,
    title: string,
    description: string,
    extraHaystack = '',
): boolean {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return true;

    const haystack = [
        settingKey,
        title,
        description,
        setting.placeholder,
        settingValueAsSearchText(setting),
        categoryKey,
        categoryName,
        extraHaystack,
    ]
        .join('\n')
        .toLowerCase();

    const terms = trimmed.split(/\s+/).filter(Boolean);
    return terms.every((term) => haystack.includes(term));
}

export function adminSettingsToSearchResults(
    organized: OrganizedSettings,
    t: (key: string) => string,
): GlobalSearchResult[] {
    const results: GlobalSearchResult[] = [];

    for (const [categoryKey, data] of Object.entries(organized)) {
        for (const [settingKey, setting] of Object.entries(data.settings)) {
            const { title, description } = resolveAdminSettingLabel(settingKey, setting, t);
            const groupText = categoryKey === 'vds' ? vdsGroupSearchText(settingKey, t) : '';

            results.push({
                id: `admin-setting-${settingKey}`,
                title,
                subtitle: `${data.category.name} · Panel setting`,
                href: `/admin/settings?category=${encodeURIComponent(categoryKey)}&q=${encodeURIComponent(title)}`,
                category: 'adminSettings',
                panelIcon: data.category.icon,
                lucideIcon: data.category.icon,
                permission: Permissions.ADMIN_SETTINGS_VIEW,
                keywords: [
                    settingKey,
                    title,
                    description,
                    data.category.name,
                    categoryKey,
                    setting.placeholder,
                    groupText,
                    'panel setting',
                    'admin setting',
                    'vds',
                ].filter(Boolean) as string[],
            });
        }
    }

    return results;
}
