/*
This file is part of FeatherPanel.

Copyright (C) 2025 MythicalSystems Studios
Copyright (C) 2025 FeatherPanel Contributors
Copyright (C) 2025 Cassian Gherman (aka NaysKutzu)

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
    40|by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

See the LICENSE file or <https://www.gnu.org/licenses/>.
*/

'use client';

import { Clock, FileText, Folder, Pin, PinOff, X } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import { parentPath } from '@/lib/files-view-prefs';

const chip =
    'fp-surface-inset hover:border-primary/40 hover:text-foreground text-muted-foreground inline-flex max-w-[14rem] items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors';

export function FileQuickAccess({
    currentDirectory,
    pins,
    recent,
    onTogglePin,
    onNavigate,
    onClearRecent,
}: {
    currentDirectory: string;
    pins: string[];
    recent: string[];
    onTogglePin: (path: string) => void;
    onNavigate: (path: string) => void;
    onClearRecent: () => void;
}) {
    const { t } = useTranslation();
    const pinned = pins.includes(currentDirectory);
    return (
        <div className='flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center'>
            <button
                type='button'
                onClick={() => onTogglePin(currentDirectory)}
                className={cn(chip, pinned && 'border-primary/40 text-primary')}
            >
                {pinned ? <PinOff className='h-3.5 w-3.5' /> : <Pin className='h-3.5 w-3.5' />}
                {pinned ? t('files.quick.unpin') : t('files.quick.pin')}
            </button>
            {pins.length > 0 && (
                <div className='no-scrollbar flex items-center gap-1.5 overflow-x-auto'>
                    {pins.map((p) => (
                        <button key={p} type='button' className={chip} onClick={() => onNavigate(p)} title={p}>
                            <Folder className='h-3.5 w-3.5 shrink-0 text-amber-500' />
                            <span className='truncate'>
                                {p === '/' ? t('files.breadcrumbs.home') : p.split('/').pop()}
                            </span>
                        </button>
                    ))}
                </div>
            )}
            {recent.length > 0 && (
                <div className='no-scrollbar flex items-center gap-1.5 overflow-x-auto sm:ml-auto'>
                    <Clock
                        className='text-muted-foreground h-3.5 w-3.5 shrink-0'
                        aria-label={t('files.quick.recent')}
                    />
                    {recent.map((p) => (
                        <button
                            key={p}
                            type='button'
                            className={chip}
                            onClick={() => onNavigate(parentPath(p))}
                            title={p}
                        >
                            <FileText className='h-3.5 w-3.5 shrink-0' />
                            <span className='truncate'>{p.split('/').pop()}</span>
                        </button>
                    ))}
                    <button
                        type='button'
                        onClick={onClearRecent}
                        className='text-muted-foreground hover:text-foreground rounded-md p-1'
                        aria-label={t('files.quick.clear_recent')}
                        title={t('files.quick.clear_recent')}
                    >
                        <X className='h-3.5 w-3.5' />
                    </button>
                </div>
            )}
        </div>
    );
}
