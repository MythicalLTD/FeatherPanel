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

import { Loader2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface PageLoadingProps {
    message?: string;
    className?: string;
}

export function PageLoading({ message, className }: PageLoadingProps) {
    const { t } = useTranslation();

    return (
        <div
            className={cn('flex flex-col items-center justify-center py-24', className)}
            aria-busy='true'
            role='status'
        >
            <Loader2 className='text-primary h-12 w-12 animate-spin opacity-50' />
            <p className='text-muted-foreground mt-4 animate-pulse font-medium'>{message || t('common.loading')}</p>
        </div>
    );
}
