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

import type { LucideIcon } from 'lucide-react';
import { SearchX } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TabSectionProps {
    title?: string;
    description?: string;
    action?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
}

export function TabSection({ title, description, action, children, className, contentClassName }: TabSectionProps) {
    return (
        <section className={cn('space-y-3', className)}>
            {(title || description || action) && (
                <div className='flex items-start justify-between gap-4'>
                    <div className='space-y-1'>
                        {title && <h3 className='text-foreground text-sm font-semibold tracking-tight'>{title}</h3>}
                        {description && <p className='text-muted-foreground text-xs leading-relaxed'>{description}</p>}
                    </div>
                    {action && <div className='shrink-0'>{action}</div>}
                </div>
            )}
            <div className={cn('space-y-2.5', contentClassName)}>{children}</div>
        </section>
    );
}

interface TabToolbarProps {
    children: React.ReactNode;
    className?: string;
}

export function TabToolbar({ children, className }: TabToolbarProps) {
    return (
        <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}>
            {children}
        </div>
    );
}

interface TabTableShellProps {
    children: React.ReactNode;
    className?: string;
}

export function TabTableShell({ children, className }: TabTableShellProps) {
    return (
        <div className={cn('border-border/50 bg-muted/20 overflow-hidden rounded-xl border', className)}>
            {children}
        </div>
    );
}

interface TabBlankStateProps {
    title: string;
    description?: string;
    icon?: LucideIcon;
    action?: React.ReactNode;
    className?: string;
}

export function TabBlankState({ title, description, icon: Icon = SearchX, action, className }: TabBlankStateProps) {
    return (
        <div
            className={cn(
                'border-border/50 bg-muted/30 rounded-xl border border-dashed px-6 py-12 text-center',
                className,
            )}
        >
            <div className='border-primary/20 bg-primary/10 mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border'>
                <Icon className='text-primary h-5 w-5' />
            </div>
            <h3 className='text-sm font-semibold tracking-tight'>{title}</h3>
            {description && (
                <p className='text-muted-foreground mx-auto mt-2 max-w-md text-xs leading-relaxed'>{description}</p>
            )}
            {action && <div className='mt-5 flex justify-center'>{action}</div>}
        </div>
    );
}

interface TabHintCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    className?: string;
}

export function TabHintCard({ title, description, icon: Icon, className }: TabHintCardProps) {
    return (
        <div className={cn('border-border/50 bg-muted/30 space-y-3 rounded-xl border p-4', className)}>
            <div className='flex items-center gap-3'>
                <div className='border-primary/20 bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border'>
                    <Icon className='text-primary h-4 w-4' />
                </div>
                <h4 className='text-sm font-medium tracking-tight'>{title}</h4>
            </div>
            <p className='text-muted-foreground text-xs leading-relaxed'>{description}</p>
        </div>
    );
}
