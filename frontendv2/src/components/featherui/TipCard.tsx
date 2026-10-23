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

import React, { type ComponentType } from 'react';
import { Lightbulb } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TipCardProps {
    title?: React.ReactNode;
    icon?: ComponentType<{ className?: string }>;
    children: React.ReactNode;
    /** Tints the icon only; the card surface stays the same across variants. */
    variant?: 'default' | 'warning' | 'danger';
    className?: string;
}

const iconTone = {
    default: 'fp-icon-tile text-primary',
    warning: 'bg-amber-500/12 text-amber-500',
    danger: 'bg-red-500/12 text-red-500',
};

/** The one "what is this page / tips" card used across the admin area. */
export function TipCard({ title, icon: Icon = Lightbulb, children, variant = 'default', className }: TipCardProps) {
    return (
        <section className={cn('fp-surface-solid flex gap-3 rounded-xl border p-4', className)}>
            <div
                className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--fp-surface-tint))]',
                    iconTone[variant],
                )}
            >
                <Icon className='h-4 w-4' />
            </div>
            <div className='min-w-0 flex-1 space-y-1.5'>
                {title ? <h3 className='text-foreground text-sm font-semibold'>{title}</h3> : null}
                <div className='text-muted-foreground text-sm leading-relaxed [&_li]:leading-relaxed [&_p]:text-sm [&_ul]:space-y-1'>
                    {children}
                </div>
            </div>
        </section>
    );
}

/** Lays tip cards out in a consistent responsive grid at the bottom of a page. */
export function TipGrid({ children, className }: { children: React.ReactNode; className?: string }) {
    return <div className={cn('grid gap-3 md:grid-cols-2 xl:grid-cols-3', className)}>{children}</div>;
}
