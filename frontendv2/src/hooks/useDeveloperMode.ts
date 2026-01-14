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

import { useState, useEffect } from 'react';
import { adminSettingsApi } from '@/lib/admin-settings-api';
import { isEnabled } from '@/lib/utils';

export function useDeveloperMode() {
    const [isDeveloperModeEnabled, setIsDeveloperModeEnabled] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkDeveloperMode = async () => {
            try {
                const response = await adminSettingsApi.fetchSettings();
                if (response.success && response.data?.settings) {
                    const developerModeSetting = response.data.settings['app_developer_mode'];
                    setIsDeveloperModeEnabled(isEnabled(developerModeSetting?.value));
                } else {
                    setIsDeveloperModeEnabled(false);
                }
            } catch (error) {
                console.error('Error checking developer mode:', error);
                setIsDeveloperModeEnabled(false);
            } finally {
                setLoading(false);
            }
        };

        checkDeveloperMode();
    }, []);

    return { isDeveloperModeEnabled, loading };
}
