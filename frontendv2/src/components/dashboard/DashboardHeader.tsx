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
import { ArrowLeftRight, Check, LayoutDashboard, MoreHorizontal, RotateCcw } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export function DashboardHeader({
    greeting,
    statusLine,
    statusTone = 'neutral',
    isCustomizing,
    onToggleCustomizing,
    onSwapColumns,
    onReset,
}: {
    greeting: ReactNode;
    statusLine?: ReactNode;
    statusTone?: 'neutral' | 'good' | 'warning';
    isCustomizing: boolean;
    onToggleCustomizing: () => void;
    onSwapColumns: () => void;
    onReset: () => void;
}) {
    const { t } = useTranslation();

    return (
        <header className='flex min-w-0 items-start justify-between gap-3'>
            <div className='min-w-0'>
                <h1 className='text-foreground truncate text-xl font-semibold tracking-tight sm:text-2xl'>
                    {greeting}
                </h1>
                {statusLine && (
                    <p className='text-muted-foreground mt-1 flex min-w-0 items-start gap-2 text-sm'>
                        <span
                            className={cn(
                                'mt-1.5 h-2 w-2 shrink-0 rounded-full',
                                statusTone === 'good' && 'bg-emerald-500',
                                statusTone === 'warning' && 'bg-amber-500',
                                statusTone === 'neutral' && 'bg-muted-foreground/50',
                            )}
                            aria-hidden
                        />
                        <span className='min-w-0'>{statusLine}</span>
                    </p>
                )}
            </div>
            <div className='flex shrink-0 items-center gap-2'>
                {isCustomizing && (
                    <button
                        type='button'
                        onClick={onToggleCustomizing}
                        className='bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium'
                    >
                        <Check className='h-4 w-4' />
                        {t('dashboard.layout.stop')}
                    </button>
                )}
                <DropdownMenu as='div' className='relative'>
                    <DropdownMenuTrigger
                        className='fp-surface hover:text-foreground text-muted-foreground inline-flex h-9 w-9 items-center justify-center rounded-lg border'
                        title={t('dashboard.layout.menu')}
                        aria-label={t('dashboard.layout.menu')}
                    >
                        <MoreHorizontal className='h-4 w-4' />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className='w-56'>
                        <DropdownMenuItem onClick={onToggleCustomizing}>
                            <LayoutDashboard className='mr-2 h-4 w-4' />
                            {isCustomizing
                                ? t('dashboard.layout.stop_customizing')
                                : t('dashboard.layout.customize_layout')}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={onSwapColumns}>
                            <ArrowLeftRight className='mr-2 h-4 w-4' />
                            {t('dashboard.layout.swap_columns')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onReset}>
                            <RotateCcw className='mr-2 h-4 w-4' />
                            {t('dashboard.layout.reset')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}
