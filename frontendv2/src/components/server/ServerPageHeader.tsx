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
import { useParams, usePathname } from 'next/navigation';
import type { ComponentType, ReactNode } from 'react';
import {
    Archive,
    ArrowRightLeft,
    Calendar,
    ChevronRight,
    Clock,
    Database,
    Download,
    Folder,
    Globe,
    Network,
    PlayCircle,
    Settings,
    ShieldCheck,
    SquareTerminal,
    Upload,
    Users,
    Workflow,
    type LucideIcon,
} from 'lucide-react';
import { useServer } from '@/contexts/ServerContext';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

/** Same icons as the server sidebar, so the header and the active nav item always match. */
const SECTION_ICONS: Record<string, LucideIcon> = {
    activities: Clock,
    files: Folder,
    databases: Database,
    backups: Archive,
    import: Upload,
    schedules: Calendar,
    'lifecycle-hooks': Workflow,
    users: Users,
    startup: PlayCircle,
    settings: Settings,
    allocations: Network,
    firewall: ShieldCheck,
    proxy: ArrowRightLeft,
    fastdl: Download,
    subdomains: Globe,
};

/** Translation keys of the sidebar labels, for the section crumb on nested pages. */
const SECTION_LABEL_KEYS: Record<string, string> = {
    'lifecycle-hooks': 'lifecycleHooks',
};

export interface ServerPageCrumb {
    label: string;
    href?: string;
}

interface ServerPageHeaderProps {
    title: string;
    description?: ReactNode;
    /** Defaults to the sidebar icon of the current section. */
    icon?: LucideIcon | ComponentType<{ className?: string }>;
    actions?: ReactNode;
    /** Extra crumbs between the server and the title (e.g. Schedules on a schedule's edit page). */
    crumbs?: ServerPageCrumb[];
    className?: string;
    /** Optional row under the title (filters, tabs). Prefer ServerPageToolbar below the header. */
    children?: ReactNode;
}

/**
 * Header card shared by every server page: breadcrumbs (Dashboard > server > page), icon, title,
 * short description and actions. Stacks on phones; actions wrap instead of overflowing.
 */
export function ServerPageHeader({
    title,
    description,
    icon,
    actions,
    crumbs = [],
    className,
    children,
}: ServerPageHeaderProps) {
    const { t } = useTranslation();
    const params = useParams<{ uuidShort?: string }>();
    const pathname = usePathname() ?? '';
    const serverName = useServer().server?.name;
    const uuidShort = params?.uuidShort;
    const section = pathname.split('/')[3] ?? '';
    const Icon = icon ?? SECTION_ICONS[section] ?? SquareTerminal;

    const segments = pathname.split('/').filter(Boolean);
    // Nested pages (schedules/5/edit, backups/new...) link back to their section.
    const sectionCrumb: ServerPageCrumb[] =
        segments.length > 3 && uuidShort && SECTION_ICONS[section]
            ? [
                  {
                      label: t(`navigation.items.${SECTION_LABEL_KEYS[section] ?? section}`),
                      href: `/server/${uuidShort}/${section}`,
                  },
              ]
            : [];
    const trail: ServerPageCrumb[] = [
        { label: t('navigation.items.dashboard'), href: '/dashboard' },
        { label: serverName || uuidShort || t('common.loading'), href: uuidShort ? `/server/${uuidShort}` : undefined },
        ...sectionCrumb,
        ...crumbs,
    ];

    return (
        <section className={cn('fp-surface rounded-xl border px-4 py-3 sm:px-5 sm:py-4', className)}>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between'>
                <div className='flex min-w-0 items-center gap-3'>
                    <div className='fp-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                        <Icon className='h-5 w-5' aria-hidden />
                    </div>
                    <div className='min-w-0'>
                        <nav aria-label={t('breadcrumbs.label')} className='min-w-0'>
                            <ol className='text-muted-foreground flex min-w-0 items-center gap-1 text-xs'>
                                {trail.map((crumb, i) => (
                                    <li
                                        key={i}
                                        // On phones only the server crumb stays, the rest is in the sidebar anyway.
                                        className={cn('flex min-w-0 items-center gap-1', i !== 1 && 'max-sm:hidden')}
                                    >
                                        {crumb.href ? (
                                            <Link
                                                href={crumb.href}
                                                className='hover:text-foreground max-w-40 truncate transition-colors'
                                            >
                                                {crumb.label}
                                            </Link>
                                        ) : (
                                            <span className='max-w-40 truncate'>{crumb.label}</span>
                                        )}
                                        <ChevronRight className='h-3 w-3 shrink-0 opacity-60' aria-hidden />
                                    </li>
                                ))}
                                <li aria-current='page' className='text-foreground min-w-0 truncate font-medium'>
                                    {title}
                                </li>
                            </ol>
                        </nav>
                        <h1 className='truncate text-base leading-tight font-semibold tracking-tight sm:text-lg'>
                            {title}
                        </h1>
                        {description && (
                            <div className='text-muted-foreground line-clamp-2 text-xs sm:text-sm'>{description}</div>
                        )}
                    </div>
                </div>
                {actions && (
                    <div className='flex shrink-0 flex-wrap items-center gap-2 sm:justify-end [&>div]:flex-wrap'>
                        {actions}
                    </div>
                )}
            </div>

            {children && <div className='border-border/60 mt-3 border-t pt-3'>{children}</div>}
        </section>
    );
}

/** Filter/search card that sits directly under a ServerPageHeader. */
export function ServerPageToolbar({ children, className }: { children: ReactNode; className?: string }) {
    return <div className={cn('fp-surface space-y-3 rounded-xl border p-3 sm:p-4', className)}>{children}</div>;
}
