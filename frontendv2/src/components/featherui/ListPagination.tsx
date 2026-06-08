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

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Button } from '@/components/featherui/Button';
import { Input } from '@/components/featherui/Input';
import { cn } from '@/lib/utils';

interface ListPaginationProps {
    page: number;
    totalPages: number;
    disabled?: boolean;
    onPageChange: (page: number) => void;
    className?: string;
}

export function ListPagination({ page, totalPages, disabled, onPageChange, className }: ListPaginationProps) {
    const { t } = useTranslation();
    const [pageInput, setPageInput] = useState(String(page));

    useEffect(() => {
        setPageInput(String(page));
    }, [page]);

    const clampPage = (value: number) => Math.min(Math.max(1, value), totalPages);

    const commitPageInput = () => {
        const parsed = Number.parseInt(pageInput, 10);
        if (Number.isNaN(parsed)) {
            setPageInput(String(page));
            return;
        }

        const nextPage = clampPage(parsed);
        setPageInput(String(nextPage));
        if (nextPage !== page) {
            onPageChange(nextPage);
        }
    };

    if (totalPages <= 1) {
        return null;
    }

    return (
        <div
            className={cn(
                'border-border bg-card/50 flex flex-wrap items-center justify-between gap-4 rounded-xl border px-4 py-3',
                className,
            )}
        >
            <Button
                variant='outline'
                size='sm'
                disabled={disabled || page <= 1}
                onClick={() => onPageChange(page - 1)}
                className='gap-1.5'
            >
                <ChevronLeft className='h-4 w-4' />
                {t('common.previous')}
            </Button>

            <div className='flex items-center gap-2'>
                <Input
                    type='number'
                    min={1}
                    max={totalPages}
                    value={pageInput}
                    disabled={disabled}
                    onChange={(e) => setPageInput(e.target.value)}
                    onBlur={commitPageInput}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            commitPageInput();
                        }
                    }}
                    className='h-9 w-16 text-center'
                    aria-label={t('common.pagination.page', { current: String(page), total: String(totalPages) })}
                />
                <span className='text-sm font-medium'>{`/ ${totalPages}`}</span>
            </div>

            <Button
                variant='outline'
                size='sm'
                disabled={disabled || page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className='gap-1.5'
            >
                {t('common.next')}
                <ChevronRight className='h-4 w-4' />
            </Button>
        </div>
    );
}
