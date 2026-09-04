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
import { readFile } from 'fs/promises';
import path from 'path';
import type { AppSettings, CoreInfo } from '@/types/settings';
import { getBaseUrl, settingsApi } from '@/lib/settings-api';
import { ICON_LIBRARY_COOKIE_NAME, LOCALE_COOKIE_NAME } from '@/lib/locale-constants';
import type { IconLibrary } from '@/lib/iconLibrary';

export { LOCALE_COOKIE_NAME, ICON_LIBRARY_COOKIE_NAME };

export type ServerBootData = {
    settings: AppSettings | null;
    core: CoreInfo | null;
    locale: string;
    translations: Record<string, unknown>;
    iconLibrary: IconLibrary;
};

const DEFAULT_LOCALE = 'en';
const PRIMARY_LOCALE = 'en';

function normalizeLocaleCode(code: string): string {
    return code.trim().toLowerCase().replace(/_/g, '-');
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

function isPlainCatalog(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

/**
 * Backend `/api/system/translations/{lang}` returns the catalog via sendManualResponse
 * (raw JSON object). Admin APIs may wrap with `{ success, data }`. Empty installs can
 * return `[]`.
 */
function unwrapTranslationCatalog(data: unknown): Record<string, unknown> {
    if (!isPlainCatalog(data)) return {};

    if (data.success === true && isPlainCatalog(data.data)) {
        return data.data;
    }

    // Raw catalog from System\TranslationsController::sendManualResponse
    if (typeof data.success !== 'boolean') {
        return data;
    }

    return {};
}

async function readJsonCatalog(filePath: string): Promise<Record<string, unknown> | null> {
    try {
        const raw = await readFile(filePath, 'utf8');
        const parsed: unknown = JSON.parse(raw);
        if (!isPlainCatalog(parsed) || Object.keys(parsed).length === 0) return null;
        return parsed;
    } catch {
        return null;
    }
}

/** Shipped Next public catalog (usually only `en.json`). */
async function loadFrontendLocale(lang: string): Promise<Record<string, unknown> | null> {
    return readJsonCatalog(path.join(process.cwd(), 'public', 'locales', `${lang}.json`));
}

/**
 * Installed/custom langs from FeatherCloud / admin upload live in
 * `backend/public/translations/{lang}.json`. Prefer the system API (works in Docker
 * via INTERNAL_API_URL); fall back to sibling filesystem paths for local monorepo.
 */
async function loadBackendTranslations(lang: string): Promise<Record<string, unknown>> {
    const normalized = normalizeLocaleCode(lang) || PRIMARY_LOCALE;

    try {
        const res = await fetch(`${getBaseUrl()}/api/system/translations/${encodeURIComponent(normalized)}`, {
            // Short cache — admins can install new locales from FeatherCloud at any time.
            next: { revalidate: 30, tags: ['translations', `translations:${normalized}`] },
            headers: {
                Accept: 'application/json',
            },
        });
        if (res.ok) {
            const catalog = unwrapTranslationCatalog(await res.json());
            if (Object.keys(catalog).length > 0) return catalog;
        }
    } catch {
        // Fall through to filesystem paths.
    }

    const candidates = [
        process.env.TRANSLATIONS_DIR ? path.join(process.env.TRANSLATIONS_DIR, `${normalized}.json`) : null,
        // Local monorepo: frontendv2/ → ../backend/public/translations
        path.join(process.cwd(), '..', 'backend', 'public', 'translations', `${normalized}.json`),
        path.join(process.cwd(), 'backend', 'public', 'translations', `${normalized}.json`),
    ].filter(Boolean) as string[];

    for (const filePath of candidates) {
        const catalog = await readJsonCatalog(filePath);
        if (catalog) return catalog;
    }

    return {};
}

function resolveLocale(cookieLocale: string | null | undefined, settings: AppSettings | null): string {
    const adminDefault = normalizeLocaleCode(settings?.app_locale_default || '') || DEFAULT_LOCALE;
    const locked = settings?.app_locale_lock === 'true';
    if (locked) return adminDefault;

    const fromCookie = cookieLocale ? normalizeLocaleCode(cookieLocale) : '';
    if (fromCookie) return fromCookie;
    return adminDefault;
}

function resolveIconLibrary(cookieValue: string | null | undefined): IconLibrary {
    const raw = String(cookieValue || '')
        .trim()
        .toLowerCase();
    if (raw === 'tabler' || raw === 'mdi' || raw === 'phosphor' || raw === 'lucide') {
        return raw;
    }
    return 'lucide';
}

/**
 * Mirror client TranslationContext merge order:
 * 1) frontend `/locales/{lang|en}.json` base
 * 2) backend primary (`en`) overlays (custom/admin strings)
 * 3) backend selected locale overlays (installed FeatherCloud / uploaded langs)
 */
export const getServerBootData = cache(
    async (cookieLocale?: string | null, cookieIconLibrary?: string | null): Promise<ServerBootData> => {
        const publicSettings = await settingsApi.getPublicSettings();
        const settings = publicSettings?.settings ?? null;
        const core = publicSettings?.core ?? null;
        const locale = resolveLocale(cookieLocale, settings);
        const iconLibrary = resolveIconLibrary(cookieIconLibrary);

        let translations = (await loadFrontendLocale(locale)) || (await loadFrontendLocale(PRIMARY_LOCALE)) || {};

        // Backend catalogs are the source of truth for downloaded/custom languages.
        const backendPrimary = await loadBackendTranslations(PRIMARY_LOCALE);
        if (Object.keys(backendPrimary).length > 0) {
            translations = deepMerge(translations, backendPrimary);
        }

        if (locale !== PRIMARY_LOCALE) {
            const backendLang = await loadBackendTranslations(locale);
            if (Object.keys(backendLang).length > 0) {
                translations = deepMerge(translations, backendLang);
            }
        }

        return {
            settings,
            core,
            locale,
            translations,
            iconLibrary,
        };
    },
);
