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

import { useMemo } from 'react';
import { useSettings } from '@/contexts/SettingsContext';
import { isEnabled } from '@/lib/utils';

/**
 * Developer mode is exposed on the public settings payload (`/api/system/settings`)
 * as `app_developer_mode`. Reading it from SettingsContext avoids calling
 * `/api/admin/settings` for every user (403 for roles without admin.settings.view).
 */
export function useDeveloperMode() {
    const { settings, loading: settingsLoading } = useSettings();

    const isDeveloperModeEnabled = useMemo(() => {
        if (settingsLoading) return null;
        if (!settings) return false;
        return isEnabled(settings.app_developer_mode);
    }, [settingsLoading, settings]);

    return { isDeveloperModeEnabled, loading: settingsLoading };
}
