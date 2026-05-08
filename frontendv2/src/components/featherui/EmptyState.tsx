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

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptyStateProps {
    title: string;
    description: string;
    icon: LucideIcon;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'bg-card/10 flex flex-col items-center justify-center space-y-8 rounded-[3rem] py-24 text-center backdrop-blur-sm',
                className,
            )}
        >
            <div className='relative'>
                <div className='bg-primary/20 absolute inset-0 scale-150 animate-pulse rounded-full blur-3xl' />
                <div className='bg-primary/10 relative flex h-32 w-32 rotate-3 items-center justify-center rounded-3xl'>
                    <Icon className='text-primary h-16 w-16' />
                </div>
            </div>
            <div className='max-w-md space-y-3 px-4'>
                <h2 className='text-3xl font-black tracking-tight uppercase'>{title}</h2>
                <p className='text-muted-foreground text-lg leading-relaxed font-medium'>{description}</p>
            </div>
            {action && <div className='mt-8'>{action}</div>}
        </div>
    );
}
