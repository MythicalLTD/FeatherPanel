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

type SnapshotUser = {
    uuid?: string;
    username?: string;
    email?: string;
    role_id?: number;
} | null;

export function buildPanelDebugSnapshot(opts: {
    pathname: string;
    locale: string;
    user: SnapshotUser;
    settings: AppSettings | null;
    storageKeys?: string[];
}): Record<string, unknown> {
    const nav = typeof navigator !== 'undefined' ? navigator : null;
    const win = typeof window !== 'undefined' ? window : null;
    const conn =
        nav && 'connection' in nav
            ? (nav as Navigator & { connection?: { effectiveType?: string; downlink?: number; rtt?: number } })
                  .connection
            : undefined;
    const perfMemory =
        typeof performance !== 'undefined' && 'memory' in performance
            ? (
                  performance as Performance & {
                      memory?: { usedJSHeapSize?: number; totalJSHeapSize?: number; jsHeapSizeLimit?: number };
                  }
              ).memory
            : undefined;

    return {
        generatedAt: new Date().toISOString(),
        panel: {
            name: opts.settings?.app_name ?? 'FeatherPanel',
            url: opts.settings?.app_url ?? null,
            developerMode: opts.settings?.app_developer_mode ?? null,
        },
        route: {
            pathname: opts.pathname,
            href: win?.location.href ?? null,
            origin: win?.location.origin ?? null,
        },
        session: {
            locale: opts.locale,
            user: opts.user
                ? {
                      uuid: opts.user.uuid,
                      username: opts.user.username,
                      email: opts.user.email,
                      role_id: opts.user.role_id,
                  }
                : null,
        },
        client: {
            userAgent: nav?.userAgent ?? null,
            platform: nav?.platform ?? null,
            language: nav?.language ?? null,
            languages: nav?.languages ?? null,
            cookieEnabled: nav?.cookieEnabled ?? null,
            onLine: nav?.onLine ?? null,
            viewport: win ? { width: win.innerWidth, height: win.innerHeight, dpr: win.devicePixelRatio } : null,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            colorScheme: win?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light',
            connection: conn ? { effectiveType: conn.effectiveType, downlink: conn.downlink, rtt: conn.rtt } : null,
            memory: perfMemory
                ? {
                      usedJSHeapSize: perfMemory.usedJSHeapSize,
                      totalJSHeapSize: perfMemory.totalJSHeapSize,
                      jsHeapSizeLimit: perfMemory.jsHeapSizeLimit,
                  }
                : null,
        },
        storage: {
            localStorageKeys: opts.storageKeys ?? [],
            sessionStorageKeys:
                typeof sessionStorage !== 'undefined'
                    ? Array.from({ length: sessionStorage.length }, (_, i) => sessionStorage.key(i)).filter(Boolean)
                    : [],
        },
    };
}
