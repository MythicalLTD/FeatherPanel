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

import { createContext, useContext, useEffect, useState, useRef, ReactNode, useCallback } from 'react';
import { isCloudflareChallengeText } from '@/lib/cloudflare-challenge';
import { useSettings } from '@/contexts/SettingsContext';

interface Language {
    code: string;
    name: string;
    nativeName: string;
}

interface TranslationContextType {
    locale: string;
    translations: Record<string, unknown>;
    availableLanguages: Language[];
    setLocale: (locale: string) => Promise<void>;
    t: (key: string, params?: Record<string, string>) => string;
    loading: boolean;
    initialLoading: boolean;
    /** When true, admin forced language and users cannot change it. */
    isLocaleLocked: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const DEFAULT_LOCALE = 'en';
const PRIMARY_LOCALE = 'en';
const CACHE_VERSION = '1.5';
const LOCALE_USER_OVERRIDE_KEY = 'localeUserOverride';
const LOCALE_MIGRATION_KEY = 'localeMigrationV1';

function normalizeLocaleCode(code: string): string {
    return code.trim().toLowerCase().replace(/_/g, '-');
}

function hasLocaleUserOverride(): boolean {
    return localStorage.getItem(LOCALE_USER_OVERRIDE_KEY) === 'true';
}

/** Preserve pre-feature saved locales as explicit user preferences (one-time). */
function migrateLegacyLocalePreference(): void {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(LOCALE_MIGRATION_KEY) === 'true') return;
    if (localStorage.getItem('locale')) {
        localStorage.setItem(LOCALE_USER_OVERRIDE_KEY, 'true');
    }
    localStorage.setItem(LOCALE_MIGRATION_KEY, 'true');
}

export function TranslationProvider({ children }: { children: ReactNode }) {
    const { settings, loading: settingsLoading } = useSettings();
    const isLocaleLocked = settings?.app_locale_lock === 'true';
    const adminLocaleDefault = normalizeLocaleCode(settings?.app_locale_default || '') || DEFAULT_LOCALE;

    const [locale, setLocaleState] = useState(() => {
        if (typeof window !== 'undefined') {
            const stored = localStorage.getItem('locale');
            return stored ? normalizeLocaleCode(stored) || DEFAULT_LOCALE : DEFAULT_LOCALE;
        }
        return DEFAULT_LOCALE;
    });
    const hasStoredLocaleRef = useRef(typeof window !== 'undefined' && !!localStorage.getItem('locale'));
    const [translations, setTranslations] = useState<Record<string, unknown>>({});
    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([
        { code: 'en', name: 'English', nativeName: 'English' },
    ]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);

    const fetchJsonObject = useCallback(async (url: string): Promise<Record<string, unknown> | null> => {
        const response = await fetch(url, { credentials: 'same-origin' });
        if (!response.ok) return null;

        const contentType = String(response.headers.get('content-type') || '').toLowerCase();
        const raw = await response.text();

        if (contentType.includes('text/html') && isCloudflareChallengeText(raw)) {
            return null;
        }

        try {
            const parsed: unknown = JSON.parse(raw);
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
        } catch {
            return null;
        }
    }, []);

    const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
        const output = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = deepMerge(
                    (target[key] as Record<string, unknown>) || {},
                    source[key] as Record<string, unknown>,
                );
            } else {
                output[key] = source[key];
            }
        }
        return output;
    };

    const loadFullTranslations = useCallback(async (lang: string) => {
        let frontendTranslations: Record<string, unknown> = {};
        let backendPrimaryTranslations: Record<string, unknown> = {};
        let backendLangTranslations: Record<string, unknown> = {};
        const cacheKey = `translations_${lang}_${CACHE_VERSION}`;

        try {
            const cached = localStorage.getItem(cacheKey);
            if (cached) {
                const parsed: unknown = JSON.parse(cached);
                if (parsed && typeof parsed === 'object') {
                    setTranslations(parsed as Record<string, unknown>);
                }
            }
        } catch {
            // Ignore cache parsing errors and continue with network fetch.
        }

        try {
            let frontendData = await fetchJsonObject(`/locales/${lang}.json`);
            if (!frontendData && lang !== PRIMARY_LOCALE) {
                frontendData = await fetchJsonObject(`/locales/${PRIMARY_LOCALE}.json`);
            }
            if (frontendData) {
                frontendTranslations = frontendData;
            }
        } catch (error) {
            console.warn('Failed to load frontend translations:', error);
        }

        if (lang !== PRIMARY_LOCALE) {
            try {
                const backendPrimaryData = await fetchJsonObject(`/api/system/translations/${PRIMARY_LOCALE}`);
                if (backendPrimaryData) {
                    if ('success' in backendPrimaryData && 'data' in backendPrimaryData && backendPrimaryData.success) {
                        backendPrimaryTranslations = (backendPrimaryData.data || {}) as Record<string, unknown>;
                    } else {
                        backendPrimaryTranslations = backendPrimaryData as Record<string, unknown>;
                    }
                }
            } catch (error) {
                console.warn('Failed to load backend primary translations:', error);
            }
        }

        try {
            const backendData = await fetchJsonObject(`/api/system/translations/${lang}`);
            if (backendData) {
                if ('success' in backendData && 'data' in backendData && backendData.success) {
                    backendLangTranslations = (backendData.data || {}) as Record<string, unknown>;
                } else {
                    backendLangTranslations = backendData as Record<string, unknown>;
                }
            }
        } catch (error) {
            console.warn('Failed to load backend language translations:', error);
        }

        let mergedTranslations = frontendTranslations;
        if (Object.keys(backendPrimaryTranslations).length > 0) {
            mergedTranslations = deepMerge(mergedTranslations, backendPrimaryTranslations);
        }
        if (Object.keys(backendLangTranslations).length > 0) {
            mergedTranslations = deepMerge(mergedTranslations, backendLangTranslations);
        }

        setTranslations(mergedTranslations);
        localStorage.setItem(cacheKey, JSON.stringify(mergedTranslations));

        setInitialLoading(false);

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const loadAvailableLanguages = useCallback(async () => {
        try {
            const response = await fetch('/api/system/translations/languages');
            if (response.ok) {
                const data = await response.json();
                console.log('[TranslationContext] Languages API response:', data);

                if (data && typeof data === 'object') {
                    if (data.success === true && Array.isArray(data.data)) {
                        setAvailableLanguages(data.data);
                        return;
                    } else if (Array.isArray(data)) {
                        setAvailableLanguages(data);
                        return;
                    } else if (data.data && Array.isArray(data.data)) {
                        setAvailableLanguages(data.data);
                        return;
                    }
                }

                console.warn('[TranslationContext] Unexpected languages API response format:', data);
            } else {
                console.warn('[TranslationContext] Languages API returned non-OK status:', response.status);
            }
        } catch (error) {
            console.warn('[TranslationContext] Failed to load available languages from API:', error);
        }
    }, []);

    useEffect(() => {
        // For first-time visitors with no stored/overridden locale, wait for admin locale
        // settings to resolve before the first fetch. Otherwise we'd load the default locale
        // and then immediately reload once the admin default is applied below, causing a
        // duplicate network fetch and a visible language flash.
        if (!hasStoredLocaleRef.current && settingsLoading) return;
        loadFullTranslations(locale);
        loadAvailableLanguages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale, settingsLoading]);

    // Apply admin default / lock once public settings are available.
    useEffect(() => {
        if (!settings) return;

        migrateLegacyLocalePreference();

        const shouldUseAdminDefault = isLocaleLocked || !hasLocaleUserOverride();
        if (!shouldUseAdminDefault) return;
        if (!adminLocaleDefault || adminLocaleDefault === locale) return;

        setLocaleState(adminLocaleDefault);
        localStorage.setItem('locale', adminLocaleDefault);
    }, [settings, isLocaleLocked, adminLocaleDefault, locale]);

    const setLocale = async (newLocale: string) => {
        if (isLocaleLocked) return;

        const normalized = normalizeLocaleCode(newLocale) || DEFAULT_LOCALE;
        setLoading(true);
        setLocaleState(normalized);
        localStorage.setItem('locale', normalized);
        localStorage.setItem(LOCALE_USER_OVERRIDE_KEY, 'true');
        await loadFullTranslations(normalized);
        setLoading(false);
    };

    const t = useCallback(
        (key: string, params?: Record<string, string>): string => {
            const keys = key.split('.');
            let value: unknown = translations;

            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = (value as Record<string, unknown>)[k];
                } else {
                    return key;
                }
            }

            if (typeof value !== 'string') {
                return key;
            }

            if (params) {
                return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
                    return params[paramKey] || match;
                });
            }

            return value;
        },
        [translations],
    );

    return (
        <TranslationContext.Provider
            value={{
                locale,
                translations,
                availableLanguages,
                setLocale,
                t,
                loading,
                initialLoading,
                isLocaleLocked,
            }}
        >
            {children}
        </TranslationContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(TranslationContext);
    if (!context) {
        throw new Error('useTranslation must be used within TranslationProvider');
    }
    return context;
}
