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
import { SlidersHorizontal } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

export function DashboardHeader({
    greeting,
    statusLine,
    statusTone = 'neutral',
    onCustomize,
}: {
    greeting: ReactNode;
    statusLine?: ReactNode;
    statusTone?: 'neutral' | 'good' | 'warning';
    onCustomize: () => void;
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
            <button
                type='button'
                onClick={onCustomize}
                title={t('dashboard.customize.open')}
                aria-label={t('dashboard.customize.open')}
                className='fp-surface hover:text-foreground text-muted-foreground inline-flex h-9 shrink-0 items-center gap-2 rounded-lg border px-2.5 text-sm font-medium sm:px-3'
            >
                <SlidersHorizontal className='h-4 w-4' aria-hidden />
                <span className='hidden sm:inline'>{t('dashboard.customize.open')}</span>
            </button>
        </header>
    );
}
