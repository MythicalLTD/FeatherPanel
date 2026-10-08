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
        <div className={cn('flex flex-wrap items-end justify-between gap-x-6 gap-y-4 pt-4', className)}>
            <div className='flex max-w-full min-w-0 items-center gap-4 sm:gap-6'>
                {Icon && (
                    <div className='bg-primary/10 text-primary border-primary/20 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border sm:h-20 sm:w-20'>
                        <Icon className='h-7 w-7 sm:h-10 sm:w-10' />
                    </div>
                )}
                <div className='min-w-0 space-y-1 sm:space-y-2'>
                    <h1 className='text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl'>{title}</h1>
                    {description && (
                        <div className='text-muted-foreground text-sm font-medium [overflow-wrap:anywhere] opacity-80 sm:text-base lg:text-lg'>
                            {description}
                        </div>
                    )}
                </div>
            </div>
            {actions && <div className='flex max-w-full flex-wrap items-center gap-2'>{actions}</div>}
        </div>
    );
}
