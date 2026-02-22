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
        <div className={cn('flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4', className)}>
            <div className='flex items-center gap-6'>
                {Icon && (
                    <div className='h-20 w-20 rounded-[2.5rem] bg-primary/10 flex items-center justify-center text-primary border border-primary/20  shrink-0'>
                        <Icon className='h-10 w-10' />
                    </div>
                )}
                <div className='space-y-2'>
                    <h1 className='text-4xl font-black tracking-tight uppercase'>{title}</h1>
                    {description && (
                        <div className='flex items-center gap-3 text-muted-foreground'>
                            <div className='text-lg opacity-80 font-medium'>{description}</div>
                        </div>
                    )}
                </div>
            </div>
            {actions && <div className='flex items-center gap-2'>{actions}</div>}
        </div>
    );
}
