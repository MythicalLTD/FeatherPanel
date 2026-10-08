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

import { AppWindow } from 'lucide-react';

interface WebSpaceEmptyStateProps {
    searchQuery: string;
    t: (key: string) => string;
}

export function WebSpaceEmptyState({ searchQuery, t }: WebSpaceEmptyStateProps) {
    return (
        <div className='flex flex-col items-center justify-center py-24 text-center'>
            <AppWindow className='text-muted-foreground/30 mb-6 h-20 w-20' />
            <h3 className='mb-2 text-2xl font-bold'>{t('webSpaces.noWebSpacesFound')}</h3>
            <p className='text-muted-foreground max-w-md'>
                {searchQuery ? t('webSpaces.adjustFilters') : t('webSpaces.getStarted')}
            </p>
        </div>
    );
}
