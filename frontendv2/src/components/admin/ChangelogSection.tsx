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
import { cn } from '@/lib/utils';

interface ChangelogSectionProps {
    title: string;
    items: string[];
    color: 'emerald' | 'blue' | 'purple' | 'amber' | 'red';
    icon: string;
}

export function ChangelogSection({ title, items, color, icon }: ChangelogSectionProps) {
    if (!items || items.length === 0) return null;

    const colorClasses = {
        emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
        blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
        purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
        amber: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
        red: 'text-red-500 bg-red-500/10 border-red-500/20',
    };

    const dotClasses = {
        emerald: 'bg-emerald-500',
        blue: 'bg-blue-500',
        purple: 'bg-purple-500',
        amber: 'bg-amber-500',
        red: 'bg-red-500',
    };

    return (
        <div className='space-y-3 md:space-y-4'>
            <div className='flex items-center gap-2'>
                <div
                    className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border text-[10px] font-bold md:h-6 md:w-6 md:text-xs',
                        colorClasses[color],
                    )}
                >
                    {icon}
                </div>
                <h4 className='text-muted-foreground truncate text-xs font-bold tracking-wider uppercase md:text-sm'>
                    {title}
                </h4>
            </div>
            <ul className='space-y-2'>
                {items.map((item, index) => (
                    <li key={index} className='group flex items-start gap-2 md:gap-3'>
                        <div
                            className={cn(
                                'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full opacity-40 transition-opacity group-hover:opacity-100',
                                dotClasses[color],
                            )}
                        />
                        <span className='wrap-break-words text-xs leading-relaxed md:text-sm'>{item}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}
