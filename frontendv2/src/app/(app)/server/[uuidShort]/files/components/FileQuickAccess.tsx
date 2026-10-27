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

import { Clock, FileText, Folder, PanelRightClose, Pin, PinOff, X } from 'lucide-react';
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
                            <Folder className='h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400' />
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

const panelItem =
    'hover:bg-primary/10 hover:text-foreground text-muted-foreground flex min-h-9 w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors';

/** Collapsible desktop side panel with pinned folders and recent files. */
export function FileQuickAccessPanel({
    currentDirectory,
    pins,
    recent,
    onTogglePin,
    onNavigate,
    onClearRecent,
    onCollapse,
}: {
    currentDirectory: string;
    pins: string[];
    recent: string[];
    onTogglePin: (path: string) => void;
    onNavigate: (path: string) => void;
    onClearRecent: () => void;
    onCollapse: () => void;
}) {
    const { t } = useTranslation();
    const pinned = pins.includes(currentDirectory);
    return (
        <aside className='fp-surface sticky top-4 flex max-h-[calc(100vh-2rem)] w-64 shrink-0 flex-col gap-4 overflow-y-auto rounded-xl border p-3'>
            <div className='flex items-center justify-between gap-2'>
                <p className='text-sm font-semibold'>{t('files.quick.title')}</p>
                <button
                    type='button'
                    onClick={onCollapse}
                    className='text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-lg p-1.5'
                    aria-label={t('files.quick.collapse')}
                    title={t('files.quick.collapse')}
                >
                    <PanelRightClose className='h-4 w-4' />
                </button>
            </div>
            <button
                type='button'
                onClick={() => onTogglePin(currentDirectory)}
                className={cn(chip, 'w-full max-w-none justify-center', pinned && 'border-primary/40 text-primary')}
            >
                {pinned ? <PinOff className='h-3.5 w-3.5' /> : <Pin className='h-3.5 w-3.5' />}
                {pinned ? t('files.quick.unpin') : t('files.quick.pin')}
            </button>
            <section>
                <p className='text-muted-foreground mb-1.5 px-2 text-xs font-medium'>{t('files.quick.pinned')}</p>
                {pins.length === 0 ? (
                    <p className='text-muted-foreground px-2 text-xs'>{t('files.quick.no_pins')}</p>
                ) : (
                    <ul className='space-y-0.5'>
                        {pins.map((p) => (
                            <li key={p} className='group flex items-center gap-1'>
                                <button
                                    type='button'
                                    className={cn(panelItem, p === currentDirectory && 'bg-primary/10 text-primary')}
                                    onClick={() => onNavigate(p)}
                                    title={p}
                                >
                                    <Folder className='h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400' />
                                    <span className='truncate'>
                                        {p === '/' ? t('files.breadcrumbs.home') : p.split('/').pop()}
                                    </span>
                                </button>
                                <button
                                    type='button'
                                    onClick={() => onTogglePin(p)}
                                    className='text-muted-foreground hover:text-foreground rounded-md p-1 opacity-0 group-hover:opacity-100 focus:opacity-100'
                                    aria-label={t('files.quick.unpin')}
                                >
                                    <X className='h-3.5 w-3.5' />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
            <section>
                <div className='mb-1.5 flex items-center justify-between px-2'>
                    <p className='text-muted-foreground text-xs font-medium'>{t('files.quick.recent')}</p>
                    {recent.length > 0 && (
                        <button
                            type='button'
                            onClick={onClearRecent}
                            className='text-muted-foreground hover:text-foreground text-xs'
                        >
                            {t('files.quick.clear')}
                        </button>
                    )}
                </div>
                {recent.length === 0 ? (
                    <p className='text-muted-foreground px-2 text-xs'>{t('files.quick.no_recent')}</p>
                ) : (
                    <ul className='space-y-0.5'>
                        {recent.map((p) => (
                            <li key={p}>
                                <button
                                    type='button'
                                    className={panelItem}
                                    onClick={() => onNavigate(parentPath(p))}
                                    title={p}
                                >
                                    <Clock className='h-4 w-4 shrink-0' />
                                    <span className='truncate'>{p.split('/').pop()}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </aside>
    );
}
