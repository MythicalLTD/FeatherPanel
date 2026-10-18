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

import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { reportPanelInteraction } from '@/lib/panel-analytics';
import { cn } from '@/lib/utils';

interface ListPaginationProps {
    page: number;
    totalPages: number;
    disabled?: boolean;
    onPageChange: (page: number) => void;
    className?: string;
    /** When given, shows "Showing 21 to 40 of 312" on wider screens. */
    totalItems?: number;
    pageSize?: number;
}

type PageItem = number | 'gap-start' | 'gap-end';

/** First, last, current ± `siblings`, with an ellipsis for each hidden run (never hides a single page). */
export function getPageItems(page: number, totalPages: number, siblings = 1): PageItem[] {
    const window = siblings * 2 + 5; // first + last + current + siblings + 2 gaps
    if (totalPages <= window) return Array.from({ length: totalPages }, (_, i) => i + 1);

    const start = Math.max(2, page - siblings);
    const end = Math.min(totalPages - 1, page + siblings);
    const showStartGap = start > 3;
    const showEndGap = end < totalPages - 2;

    const items: PageItem[] = [1];
    if (showStartGap) items.push('gap-start');
    else for (let p = 2; p < start; p++) items.push(p);
    for (let p = start; p <= end; p++) items.push(p);
    if (showEndGap) items.push('gap-end');
    else for (let p = end + 1; p < totalPages; p++) items.push(p);
    items.push(totalPages);

    // Keep the row a constant width while paging: pad the side without a gap.
    if (!showStartGap && showEndGap) {
        for (let p = end + 1; items.length < window; p++) items.splice(items.length - 2, 0, p);
    } else if (showStartGap && !showEndGap) {
        for (let p = start - 1; items.length < window; p--) items.splice(2, 0, p);
    }
    return items;
}

const navButton =
    'inline-flex h-9 min-w-9 items-center justify-center gap-1 rounded-lg px-2.5 text-sm font-medium transition-colors focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-40';

export function ListPagination({
    page,
    totalPages,
    disabled,
    onPageChange,
    className,
    totalItems,
    pageSize,
}: ListPaginationProps) {
    const { t } = useTranslation();

    if (totalPages <= 1) {
        return null;
    }

    const go = (target: number, kind: 'previous' | 'next' | 'jump') => {
        const next = Math.min(Math.max(1, target), totalPages);
        if (next === page || disabled) return;
        reportPanelInteraction('panel.pagination', kind);
        onPageChange(next);
    };

    const showSummary = typeof totalItems === 'number' && typeof pageSize === 'number' && pageSize > 0;
    const from = showSummary ? (page - 1) * pageSize! + 1 : 0;
    const to = showSummary ? Math.min(page * pageSize!, totalItems!) : 0;

    return (
        <nav
            aria-label={t('common.pagination.label')}
            className={cn('flex items-center justify-between gap-3', !showSummary && 'justify-center', className)}
        >
            {showSummary && (
                <p className='text-muted-foreground hidden text-sm sm:block'>
                    {t('common.pagination.showing', {
                        from: String(from),
                        to: String(to),
                        total: String(totalItems),
                    })}
                </p>
            )}

            <div className='fp-surface flex w-full items-center justify-between gap-1 rounded-xl border p-1 sm:w-auto sm:justify-start'>
                <button
                    type='button'
                    className={cn(navButton, 'hover:bg-accent text-muted-foreground hover:text-foreground')}
                    disabled={disabled || page <= 1}
                    onClick={() => go(page - 1, 'previous')}
                    aria-label={t('common.pagination.previousPage')}
                >
                    <ChevronLeft className='h-4 w-4' />
                    <span className='hidden pr-1 md:inline'>{t('common.previous')}</span>
                </button>

                {/* Phones: compact "Page 3 of 12" */}
                <span className='text-muted-foreground px-2 text-sm tabular-nums sm:hidden' aria-live='polite'>
                    {t('common.pagination.page', { current: String(page), total: String(totalPages) })}
                </span>

                <ul className='hidden items-center gap-1 sm:flex'>
                    {getPageItems(page, totalPages).map((item) =>
                        typeof item === 'number' ? (
                            <li key={item}>
                                <button
                                    type='button'
                                    className={cn(
                                        navButton,
                                        'tabular-nums',
                                        item === page
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'hover:bg-accent text-foreground/80 hover:text-foreground',
                                    )}
                                    aria-current={item === page ? 'page' : undefined}
                                    aria-label={t('common.pagination.goToPage', { page: String(item) })}
                                    disabled={disabled && item !== page}
                                    onClick={() => go(item, 'jump')}
                                >
                                    {item}
                                </button>
                            </li>
                        ) : (
                            <li
                                key={item}
                                aria-hidden
                                className='text-muted-foreground flex h-9 w-6 items-center justify-center'
                            >
                                <MoreHorizontal className='h-4 w-4' />
                            </li>
                        ),
                    )}
                </ul>

                <button
                    type='button'
                    className={cn(navButton, 'hover:bg-accent text-muted-foreground hover:text-foreground')}
                    disabled={disabled || page >= totalPages}
                    onClick={() => go(page + 1, 'next')}
                    aria-label={t('common.pagination.nextPage')}
                >
                    <span className='hidden pl-1 md:inline'>{t('common.next')}</span>
                    <ChevronRight className='h-4 w-4' />
                </button>
            </div>
        </nav>
    );
}
