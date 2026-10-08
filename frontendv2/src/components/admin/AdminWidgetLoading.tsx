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

import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

export function SkeletonLine({ className }: { className?: string }) {
    return (
        <span
            aria-hidden='true'
            className={cn('bg-foreground/10 block h-3 animate-pulse rounded motion-reduce:animate-none', className)}
        />
    );
}

export function AdminWidgetLoading({ label, rows = 3 }: { label: string; rows?: number }) {
    const { t } = useTranslation();
    return (
        <div role='status' aria-busy='true' className='space-y-1'>
            <p className='text-muted-foreground pb-2 text-xs'>
                {label} · {t('common.loading')}
            </p>
            <div aria-hidden='true' className='divide-border/50 divide-y'>
                {Array.from({ length: rows }, (_, index) => (
                    <div key={index} className='flex items-center gap-4 py-3'>
                        <div className='min-w-0 flex-1 space-y-2'>
                            <SkeletonLine className={index % 2 === 0 ? 'w-2/3 max-w-48' : 'w-1/2 max-w-36'} />
                            <SkeletonLine className='h-2 w-1/3 max-w-28' />
                        </div>
                        <SkeletonLine className='h-5 w-14 shrink-0' />
                    </div>
                ))}
            </div>
        </div>
    );
}
