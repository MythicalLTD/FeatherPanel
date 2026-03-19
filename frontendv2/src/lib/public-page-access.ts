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

import { cache } from 'react';
import { settingsApi } from '@/lib/settings-api';

export type PublicPageKey = 'status' | 'knowledgebase';

interface PublicPagePolicy {
    featureEnabledSettingKey: 'status_page_enabled' | 'knowledgebase_enabled';
    publicEnabledSettingKey: 'status_page_public_enabled' | 'knowledgebase_public_enabled';
    fallbackPath: '/dashboard/status' | '/dashboard/knowledgebase';
}

const PUBLIC_PAGE_POLICIES: Record<PublicPageKey, PublicPagePolicy> = {
    status: {
        featureEnabledSettingKey: 'status_page_enabled',
        publicEnabledSettingKey: 'status_page_public_enabled',
        fallbackPath: '/dashboard/status',
    },
    knowledgebase: {
        featureEnabledSettingKey: 'knowledgebase_enabled',
        publicEnabledSettingKey: 'knowledgebase_public_enabled',
        fallbackPath: '/dashboard/knowledgebase',
    },
};

const getSettingsCached = cache(async () => settingsApi.getPublicSettings());

export async function getPublicPageAccess(page: PublicPageKey): Promise<{ enabled: boolean; fallbackPath: string }> {
    const settingsData = await getSettingsCached();
    const settings = settingsData?.settings;
    const policy = PUBLIC_PAGE_POLICIES[page];

    const featureEnabled = (settings?.[policy.featureEnabledSettingKey] ?? 'false') === 'true';
    const publicEnabled = (settings?.[policy.publicEnabledSettingKey] ?? 'true') === 'true';

    return {
        enabled: featureEnabled && publicEnabled,
        fallbackPath: policy.fallbackPath,
    };
}
