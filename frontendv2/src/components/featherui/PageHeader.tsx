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
    return (
        <div className={cn('flex flex-wrap items-center justify-between gap-x-6 gap-y-3 pt-2', className)}>
            <div className='flex max-w-full min-w-0 items-center gap-3 sm:gap-4'>
                {Icon && (
                    <div className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg sm:h-12 sm:w-12'>
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
                <div className='fp-page-header-actions flex max-w-full flex-wrap items-center gap-2'>{actions}</div>
            )}
        </div>
    );
}
