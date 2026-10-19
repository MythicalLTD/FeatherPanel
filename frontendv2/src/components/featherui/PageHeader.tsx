/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import React, { ComponentType } from 'react';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { AdminBreadcrumbs } from '@/components/admin/AdminBreadcrumbs';

interface PageHeaderProps {
    title: string;
    description?: React.ReactNode;
    icon?: LucideIcon | ComponentType<{ className?: string }>;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
    // Admin pages put the header on a glass card, like the Admin Home hero.
    const pathname = usePathname() ?? '';
    const carded = pathname.startsWith('/admin');
    // On admin sub-pages the breadcrumb trail sits inside the header card (the shell hides its own copy).
    const withCrumbs = pathname.startsWith('/admin/');
    const row = (
        <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3', !carded && className)}>
            <div className='flex max-w-full min-w-0 items-center gap-3 sm:gap-4'>
                {Icon && (
                    <div className='fp-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12'>
                        <Icon className='h-5 w-5 sm:h-6 sm:w-6' />
                    </div>
                )}
                <div className='min-w-0 space-y-1'>
                    <h1 className='text-xl font-semibold tracking-tight sm:text-2xl'>{title}</h1>
                    {description && (
                        <div className='text-muted-foreground max-w-3xl text-sm [overflow-wrap:anywhere]'>
                            {description}
                        </div>
                    )}
                </div>
            </div>
            {actions && (
                <div className='fp-page-header-actions flex max-w-full flex-wrap items-center gap-2 [&>div]:max-w-full [&>div]:flex-wrap'>
                    {actions}
                </div>
            )}
        </div>
    );
    if (!carded) return row;
    return (
        <div data-fp-page-header className={cn('fp-surface w-full rounded-2xl border p-4 sm:p-5', className)}>
            {withCrumbs ? (
                <AdminBreadcrumbs className='mb-3 border-b border-[var(--fp-surface-border)] pb-2.5' />
            ) : null}
            {row}
        </div>
    );
}
