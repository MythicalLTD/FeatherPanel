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
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface PageHeaderProps {
    title: string;
    description?: React.ReactNode;
    icon?: LucideIcon | ComponentType<{ className?: string }>;
    actions?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, icon: Icon, actions, className }: PageHeaderProps) {
    // Every page header sits on the same glass card (admin, account, server, WebSpace...), so the
    // top of a page looks the same wherever you are.
    return (
        <div
            className={cn(
                'fp-surface flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-xl border p-4 sm:p-5',
                className,
            )}
        >
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
}
