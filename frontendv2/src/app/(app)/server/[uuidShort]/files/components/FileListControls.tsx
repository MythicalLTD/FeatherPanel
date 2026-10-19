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

import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { ArrowDownAZ, ArrowUpAZ, Eye, EyeOff, Keyboard, LayoutGrid, List } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { cn } from '@/lib/utils';
import type { FilesSortKey, FilesViewPrefs } from '@/lib/files-view-prefs';

const SHORTCUTS: { keys: string; label: string }[] = [
    { keys: 'Ctrl+F', label: 'files.shortcuts.search' },
    { keys: 'Ctrl+A', label: 'files.shortcuts.select_all' },
    { keys: 'Enter', label: 'files.shortcuts.open' },
    { keys: 'Backspace', label: 'files.shortcuts.up' },
    { keys: 'F2', label: 'files.shortcuts.rename' },
    { keys: 'Del', label: 'files.shortcuts.delete' },
    { keys: 'F5', label: 'files.shortcuts.refresh' },
    { keys: 'Space', label: 'files.shortcuts.toggle' },
    { keys: 'Esc', label: 'files.shortcuts.clear' },
];

const segBtn = (active: boolean) =>
    cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors',
        active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-muted/60',
    );

export function FileListControls({
    prefs,
    onChange,
}: {
    prefs: FilesViewPrefs;
    onChange: (patch: Partial<FilesViewPrefs>) => void;
}) {
    const { t } = useTranslation();
    const sortKeys: FilesSortKey[] = ['name', 'size', 'modified'];
    return (
        <div className='flex flex-wrap items-center gap-2'>
            <div className='fp-surface-inset flex items-center gap-0.5 rounded-xl border p-0.5'>
                {sortKeys.map((key) => (
                    <button
                        key={key}
                        type='button'
                        className={segBtn(prefs.sortKey === key)}
                        onClick={() =>
                            prefs.sortKey === key
                                ? onChange({ sortDir: prefs.sortDir === 'asc' ? 'desc' : 'asc' })
                                : onChange({ sortKey: key, sortDir: 'asc' })
                        }
                    >
                        {t(`files.view.sort_${key}`)}
                        {prefs.sortKey === key &&
                            (prefs.sortDir === 'asc' ? (
                                <ArrowDownAZ className='h-3.5 w-3.5' />
                            ) : (
                                <ArrowUpAZ className='h-3.5 w-3.5' />
                            ))}
                    </button>
                ))}
            </div>
            <button
                type='button'
                className={cn(segBtn(!prefs.showHidden), 'fp-surface-inset border')}
                onClick={() => onChange({ showHidden: !prefs.showHidden })}
                title={t('files.view.hidden_toggle')}
            >
                {prefs.showHidden ? <Eye className='h-3.5 w-3.5' /> : <EyeOff className='h-3.5 w-3.5' />}
                <span className='hidden sm:inline'>
                    {prefs.showHidden ? t('files.view.hidden_shown') : t('files.view.hidden_hidden')}
                </span>
            </button>
            <div className='fp-surface-inset flex items-center gap-0.5 rounded-xl border p-0.5'>
                <button
                    type='button'
                    className={segBtn(prefs.view === 'list')}
                    onClick={() => onChange({ view: 'list' })}
                    aria-label={t('files.view.list')}
                    title={t('files.view.list')}
                >
                    <List className='h-3.5 w-3.5' />
                </button>
                <button
                    type='button'
                    className={segBtn(prefs.view === 'grid')}
                    onClick={() => onChange({ view: 'grid' })}
                    aria-label={t('files.view.grid')}
                    title={t('files.view.grid')}
                >
                    <LayoutGrid className='h-3.5 w-3.5' />
                </button>
            </div>
            <Popover className='relative'>
                <PopoverButton
                    className={cn(segBtn(false), 'fp-surface-inset border')}
                    title={t('files.shortcuts.title')}
                    aria-label={t('files.shortcuts.title')}
                >
                    <Keyboard className='h-3.5 w-3.5' />
                </PopoverButton>
                <PopoverPanel
                    anchor='bottom end'
                    className='fp-menu-surface z-50 mt-2 w-64 rounded-xl border p-3 text-sm shadow-xl'
                >
                    <p className='mb-2 font-semibold'>{t('files.shortcuts.title')}</p>
                    <ul className='space-y-1.5'>
                        {SHORTCUTS.map((s) => (
                            <li key={s.keys} className='flex items-center justify-between gap-3'>
                                <span className='text-muted-foreground'>{t(s.label)}</span>
                                <kbd className='bg-muted rounded-md border px-1.5 py-0.5 font-mono text-[11px]'>
                                    {s.keys}
                                </kbd>
                            </li>
                        ))}
                    </ul>
                </PopoverPanel>
            </Popover>
        </div>
    );
}
