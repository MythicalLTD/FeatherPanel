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

'use client';

import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

/** Small toolbar dropdown (sort and similar) with checkable items. */
export function DashboardMenu({
    label,
    trigger,
    children,
}: {
    label: string;
    trigger: ReactNode;
    children: ReactNode;
}) {
    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                aria-label={label}
                title={label}
                className='border-border/70 bg-background/40 text-foreground hover:border-border inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors'
            >
                {trigger}
                <ChevronDown className='text-muted-foreground h-3.5 w-3.5' aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align='end' className='w-52'>
                {children}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function DashboardMenuItem({
    checked,
    onClick,
    children,
    separator = false,
}: {
    checked?: boolean;
    onClick: () => void;
    children: ReactNode;
    separator?: boolean;
}) {
    return (
        <>
            {separator && <DropdownMenuSeparator />}
            <DropdownMenuItem onClick={onClick} className='gap-2'>
                <Check className={cn('h-4 w-4 shrink-0', checked ? 'opacity-100' : 'opacity-0')} aria-hidden />
                {children}
            </DropdownMenuItem>
        </>
    );
}
