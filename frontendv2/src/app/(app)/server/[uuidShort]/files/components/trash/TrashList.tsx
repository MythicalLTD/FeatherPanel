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

import type { MouseEvent } from 'react';
import { useMemo } from 'react';
import { TrashEntry } from '@/lib/files-api';
import { formatFileSize } from '@/lib/utils';
import { formatDateTimeInTz, formatRelativeTime, parseApiDate } from '@/lib/dateUtils';
import { useDateFormatOptions } from '@/contexts/PreferencesContext';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import { FileText, Folder, Loader2, Sparkles, Trash2 } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';

interface TrashListProps {
    entries: TrashEntry[];
    loading: boolean;
    selectedIds: string[];
    onToggle: (id: string) => void;
    onToggleAll: () => void;
}

function formatPath(entry: TrashEntry): string {
    const root = entry.original_root === '/' ? '' : entry.original_root;
    return `${root}/${entry.original_name}`.replace(/\/+/g, '/');
}

function TrashRow({
    entry,
    selected,
    onToggle,
}: {
    entry: TrashEntry;
    selected: boolean;
    onToggle: (id: string) => void;
}) {
    const dateOpts = useDateFormatOptions();
    const { modifiedRelative, modifiedTitle } = useMemo(() => {
        if (!parseApiDate(entry.deleted_at)) {
            return { modifiedRelative: '—', modifiedTitle: undefined as string | undefined };
        }
        return {
            modifiedRelative: formatRelativeTime(entry.deleted_at, dateOpts),
            modifiedTitle: formatDateTimeInTz(entry.deleted_at, dateOpts),
        };
    }, [entry.deleted_at, dateOpts]);

    return (
        <div
            role='button'
            tabIndex={0}
            onClick={() => onToggle(entry.id)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onToggle(entry.id);
                }
            }}
            className={cn(
                'group flex cursor-pointer items-center gap-3 border-b border-gray-200 bg-transparent px-4 py-3 transition-all select-none hover:bg-gray-50 active:scale-[0.995] dark:border-white/5 dark:hover:bg-white/5',
                selected && 'bg-primary/5 dark:bg-primary/10',
            )}
        >
            <div className='pointer-events-auto shrink-0' onClick={(e: MouseEvent) => e.stopPropagation()}>
                <Checkbox
                    checked={selected}
                    onCheckedChange={() => onToggle(entry.id)}
                    className='border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary'
                />
            </div>

            <div
                className={cn(
                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/5 transition-all group-hover:scale-110',
                    entry.is_directory
                        ? 'bg-amber-500/10 text-amber-500'
                        : 'bg-gray-100 text-gray-500 dark:bg-white/5 dark:text-gray-400',
                )}
            >
                {entry.is_directory ? (
                    <Folder className='h-4.5 w-4.5 fill-amber-500/10' />
                ) : (
                    <FileText className='h-4.5 w-4.5' />
                )}
            </div>

            <div className='pointer-events-auto min-w-0 flex-1 overflow-hidden'>
                <span className='text-primary block truncate text-sm font-semibold'>{entry.original_name}</span>
                <span className='text-muted-foreground block truncate font-mono text-[10px] font-medium tracking-wide'>
                    {formatPath(entry)}
                </span>
            </div>

            <div
                className='text-muted-foreground hidden w-[5.5rem] shrink-0 text-right text-xs font-semibold tabular-nums sm:block'
                style={{ opacity: 0.8 }}
            >
                {formatFileSize(entry.size)}
            </div>

            <div
                className='text-muted-foreground hidden w-[9rem] shrink-0 truncate text-right text-xs font-semibold sm:block'
                style={{ opacity: 0.8 }}
                title={modifiedTitle}
            >
                {modifiedRelative}
            </div>

            <div className='w-9 shrink-0' aria-hidden />
        </div>
    );
}

export function TrashList({ entries, loading, selectedIds, onToggle, onToggleAll }: TrashListProps) {
    const { t } = useTranslation();

    if (loading && entries.length === 0) {
        return (
            <div className='flex h-64 items-center justify-center rounded-xl border border-white/10 bg-black/20 backdrop-blur-sm'>
                <Loader2 className='text-primary h-8 w-8 animate-spin' />
            </div>
        );
    }

    if (entries.length === 0) {
        return (
            <div className='text-muted-foreground animate-in fade-in zoom-in-95 group relative flex h-[400px] flex-col items-center justify-center gap-6 overflow-hidden rounded-3xl border border-dashed border-white/10 bg-white/2 backdrop-blur-3xl duration-700'>
                <div className='from-primary/5 absolute inset-0 bg-linear-to-br via-transparent to-transparent opacity-0 transition-opacity duration-1000 group-hover:opacity-100' />

                <div className='relative'>
                    <div className='relative z-10 flex h-24 w-24 items-center justify-center rounded-3xl border border-white/10 bg-white/5 text-white/20'>
                        <Trash2 className='h-10 w-10 opacity-40 transition-transform duration-500 group-hover:scale-110' />
                    </div>

                    <div className='bg-primary/20 absolute -top-2 -right-2 h-8 w-8 animate-pulse rounded-full blur-xl' />
                    <div className='bg-primary/10 absolute -bottom-4 -left-4 h-12 w-12 animate-pulse rounded-full blur-2xl delay-700' />
                    <Sparkles className='text-primary/40 absolute -top-6 -left-6 h-6 w-6 animate-bounce delay-300' />
                </div>

                <div className='relative z-10 space-y-2 text-center'>
                    <h3 className='bg-linear-to-br from-white to-white/40 bg-clip-text text-xl font-bold text-transparent'>
                        {t('files.trash.empty_title')}
                    </h3>
                    <p className='mx-auto max-w-[280px] text-sm leading-relaxed text-white/40'>
                        {t('files.trash.empty')}
                    </p>
                </div>
            </div>
        );
    }

    const allSelected = entries.length > 0 && selectedIds.length === entries.length;

    return (
        <div className='overflow-hidden rounded-3xl border border-gray-200 bg-white backdrop-blur-xl dark:border-white/10 dark:bg-white/5'>
            <div
                className='text-foreground/60 flex items-center gap-3 border-b border-gray-200 bg-gray-50/50 px-4 py-4 text-[10px] font-bold tracking-[0.2em] uppercase dark:border-white/10 dark:bg-white/5 dark:text-white/40'
                style={{ color: 'hsl(var(--foreground))', opacity: 0.6 }}
            >
                <div className='flex shrink-0 items-center'>
                    <Checkbox
                        checked={allSelected}
                        onCheckedChange={onToggleAll}
                        className='border-primary/50 data-[state=checked]:bg-primary data-[state=checked]:border-primary transition-colors'
                    />
                </div>
                <div className='w-9 shrink-0' aria-hidden />
                <div className='min-w-0 flex-1 truncate'>{t('files.trash.list.header_name')}</div>
                <div className='hidden w-[5.5rem] shrink-0 text-right sm:block'>
                    {t('files.trash.list.header_size')}
                </div>
                <div className='hidden w-[9rem] shrink-0 truncate text-right sm:block'>
                    {t('files.trash.list.header_deleted')}
                </div>
                <div className='w-9 shrink-0' aria-hidden />
            </div>

            <div className='divide-y divide-gray-200 dark:divide-white/5'>
                {entries.map((entry) => (
                    <TrashRow
                        key={entry.id}
                        entry={entry}
                        selected={selectedIds.includes(entry.id)}
                        onToggle={onToggle}
                    />
                ))}
            </div>
        </div>
    );
}
