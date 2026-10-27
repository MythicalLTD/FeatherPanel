/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    10|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
    message?: string;
    className?: string;
}

export function PageLoading({ message, className }: PageLoadingProps) {
    const { t } = useTranslation();

    // A skeleton of the usual page (header card, toolbar, a few rows) instead of a lone spinner,
    // so the layout does not jump when the content arrives.
    return (
        <div
            className={cn('animate-in fade-in w-full space-y-4 duration-300 motion-reduce:animate-none', className)}
            aria-busy='true'
            role='status'
        >
            <span className='sr-only'>{message || t('common.loading')}</span>
            <div className='fp-surface flex items-center gap-3 rounded-2xl border p-4 sm:gap-4 sm:p-5'>
                <div className='bg-muted h-10 w-10 shrink-0 animate-pulse rounded-xl motion-reduce:animate-none sm:h-12 sm:w-12' />
                <div className='min-w-0 flex-1 space-y-2'>
                    <div className='bg-muted h-5 w-40 max-w-full animate-pulse rounded-md motion-reduce:animate-none' />
                    <div className='bg-muted/70 h-3.5 w-64 max-w-full animate-pulse rounded-md motion-reduce:animate-none' />
                </div>
                <div className='bg-muted hidden h-9 w-28 animate-pulse rounded-lg motion-reduce:animate-none sm:block' />
            </div>
            <div className='fp-surface h-14 animate-pulse rounded-xl border motion-reduce:animate-none' />
            <div className='space-y-2'>
                {[0, 1, 2, 3].map((i) => (
                    <div
                        key={i}
                        className='fp-surface-solid flex items-center gap-3 rounded-xl border p-3.5'
                        style={{ animationDelay: `${i * 80}ms` }}
                    >
                        <div className='bg-muted h-9 w-9 shrink-0 animate-pulse rounded-lg motion-reduce:animate-none' />
                        <div className='min-w-0 flex-1 space-y-2'>
                            <div className='bg-muted h-4 w-1/3 animate-pulse rounded-md motion-reduce:animate-none' />
                            <div className='bg-muted/70 h-3 w-1/2 animate-pulse rounded-md motion-reduce:animate-none' />
                        </div>
                        <div className='bg-muted h-8 w-8 shrink-0 animate-pulse rounded-lg motion-reduce:animate-none' />
                    </div>
                ))}
            </div>
        </div>
    );
}
