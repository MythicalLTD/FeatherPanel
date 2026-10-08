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

import type { ReactNode } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { Search as SearchIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export interface PickerPagination {
    current_page: number;
    per_page: number;
    total_records: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
}

export interface PickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    search: string;
    onSearchChange: (value: string) => void;
    searchPlaceholder?: string;
    pagination?: PickerPagination | null;
    onPageChange?: (page: number) => void;
    /** Optional tabs / mode switcher rendered above the search field. */
    toolbar?: ReactNode;
    /** When false, hides search + list chrome (e.g. create mode). Default true. */
    showBrowseChrome?: boolean;
    empty?: ReactNode;
    children: ReactNode;
    className?: string;
}

/**
 * Shared searchable side-sheet shell for admin pickers (owner, realm, allocation, etc.).
 */
export function PickerSheet({
    open,
    onOpenChange,
    title,
    description,
    search,
    onSearchChange,
    searchPlaceholder,
    pagination,
    onPageChange,
    toolbar,
    showBrowseChrome = true,
    empty,
    children,
    className,
}: PickerSheetProps) {
    const { t } = useTranslation();
    const showingDescription =
        description ??
        (pagination
            ? t('common.showing', {
                  from: String((pagination.current_page - 1) * pagination.per_page + 1),
                  to: String(Math.min(pagination.current_page * pagination.per_page, pagination.total_records)),
                  total: String(pagination.total_records),
              })
            : t('common.select_an_option'));

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className={className ?? 'overflow-y-auto sm:max-w-2xl'}>
                <SheetHeader>
                    <SheetTitle>{title}</SheetTitle>
                    <SheetDescription>{showingDescription}</SheetDescription>
                </SheetHeader>

                <div className='mt-6 space-y-4'>
                    {toolbar}

                    {showBrowseChrome ? (
                        <>
                            <div className='group relative'>
                                <SearchIcon className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
                                <Input
                                    placeholder={searchPlaceholder ?? t('common.search')}
                                    value={search}
                                    onChange={(e) => onSearchChange(e.target.value)}
                                    className='pl-10'
                                />
                            </div>

                            {pagination && pagination.total_pages > 1 && onPageChange ? (
                                <div className='border-border bg-muted/30 flex items-center justify-between gap-2 rounded-lg border px-3 py-2'>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_prev}
                                        onClick={() => onPageChange(pagination.current_page - 1)}
                                        className='h-8 gap-1'
                                    >
                                        <ChevronLeft className='h-3 w-3' />
                                        {t('common.previous')}
                                    </Button>
                                    <span className='text-xs font-medium'>
                                        {pagination.current_page} / {pagination.total_pages}
                                    </span>
                                    <Button
                                        variant='outline'
                                        size='sm'
                                        disabled={!pagination.has_next}
                                        onClick={() => onPageChange(pagination.current_page + 1)}
                                        className='h-8 gap-1'
                                    >
                                        {t('common.next')}
                                        <ChevronRight className='h-3 w-3' />
                                    </Button>
                                </div>
                            ) : null}

                            <div className='max-h-[calc(100vh-300px)] space-y-2 overflow-y-auto'>{children}</div>

                            {empty}

                            {pagination && pagination.total_pages > 1 && onPageChange ? (
                                <div className='border-border/50 flex items-center justify-between border-t pt-4'>
                                    <div className='text-muted-foreground text-sm'>
                                        {t('common.showing', {
                                            from: String((pagination.current_page - 1) * pagination.per_page + 1),
                                            to: String(
                                                Math.min(
                                                    pagination.current_page * pagination.per_page,
                                                    pagination.total_records,
                                                ),
                                            ),
                                            total: String(pagination.total_records),
                                        })}
                                    </div>
                                    <div className='flex gap-2'>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => onPageChange(pagination.current_page - 1)}
                                            disabled={!pagination.has_prev}
                                        >
                                            <ChevronLeft className='mr-2 h-4 w-4' />
                                            {t('common.previous')}
                                        </Button>
                                        <Button
                                            variant='outline'
                                            size='sm'
                                            onClick={() => onPageChange(pagination.current_page + 1)}
                                            disabled={!pagination.has_next}
                                        >
                                            {t('common.next')}
                                            <ChevronRight className='ml-2 h-4 w-4' />
                                        </Button>
                                    </div>
                                </div>
                            ) : null}
                        </>
                    ) : (
                        children
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
