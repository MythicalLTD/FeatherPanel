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

import { Server } from 'lucide-react';

interface EmptyStateProps {
    searchQuery: string;
    t: (key: string) => string;
}

export function EmptyState({ searchQuery, t }: EmptyStateProps) {
    return (
        <div className='border-border/60 bg-card/40 animate-in fade-in slide-in-from-bottom-2 flex flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-14 text-center duration-500 motion-reduce:animate-none sm:py-20'>
            <div className='border-primary/20 bg-primary/10 mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border'>
                <Server className='text-primary h-8 w-8' />
            </div>
            <h3 className='mb-2 text-xl font-bold sm:text-2xl'>{t('servers.noServersFound')}</h3>
            <p className='text-muted-foreground max-w-md text-sm sm:text-base'>
                {searchQuery ? t('servers.adjustFilters') : t('servers.getStarted')}
            </p>
        </div>
    );
}
