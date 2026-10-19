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
import { usePathname } from 'next/navigation';
import { useMemo } from 'react';
import { ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { useNavigation } from '@/hooks/useNavigation';
import { useSettings } from '@/contexts/SettingsContext';
import { getAdminNavigationItems } from '@/config/navigation';
import { buildAdminBreadcrumbs } from '@/lib/admin-breadcrumbs';
import { cn } from '@/lib/utils';

/** "Admin › Infrastructure › Nodes › Edit" above admin sub-pages. Hidden on /admin itself. */
export function AdminBreadcrumbs({ className }: { className?: string }) {
    const pathname = usePathname() || '';
    const { t } = useTranslation();
    const { navigationItems } = useNavigation();
    const { settings } = useSettings();

    // The sidebar can leave pages out (a dismissed Pterodactyl importer, for instance) that should
    // still get a proper trail, so the full admin list backs it up. Sidebar entries win on ties.
    const crumbs = useMemo(
        () => buildAdminBreadcrumbs(pathname, [...navigationItems, ...getAdminNavigationItems(t, settings)], t),
        [pathname, navigationItems, settings, t],
    );
    if (crumbs.length < 2) return null;

    return (
        <nav aria-label={t('breadcrumbs.label')} className={cn('fp-breadcrumbs min-w-0', className)}>
            <ol className='text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs leading-5'>
                {crumbs.map((crumb, i) => {
                    const last = i === crumbs.length - 1;
                    return (
                        <li
                            key={`${i}-${crumb.label}`}
                            className={cn(
                                'flex min-w-0 items-center gap-1.5',
                                // Section names are context, not destinations: drop them first on phones.
                                crumb.kind === 'section' && 'hidden sm:flex',
                            )}
                        >
                            {i > 0 ? <ChevronRight className='h-3 w-3 shrink-0 opacity-40' aria-hidden /> : null}
                            {crumb.href && !last ? (
                                <Link
                                    href={crumb.href}
                                    className='hover:text-primary focus-visible:ring-ring max-w-48 truncate rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span
                                    className={cn(
                                        'max-w-56 truncate',
                                        last ? 'text-foreground font-medium' : 'opacity-80',
                                    )}
                                    aria-current={last ? 'page' : undefined}
                                >
                                    {crumb.label}
                                </span>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}
