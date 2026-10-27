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
import { Search, X } from 'lucide-react';
import { Input } from '@/components/featherui/Input';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';

interface AdminListToolbarProps {
    searchValue: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder: string;
    /** Filter buttons, selects and other controls shown next to the search. */
    children?: ReactNode;
    /** Right aligned controls such as a view toggle. */
    actions?: ReactNode;
    /** Number of selected rows; shows the bulk bar when above zero. */
    selectedCount?: number;
    onClearSelection?: () => void;
    bulkActions?: ReactNode;
    className?: string;
}

/** One search, filter, view and bulk action bar for every admin list. */
export function AdminListToolbar({
    searchValue,
    onSearchChange,
    searchPlaceholder,
    children,
    actions,
    selectedCount = 0,
    onClearSelection,
    bulkActions,
    className,
}: AdminListToolbarProps) {
    const { t } = useTranslation();

    return (
        <div className={cn('fp-surface fp-list-toolbar rounded-2xl border p-3 sm:p-4', className)}>
            <div className='flex flex-col items-stretch gap-3 sm:flex-row sm:items-center'>
                <div className='group relative w-full flex-1'>
                    <Search
                        aria-hidden
                        className='text-muted-foreground group-focus-within:text-primary pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transition-colors'
                    />
                    <Input
                        type='search'
                        placeholder={searchPlaceholder}
                        aria-label={searchPlaceholder}
                        value={searchValue}
                        onChange={(e) => onSearchChange(e.target.value)}
                        className='h-11 w-full pr-10 pl-10 [&::-webkit-search-cancel-button]:hidden'
                    />
                    {searchValue && (
                        <button
                            type='button'
                            onClick={() => onSearchChange('')}
                            aria-label={t('admin.list_toolbar.clear_search')}
                            className='text-muted-foreground hover:text-foreground hover:bg-muted focus-visible:ring-primary/40 absolute top-1/2 right-2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md transition-colors focus-visible:ring-2 focus-visible:outline-none'
                        >
                            <X className='h-4 w-4' aria-hidden />
                        </button>
                    )}
                </div>
                {children && <div className='flex flex-wrap items-center gap-2 [&>*]:shrink-0'>{children}</div>}
                {actions && <div className='flex items-center gap-2 sm:ml-auto'>{actions}</div>}
            </div>
            {selectedCount > 0 && (
                <div
                    role='status'
                    className='bg-primary/8 border-primary/25 animate-in fade-in slide-in-from-top-1 mt-3 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 duration-200 motion-reduce:animate-none'
                >
                    <span className='bg-primary text-primary-foreground rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums'>
                        {selectedCount}
                    </span>
                    <span className='text-sm font-medium'>{t('admin.list_toolbar.selected')}</span>
                    <div className='ml-auto flex flex-wrap items-center gap-2'>
                        {bulkActions}
                        {onClearSelection && (
                            <Button variant='ghost' size='sm' onClick={onClearSelection}>
                                {t('admin.list_toolbar.clear_selection')}
                            </Button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
