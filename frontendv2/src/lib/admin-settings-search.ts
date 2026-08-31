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
    server_lifecycle_hooks_enabled: 'Lifecycle hooks (pre-start / pre-stop / post-start / crash)',
    server_lifecycle_hooks_container_shell_enabled: 'Lifecycle Container Shell (docker exec)',
};

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

export function matchesAdminSettingQuery(
    query: string,
    settingKey: string,
    setting: Setting,
    categoryKey: string,
    categoryName: string,
    title: string,
    description: string,
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
            const labelKey = `admin.settings.fields.${settingKey}.label`;
            const descriptionKey = `admin.settings.fields.${settingKey}.description`;
            const translatedLabel = t(labelKey);
            const translatedDescription = t(descriptionKey);

            const title =
                translatedLabel !== labelKey ? translatedLabel : formatAdminSettingName(setting.name, settingKey);
            const description = translatedDescription !== descriptionKey ? translatedDescription : setting.description;

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
                    'panel setting',
                    'admin setting',
                ].filter(Boolean) as string[],
            });
        }
    }

    return results;
}
