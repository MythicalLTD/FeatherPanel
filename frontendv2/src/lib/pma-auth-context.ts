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

import type { AppSettings } from '@/types/settings';

const PMA_AUTH_CONTEXT_KEY = 'fp_pma_auth';
const PMA_AUTH_CONTEXT_VERSION = 1;

export type PmaAuthContext = {
    version: number;
    locale: string;
    theme: 'light' | 'dark';
    accentColor: string;
    fontFamily: string;
    branding: {
        appName: string;
        logoDark: string;
        logoWhite: string;
        appUrl: string;
        showPoweredBy: boolean;
    };
    strings: {
        pageTitleLogin: string;
        pageTitleError: string;
        pageTitleLogout: string;
        databaseManagement: string;
        connecting: string;
        authenticating: string;
        loggingOut: string;
        loggingOutMessage: string;
        authError: string;
        poweredBy: string;
        loading: string;
    };
};

type TranslateFn = (key: string, params?: Record<string, string>) => string;

export function preparePmaAuthContext(
    settings: AppSettings | null | undefined,
    t: TranslateFn,
    locale: string,
): PmaAuthContext {
    const theme = (typeof window !== 'undefined' ? localStorage.getItem('theme') : null) as 'light' | 'dark' | null;
    const accentColor = (typeof window !== 'undefined' ? localStorage.getItem('accentColor') : null) || 'purple';
    const fontFamily = (typeof window !== 'undefined' ? localStorage.getItem('fontFamily') : null) || 'inter';

    return {
        version: PMA_AUTH_CONTEXT_VERSION,
        locale,
        theme: theme === 'light' ? 'light' : 'dark',
        accentColor,
        fontFamily,
        branding: {
            appName: settings?.app_name?.trim() || 'FeatherPanel',
            logoDark: settings?.app_logo_dark?.trim() || '',
            logoWhite: settings?.app_logo_white?.trim() || '',
            appUrl: settings?.website_url?.trim() || settings?.app_url?.trim() || '/',
            showPoweredBy: (settings?.branding_show_powered_by ?? 'true') === 'true',
        },
        strings: {
            pageTitleLogin: t('serverDatabases.pmaAuth.pageTitleLogin'),
            pageTitleError: t('serverDatabases.pmaAuth.pageTitleError'),
            pageTitleLogout: t('serverDatabases.pmaAuth.pageTitleLogout'),
            databaseManagement: t('serverDatabases.pmaAuth.databaseManagement'),
            connecting: t('serverDatabases.pmaAuth.connecting'),
            authenticating: t('serverDatabases.pmaAuth.authenticating'),
            loggingOut: t('serverDatabases.pmaAuth.loggingOut'),
            loggingOutMessage: t('serverDatabases.pmaAuth.loggingOutMessage'),
            authError: t('serverDatabases.pmaAuth.authError'),
            poweredBy: t('serverDatabases.pmaAuth.poweredBy', {
                name: settings?.app_name?.trim() || 'FeatherPanel',
            }),
            loading: t('serverDatabases.pmaAuth.loading'),
        },
    };
}

export function storePmaAuthContext(context: PmaAuthContext): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(PMA_AUTH_CONTEXT_KEY, JSON.stringify(context));
}

export function appendPmaAuthParams(url: string, locale: string): string {
    try {
        const parsed = new URL(url, window.location.origin);
        parsed.searchParams.set('lang', locale);
        return parsed.toString();
    } catch {
        const separator = url.includes('?') ? '&' : '?';
        return `${url}${separator}lang=${encodeURIComponent(locale)}`;
    }
}
