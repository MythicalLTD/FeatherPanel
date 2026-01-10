/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';

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
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

const DEFAULT_LOCALE = 'en';
const PRIMARY_LOCALE = 'en'; // Primary language for fallback
const CACHE_VERSION = '1.1';

export function TranslationProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('locale') || DEFAULT_LOCALE;
        }
        return DEFAULT_LOCALE;
    });
    const [translations, setTranslations] = useState<Record<string, unknown>>({});
    const [availableLanguages, setAvailableLanguages] = useState<Language[]>([
        { code: 'en', name: 'English', nativeName: 'English' },
    ]);
    const [loading, setLoading] = useState(false);
    const [initialLoading, setInitialLoading] = useState(true);


    // Deep merge function for nested translation objects
    const deepMerge = (target: Record<string, unknown>, source: Record<string, unknown>): Record<string, unknown> => {
        const output = { ...target };
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                output[key] = deepMerge(
                    (target[key] as Record<string, unknown>) || {},
                    source[key] as Record<string, unknown>
                );
            } else {
                output[key] = source[key];
            }
        }
        return output;
    };

    // Load translations with fallback chain: backend lang -> backend primary -> frontend (en only)
    const loadFullTranslations = useCallback(async (lang: string) => {
        let frontendTranslations: Record<string, unknown> = {};
        let backendPrimaryTranslations: Record<string, unknown> = {};
        let backendLangTranslations: Record<string, unknown> = {};

        // Step 1: Load frontend English translations (base layer - frontend only has en.json)
        try {
            const frontendResponse = await fetch(`/locales/${PRIMARY_LOCALE}.json`);
            if (frontendResponse.ok) {
                frontendTranslations = await frontendResponse.json();
            }
        } catch (error) {
            console.warn('Failed to load frontend translations:', error);
        }

        // Step 2: Load backend primary language (en) translations (fallback layer)
        if (lang !== PRIMARY_LOCALE) {
            try {
                const backendPrimaryResponse = await fetch(`/api/system/translations/${PRIMARY_LOCALE}`);
                if (backendPrimaryResponse.ok) {
                    const backendPrimaryData = await backendPrimaryResponse.json();
                    if (backendPrimaryData && typeof backendPrimaryData === 'object') {
                        if ('success' in backendPrimaryData && 'data' in backendPrimaryData && backendPrimaryData.success) {
                            backendPrimaryTranslations = (backendPrimaryData.data || {}) as Record<string, unknown>;
                        } else {
                            backendPrimaryTranslations = backendPrimaryData as Record<string, unknown>;
                        }
                    }
                }
            } catch (error) {
                console.warn('Failed to load backend primary translations:', error);
            }
        }

        // Step 3: Load backend language translations (top priority layer)
        try {
            const backendResponse = await fetch(`/api/system/translations/${lang}`);
            if (backendResponse.ok) {
                const backendData = await backendResponse.json();
                if (backendData && typeof backendData === 'object') {
                    if ('success' in backendData && 'data' in backendData && backendData.success) {
                        backendLangTranslations = (backendData.data || {}) as Record<string, unknown>;
                    } else {
                        backendLangTranslations = backendData as Record<string, unknown>;
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to load backend language translations:', error);
        }

        // Step 4: Merge translations in order: frontend (en) -> backend primary (en) -> backend language
        // This ensures backend language takes priority, missing keys fallback to backend primary, then frontend
        let mergedTranslations = frontendTranslations;
        if (Object.keys(backendPrimaryTranslations).length > 0) {
            mergedTranslations = deepMerge(mergedTranslations, backendPrimaryTranslations);
        }
        if (Object.keys(backendLangTranslations).length > 0) {
            mergedTranslations = deepMerge(mergedTranslations, backendLangTranslations);
        }

        setTranslations(mergedTranslations);
        const cacheKey = `translations_${lang}_${CACHE_VERSION}`;
        localStorage.setItem(cacheKey, JSON.stringify(mergedTranslations));

        setInitialLoading(false);
    }, []);

    // Load available languages from API
    const loadAvailableLanguages = useCallback(async () => {
        try {
            const response = await fetch('/api/system/translations/languages');
            if (response.ok) {
                const data = await response.json();
                console.log('[TranslationContext] Languages API response:', data);
                
                // Backend returns ApiResponse format: { success: true, data: [...], message: "..." }
                if (data && typeof data === 'object') {
                    if (data.success === true && Array.isArray(data.data)) {
                        // Proper ApiResponse format with languages array
                        setAvailableLanguages(data.data);
                        return;
                    } else if (Array.isArray(data)) {
                        // Direct array response (fallback)
                        setAvailableLanguages(data);
                        return;
                    } else if (data.data && Array.isArray(data.data)) {
                        // Data exists but success might be missing
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
            // API not available, keep default
        }
    }, []);

    // Initialize on mount
    useEffect(() => {
        loadFullTranslations(locale);
        loadAvailableLanguages();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [locale]); // loadFullTranslations and loadAvailableLanguages are stable (empty deps)

    // Change locale
    const setLocale = async (newLocale: string) => {
        setLoading(true);
        setLocaleState(newLocale);
        localStorage.setItem('locale', newLocale);
        await loadFullTranslations(newLocale);
        setLoading(false);
    };

    // Translation function with nested key support and parameter interpolation
    const t = useCallback(
        (key: string, params?: Record<string, string>): string => {
            const keys = key.split('.');
            let value: unknown = translations;

            for (const k of keys) {
                if (value && typeof value === 'object' && k in value) {
                    value = (value as Record<string, unknown>)[k];
                } else {
                    return key; // Return key if translation not found
                }
            }

            if (typeof value !== 'string') {
                return key;
            }

            // Replace parameters
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
