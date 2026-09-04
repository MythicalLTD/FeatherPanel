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

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import type { AppSettings, CoreInfo } from '@/types/settings';
import { settingsApi } from '@/lib/settings-api';

interface SettingsContextType {
    settings: AppSettings | null;
    core: CoreInfo | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const CACHE_KEY = 'app_settings';
const CACHE_VERSION = '1.6';

type SettingsProviderProps = {
    children: ReactNode;
    initialSettings?: AppSettings | null;
    initialCore?: CoreInfo | null;
};

export function SettingsProvider({ children, initialSettings = null, initialCore = null }: SettingsProviderProps) {
    const [settings, setSettings] = useState<AppSettings | null>(initialSettings);
    const [core, setCore] = useState<CoreInfo | null>(initialCore);
    const [loading, setLoading] = useState(!initialSettings);
    const [error, setError] = useState<string | null>(null);

    const fetchSettings = useCallback(async () => {
        try {
            if (!initialSettings) {
                const cached = localStorage.getItem(CACHE_KEY);
                if (cached) {
                    const { data, version } = JSON.parse(cached);
                    if (version === CACHE_VERSION) {
                        setSettings(data.settings);
                        setCore(data.core);
                        setLoading(false);
                    }
                }
            }

            const data = await settingsApi.getPublicSettings();

            if (data) {
                setSettings(data.settings);
                setCore(data.core);
                setError(null);

                localStorage.setItem(
                    CACHE_KEY,
                    JSON.stringify({
                        data,
                        version: CACHE_VERSION,
                        timestamp: Date.now(),
                    }),
                );
            } else if (!initialSettings) {
                throw new Error('Failed to load settings');
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load settings';
            setError(errorMessage);
            console.error('Settings fetch error:', err);
        } finally {
            setLoading(false);
        }
    }, [initialSettings]);

    useEffect(() => {
        fetchSettings();
    }, [fetchSettings]);

    const refetch = useCallback(async () => {
        setLoading(true);
        await fetchSettings();
    }, [fetchSettings]);

    return (
        <SettingsContext.Provider
            value={{
                settings,
                core,
                loading,
                error,
                refetch,
            }}
        >
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within SettingsProvider');
    }
    return context;
}
