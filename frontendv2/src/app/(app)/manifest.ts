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

import { MetadataRoute } from 'next';

import { settingsApi } from '@/lib/settings-api';

export default async function manifest(): Promise<MetadataRoute.Manifest> {
    const data = await settingsApi.getPublicSettings();
    const settings = data?.settings;

    if (!settings || settings.app_pwa_enabled !== 'true') {
        return {
            name: 'FeatherPanel',
            short_name: 'FeatherPanel',
            icons: [],
            start_url: '/',
            display: 'browser',
            background_color: '#ffffff',
            theme_color: '#000000',
        };
    }

    return {
        name: settings.app_name || 'FeatherPanel',
        short_name: settings.app_pwa_short_name || 'FeatherPanel',
        description: settings.app_pwa_description || 'Manage your game servers on the go.',
        start_url: '/',
        display: 'standalone',
        background_color: settings.app_pwa_bg_color || '#ffffff',
        theme_color: settings.app_pwa_theme_color || '#000000',
        icons: [
            {
                src: settings.app_logo_dark || '/favicon.ico',
                sizes: 'any',
                type: 'image/png',
            },
        ],
    };
}
