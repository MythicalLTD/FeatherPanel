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
import { buildAdminBreadcrumbs } from '@/lib/admin-breadcrumbs';
import { cn } from '@/lib/utils';

/** "Admin › Infrastructure › Nodes › Edit" above admin sub-pages. Hidden on /admin itself. */
export function AdminBreadcrumbs({ className }: { className?: string }) {
    const pathname = usePathname() || '';
    const { t } = useTranslation();
    const { navigationItems } = useNavigation();

    const crumbs = useMemo(() => buildAdminBreadcrumbs(pathname, navigationItems, t), [pathname, navigationItems, t]);
    if (crumbs.length < 2) return null;

    return (
        <nav aria-label={t('breadcrumbs.label')} className={cn('min-w-0', className)}>
            <ol className='text-muted-foreground flex min-w-0 flex-wrap items-center gap-x-1 gap-y-0.5 text-xs sm:text-sm'>
                {crumbs.map((crumb, i) => {
                    const last = i === crumbs.length - 1;
                    return (
                        <li
                            key={`${i}-${crumb.label}`}
                            className={cn(
                                'flex min-w-0 items-center gap-1',
                                // Section names are context, not destinations: drop them first on phones.
                                crumb.kind === 'section' && 'hidden sm:flex',
                            )}
                        >
                            {i > 0 ? <ChevronRight className='h-3.5 w-3.5 shrink-0 opacity-60' aria-hidden /> : null}
                            {crumb.href && !last ? (
                                <Link
                                    href={crumb.href}
                                    className='hover:text-foreground focus-visible:ring-ring max-w-48 truncate rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none'
                                >
                                    {crumb.label}
                                </Link>
                            ) : (
                                <span
                                    className={cn('max-w-48 truncate', last && 'text-foreground font-medium')}
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
