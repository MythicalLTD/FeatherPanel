/*
This file is part of FeatherPanel.
 */

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

import Link from 'next/link';
import { useMemo } from 'react';
import { useParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useWebSpacePermissions } from '@/hooks/useWebSpacePermissions';
import { WebSpaceSubuserPermissions } from '@/lib/webspace-permissions';
import { useTranslation } from '@/contexts/TranslationContext';
import { usePluginRoutes } from '@/hooks/usePluginRoutes';
import type { PluginSidebarItem } from '@/types/navigation';

const tabDefs = [
    { href: '', labelKey: 'webSpaces.nav.overview', permission: null },
    { href: '/console', labelKey: 'webSpaces.nav.console', permission: 'console.output' },
    { href: '/files', labelKey: 'webSpaces.nav.files', permission: 'file.read' },
    { href: '/backups', labelKey: 'webSpaces.nav.backups', permission: 'backup.read' },
    { href: '/schedules', labelKey: 'webSpaces.nav.schedules', permission: 'schedule.read' },
    { href: '/databases', labelKey: 'webSpaces.nav.databases', permission: 'database.read' },
    { href: '/email', labelKey: 'webSpaces.nav.email', permission: 'mail.read' },
    { href: '/activities', labelKey: 'webSpaces.nav.activity', permission: 'activity.read' },
    { href: '/users', labelKey: 'webSpaces.nav.users', permission: 'user.read' },
    { href: '/settings', labelKey: 'webSpaces.nav.settings', permission: 'settings.read' },
];

type NavTab = {
    key: string;
    href: string;
    label: string;
    permission: string | null;
};

function pluginItemHref(base: string, url: string, item: PluginSidebarItem): string {
    let processed = url;
    if (processed.startsWith('/webspace')) {
        processed = processed.replace('/webspace', '');
    }
    const redirect = item.redirect;
    let path = redirect || processed;
    if (path.startsWith('/webspace')) {
        path = path.replace('/webspace', '');
    }
    const clean = path.startsWith('/') ? path : `/${path}`;
    return `${base}${clean}`;
}

export function WebSpaceNav() {
    const params = useParams();
    const pathname = usePathname();
    const { t } = useTranslation();
    const uuidShort = String(params.uuidShort || '');
    const base = `/webspace/${uuidShort}`;
    const { hasPermission } = useWebSpacePermissions(uuidShort);
    const pluginRoutes = usePluginRoutes();

    const tabs = useMemo(() => {
        const builtIn: NavTab[] = tabDefs
            .filter((tab) => {
                if (!tab.permission) return true;
                const perm = WebSpaceSubuserPermissions[tab.permission as keyof typeof WebSpaceSubuserPermissions];
                return hasPermission(perm || tab.permission);
            })
            .map((tab) => ({
                key: tab.href || 'overview',
                href: `${base}${tab.href}`,
                label: t(tab.labelKey),
                permission: tab.permission,
            }));

        const pluginItems = pluginRoutes?.webspace ? Object.entries(pluginRoutes.webspace) : [];
        const pluginTabs: NavTab[] = pluginItems
            .filter(([, item]) => {
                if (!item.permission) return true;
                return hasPermission(item.permission);
            })
            .sort(([, a], [, b]) => (a.priority ?? 9999) - (b.priority ?? 9999))
            .map(([url, item]) => ({
                key: `plugin-${item.plugin}-${url}`,
                href: pluginItemHref(base, url, item),
                label: item.name,
                permission: item.permission ?? null,
            }));

        return [...builtIn, ...pluginTabs];
    }, [base, hasPermission, pluginRoutes?.webspace, t]);

    return (
        <nav className='border-border flex flex-wrap gap-1 border-b pb-2'>
            {tabs.map((tab) => {
                const active =
                    tab.key === 'overview'
                        ? pathname === base || pathname === `${base}/`
                        : pathname === tab.href || pathname.startsWith(`${tab.href}/`);
                return (
                    <Link
                        key={tab.key}
                        href={tab.href}
                        className={cn(
                            'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                            active
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                        )}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </nav>
    );
}
