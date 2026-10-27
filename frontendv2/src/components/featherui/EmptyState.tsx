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
    description?: string;
    icon: LucideIcon;
    action?: React.ReactNode;
    className?: string;
}

export function EmptyState({ title, description, icon: Icon, action, className }: EmptyStateProps) {
    return (
        <div
            className={cn(
                'fp-surface fp-empty relative flex flex-col items-center justify-center gap-4 overflow-hidden rounded-xl border border-dashed px-4 py-12 text-center sm:py-16',
                className,
            )}
        >
            {/* Small CSS illustration: soft theme glow, two rings and a floating icon tile. */}
            <div aria-hidden className='fp-empty-art relative flex h-24 w-24 items-center justify-center'>
                <span className='bg-primary/15 absolute inset-2 rounded-full blur-xl' />
                <span className='border-primary/15 absolute inset-0 rounded-full border' />
                <span className='border-primary/25 absolute inset-4 rounded-full border border-dashed' />
                <span className='fp-icon-tile fp-empty-icon relative flex h-12 w-12 items-center justify-center rounded-2xl shadow-lg'>
                    <Icon className='h-6 w-6' />
                </span>
            </div>
            <div className='max-w-md space-y-1.5'>
                <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
                {description ? <p className='text-muted-foreground text-sm leading-relaxed'>{description}</p> : null}
            </div>
            {action && <div className='mt-2'>{action}</div>}
        </div>
    );
}
