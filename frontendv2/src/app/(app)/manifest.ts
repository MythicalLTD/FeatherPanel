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

import type { MetadataRoute } from 'next';
import { settingsApi } from '@/lib/settings-api';

function resolveIcon(primary?: string, fallback?: string): string {
    const value = (primary || fallback || '/assets/logo.png').trim();
    return value || '/assets/logo.png';
}

function guessImageType(url: string): string {
    const lower = url.toLowerCase().split('?')[0] || '';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.ico')) return 'image/x-icon';
    return 'image/png';
}

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const data = await settingsApi.getPublicSettings();
    const settings = data?.settings;

    const appName = settings?.app_name?.trim() || 'FeatherPanel';
    const shortName = (settings?.app_pwa_short_name?.trim() || appName).slice(0, 12);
    const description = settings?.app_pwa_description?.trim() || settings?.app_seo_description?.trim() || appName;
    const themeColor = settings?.app_pwa_theme_color?.trim() || '#000000';
    const backgroundColor = settings?.app_pwa_bg_color?.trim() || '#ffffff';
    const icon = resolveIcon(settings?.app_logo_dark, settings?.app_logo_white);
    const iconType = guessImageType(icon);

    if (!settings || settings.app_pwa_enabled !== 'true') {
        return {
            name: appName,
            short_name: shortName,
            description,
            icons: [],
            start_url: '/',
            display: 'browser',
            background_color: backgroundColor,
            theme_color: themeColor,
        };
    }

    return {
        name: appName,
        short_name: shortName,
        description,
        start_url: '/dashboard',
        scope: '/',
        id: '/',
        display: 'standalone',
        background_color: backgroundColor,
        theme_color: themeColor,
        orientation: 'any',
        categories: ['productivity', 'utilities'],
        icons: [
            { src: icon, sizes: '192x192', type: iconType, purpose: 'any' },
            { src: icon, sizes: '512x512', type: iconType, purpose: 'any' },
            { src: icon, sizes: '192x192', type: iconType, purpose: 'maskable' },
            { src: icon, sizes: '512x512', type: iconType, purpose: 'maskable' },
        ],
        shortcuts: [
            {
                name: 'Dashboard',
                short_name: 'Dashboard',
                description: 'Open your dashboard',
                url: '/dashboard',
                icons: [{ src: icon, sizes: '192x192', type: iconType }],
            },
            {
                name: 'Account',
                short_name: 'Account',
                description: 'Manage your account',
                url: '/dashboard/account',
                icons: [{ src: icon, sizes: '192x192', type: iconType }],
            },
        ],
    };
}
