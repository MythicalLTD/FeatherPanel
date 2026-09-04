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
import { writeLocaleCookie } from '@/lib/locale-cookie';

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
    /** False until at least one translation catalog is available (SSR, cache, or network). */
    ready: boolean;
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

function translationCacheKey(lang: string): string {
    return `translations_${lang}_${CACHE_VERSION}`;
}

function readCachedTranslations(lang: string): Record<string, unknown> | null {
    if (typeof window === 'undefined') return null;
    try {
        const cached = localStorage.getItem(translationCacheKey(lang));
        if (!cached) return null;
        const parsed: unknown = JSON.parse(cached);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        const obj = parsed as Record<string, unknown>;
        return Object.keys(obj).length > 0 ? obj : null;
    } catch {
        return null;
    }
}

function hasLocaleUserOverride(): boolean {
    return localStorage.getItem(LOCALE_USER_OVERRIDE_KEY) === 'true';
}

function migrateLegacyLocalePreference(): void {
    if (typeof window === 'undefined') return;
    if (localStorage.getItem(LOCALE_MIGRATION_KEY) === 'true') return;
    if (localStorage.getItem('locale')) {
        localStorage.setItem(LOCALE_USER_OVERRIDE_KEY, 'true');
    }
    localStorage.setItem(LOCALE_MIGRATION_KEY, 'true');
}

function deepMerge(target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> {
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
}

function seedClientTranslationCache(lang: string, translations: Record<string, unknown>) {
    if (typeof window === 'undefined') return;
    if (Object.keys(translations).length === 0) return;
    try {
        localStorage.setItem(translationCacheKey(lang), JSON.stringify(translations));
    } catch {
        // ignore quota / private mode
    }
}

type TranslationProviderProps = {
    children: ReactNode;
    initialLocale?: string;
    initialTranslations?: Record<string, unknown>;
};

export function TranslationProvider({ children, initialLocale, initialTranslations }: TranslationProviderProps) {
    const { settings, loading: settingsLoading } = useSettings();
    const isLocaleLocked = settings?.app_locale_lock === 'true';
    const adminLocaleDefault = normalizeLocaleCode(settings?.app_locale_default || '') || DEFAULT_LOCALE;

    const ssrLocale = normalizeLocaleCode(initialLocale || '') || DEFAULT_LOCALE;
    const ssrTranslations =
        initialTranslations && Object.keys(initialTranslations).length > 0 ? initialTranslations : null;

    const [locale, setLocaleState] = useState(ssrLocale);
    const hasStoredLocaleRef = useRef(
        typeof window !== 'undefined' ? !!localStorage.getItem('locale') : Boolean(initialLocale),
    );
    const [translations, setTranslations] = useState<Record<string, unknown>>(() => ssrTranslations || {});
    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([
        { code: 'en', name: 'English', nativeName: 'English' },
    ]);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(() => Boolean(ssrTranslations));

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

    const loadFullTranslations = useCallback(
        async (lang: string) => {
            let frontendTranslations: Record<string, unknown> = {};
            let backendPrimaryTranslations: Record<string, unknown> = {};
            let backendLangTranslations: Record<string, unknown> = {};
            const cacheKey = translationCacheKey(lang);

            const cached =
                readCachedTranslations(lang) ||
                (lang !== PRIMARY_LOCALE ? readCachedTranslations(PRIMARY_LOCALE) : null);
            if (cached) {
                setTranslations(cached);
                setReady(true);
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
                        if (
                            'success' in backendPrimaryData &&
                            'data' in backendPrimaryData &&
                            backendPrimaryData.success
                        ) {
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

            if (Object.keys(mergedTranslations).length > 0) {
                setTranslations(mergedTranslations);
                localStorage.setItem(cacheKey, JSON.stringify(mergedTranslations));
                setReady(true);
            } else if (cached) {
                setTranslations(cached);
                setReady(true);
            } else {
                setReady(true);
            }
        },
        [fetchJsonObject],
    );

    const loadAvailableLanguages = useCallback(async () => {
        try {
            const response = await fetch('/api/system/translations/languages');
            if (response.ok) {
                const data = await response.json();

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

    // Seed client caches from SSR so soft navigations / later boots stay warm.
    useEffect(() => {
        if (ssrTranslations) {
            seedClientTranslationCache(ssrLocale, ssrTranslations);
        }

        // After hydrate: if the user has an unlocked stored locale that differs from SSR, switch.
        if (isLocaleLocked) {
            writeLocaleCookie(ssrLocale);
            return;
        }

        const stored = normalizeLocaleCode(localStorage.getItem('locale') || '');
        if (stored && hasLocaleUserOverride() && stored !== locale) {
            hasStoredLocaleRef.current = true;
            setLocaleState(stored);
            writeLocaleCookie(stored);
            return;
        }

        if (!stored) {
            localStorage.setItem('locale', ssrLocale);
        }
        writeLocaleCookie(stored || ssrLocale);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot hydrate sync
    }, []);

    useEffect(() => {
        const hasCache = Boolean(
            ssrTranslations || readCachedTranslations(locale) || readCachedTranslations(PRIMARY_LOCALE),
        );
        if (!hasStoredLocaleRef.current && settingsLoading && !hasCache) return;
        loadFullTranslations(locale);
        loadAvailableLanguages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale, settingsLoading]);

    useEffect(() => {
        if (!settings) return;

        migrateLegacyLocalePreference();

        const shouldUseAdminDefault = isLocaleLocked || !hasLocaleUserOverride();
        if (!shouldUseAdminDefault) return;
        if (!adminLocaleDefault || adminLocaleDefault === locale) return;

        setLocaleState(adminLocaleDefault);
        localStorage.setItem('locale', adminLocaleDefault);
        writeLocaleCookie(adminLocaleDefault);
    }, [settings, isLocaleLocked, adminLocaleDefault, locale]);

    const setLocale = async (newLocale: string) => {
        if (isLocaleLocked) return;

        const normalized = normalizeLocaleCode(newLocale) || DEFAULT_LOCALE;
        setLoading(true);
        setLocaleState(normalized);
        localStorage.setItem('locale', normalized);
        localStorage.setItem(LOCALE_USER_OVERRIDE_KEY, 'true');
        writeLocaleCookie(normalized);
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
                ready,
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
