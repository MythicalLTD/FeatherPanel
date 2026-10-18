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
                'border-border bg-card/60 flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-4 py-12 text-center sm:py-16',
                className,
            )}
        >
            <div className='bg-primary/10 flex h-12 w-12 items-center justify-center rounded-lg'>
                <Icon className='text-primary h-6 w-6' />
            </div>
            <div className='max-w-md space-y-1.5'>
                <h2 className='text-lg font-semibold tracking-tight'>{title}</h2>
                {description ? <p className='text-muted-foreground text-sm leading-relaxed'>{description}</p> : null}
            </div>
            {action && <div className='mt-2'>{action}</div>}
        </div>
    );
}
