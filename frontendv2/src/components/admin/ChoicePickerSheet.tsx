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
import { useTranslation } from '@/contexts/TranslationContext';
import { PickerSheet } from '@/components/ui/picker-sheet';
import { Check, Search } from 'lucide-react';

export interface ChoiceOption {
    id: string | number;
    name: string;
    description?: string;
}

interface ChoicePickerSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    options: ChoiceOption[];
    selectedId: string | number;
    onSelect: (id: string | number) => void;
}

export function ChoicePickerSheet({
    open,
    onOpenChange,
    title,
    options,
    selectedId,
    onSelect,
}: ChoicePickerSheetProps) {
    const { t } = useTranslation();
    const [search, setSearch] = useState('');

    useEffect(() => {
        if (open) setSearch('');
    }, [open]);

    const query = search.trim().toLocaleLowerCase();
    const filtered = options.filter(
        (option) =>
            option.name.toLocaleLowerCase().includes(query) || option.description?.toLocaleLowerCase().includes(query),
    );

    return (
        <PickerSheet open={open} onOpenChange={onOpenChange} title={title} search={search} onSearchChange={setSearch}>
            {filtered.length === 0 ? (
                <p className='text-muted-foreground py-8 text-center text-sm'>{t('common.no_results')}</p>
            ) : (
                filtered.map((option) => {
                    const selected = option.id === selectedId;
                    return (
                        <button
                            key={option.id}
                            type='button'
                            onClick={() => {
                                onSelect(option.id);
                                onOpenChange(false);
                            }}
                            aria-pressed={selected}
                            className='border-border/50 hover:border-primary hover:bg-primary/5 flex w-full cursor-pointer items-center gap-3 rounded-xl border p-4 text-left transition-all'
                        >
                            <span className='bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                                {selected ? <Check className='h-5 w-5' /> : <Search className='h-4 w-4' />}
                            </span>
                            <span className='min-w-0 flex-1'>
                                <span className='block truncate font-semibold'>{option.name}</span>
                                {option.description && (
                                    <span className='text-muted-foreground block truncate text-xs'>
                                        {option.description}
                                    </span>
                                )}
                            </span>
                        </button>
                    );
                })
            )}
        </PickerSheet>
    );
}

interface PickerTriggerProps {
    value?: string | null;
    detail?: string;
    placeholder: string;
    onClick: () => void;
    disabled?: boolean;
}

export function PickerTrigger({ value, detail, placeholder, onClick, disabled }: PickerTriggerProps) {
    return (
        <button
            type='button'
            onClick={onClick}
            disabled={disabled}
            aria-label={placeholder}
            className='bg-muted/30 border-border/50 hover:border-primary/50 focus-visible:ring-ring flex min-h-12 w-full min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border px-4 py-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50'
        >
            <span className='min-w-0 flex-1'>
                <span className={value ? 'block truncate font-semibold' : 'text-muted-foreground block truncate'}>
                    {value || placeholder}
                </span>
                {value && detail && <span className='text-muted-foreground block truncate text-xs'>{detail}</span>}
            </span>
            <Search className='text-muted-foreground h-4 w-4 shrink-0' aria-hidden='true' />
        </button>
    );
}
