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

import { useState } from 'react';
import { Listbox, Field, Label, Description } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { resolveAttachmentUrl } from '@/lib/utils';

interface Option {
    id: string | number;
    name: string;
    image?: string;
}

interface HeadlessSelectProps {
    value: string | number;
    onChange: (value: string | number) => void;
    options: Option[];
    placeholder?: string;
    className?: string;
    label?: string;
    description?: string;
    buttonClassName?: string;
    disabled?: boolean;
    error?: string;
    searchable?: boolean;
    searchPlaceholder?: string;
    /** When 'top', dropdown opens upward to avoid overlapping content below (e.g. activity list). Default 'bottom'. */
    anchorPosition?: 'top' | 'bottom';
}

export function HeadlessSelect({
    value,
    onChange,
    options,
    placeholder = 'Select an option',
    className,
    buttonClassName,
    label,
    description,
    disabled,
    error,
    searchable = false,
    searchPlaceholder = 'Search options…',
    anchorPosition = 'bottom',
}: HeadlessSelectProps) {
    const [query, setQuery] = useState('');
    const selectedOption = options.find((o) => o.id === value) || null;
    const selectedImage = selectedOption?.image ? resolveAttachmentUrl(selectedOption.image) : null;
    const anchor = anchorPosition === 'top' ? 'top start' : 'bottom start';
    const visibleOptions = searchable
        ? options.filter((option) => option.name.toLowerCase().includes(query.trim().toLowerCase()))
        : options;

    return (
        <Listbox
            value={value}
            onChange={(nextValue) => {
                setQuery('');
                onChange(nextValue);
            }}
            disabled={disabled}
        >
            <Field className={clsx('relative', className)}>
                {label && <Label className='text-foreground mb-2 block text-sm font-semibold'>{label}</Label>}
                {description && <Description className='text-muted-foreground mb-2 text-sm'>{description}</Description>}
                {searchable && (
                    <div className='relative mb-2'>
                        <input
                            type='search'
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={searchPlaceholder}
                            aria-label={searchPlaceholder}
                            className='bg-muted/20 border-border/70 placeholder:text-muted-foreground/70 focus-visible:border-primary focus-visible:outline-primary h-10 w-full rounded-lg border px-3 text-sm transition-colors outline-none focus-visible:outline-2 focus-visible:outline-offset-1'
                        />
                    </div>
                )}

                <Listbox.Button
                    className={clsx(
                        'bg-muted/30 focus-visible:outline-primary relative h-12 w-full cursor-pointer rounded-xl border px-4 py-3 text-left text-sm font-semibold transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2',
                        error
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border',
                        disabled && 'bg-muted/30 cursor-not-allowed opacity-50',
                        !disabled && 'group',
                        buttonClassName,
                    )}
                >
                    <span
                        className={clsx('flex items-center gap-3 truncate', !selectedOption && 'text-muted-foreground')}
                    >
                        {selectedImage && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={selectedImage} alt='' className='h-5 w-5 rounded object-cover' />
                        )}
                        <span
                            className={clsx(
                                selectedOption
                                    ? 'text-foreground font-semibold tabular-nums'
                                    : 'text-muted-foreground font-medium',
                            )}
                        >
                            {selectedOption ? selectedOption.name : placeholder}
                        </span>
                    </span>
                    <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4'>
                        <ChevronDown
                            className='text-muted-foreground group-hover:text-foreground h-4 w-4 transition-colors'
                            aria-hidden='true'
                        />
                    </span>
                </Listbox.Button>

                <Listbox.Options
                    anchor={anchor}
                    transition
                    style={{ maxHeight: 'min(12rem, calc(100vh - 14rem))' }}
                    className={clsx(
                        'fp-menu-surface custom-scrollbar z-50 w-[var(--button-width)] overflow-auto overscroll-contain rounded-xl border p-1 text-base focus:outline-none sm:text-sm',
                        'transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0',
                        anchorPosition === 'top' ? 'origin-bottom' : 'origin-top',
                    )}
                >
                    {visibleOptions.map((option) => {
                        const optionImage = option.image ? resolveAttachmentUrl(option.image) : null;

                        return (
                            <Listbox.Option
                                key={option.id}
                                className={({ active, selected }) =>
                                    clsx(
                                        'group relative mx-0.5 my-0.5 cursor-pointer rounded-lg py-1.5 pr-10 pl-3 transition-colors duration-200 select-none',
                                        active
                                            ? 'bg-primary scale-[1.02] text-white'
                                            : selected
                                              ? 'bg-primary/10 text-primary'
                                              : 'text-foreground/80 hover:bg-muted/50',
                                    )
                                }
                                value={option.id}
                            >
                                {({ selected, active }) => (
                                    <div className='flex items-center gap-3'>
                                        {optionImage && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={optionImage}
                                                alt=''
                                                className='h-6 w-6 rounded-lg object-cover ring-2 ring-white/10'
                                            />
                                        )}
                                        <span
                                            className={clsx(
                                                'block truncate text-sm',
                                                selected ? 'font-bold' : 'font-medium',
                                            )}
                                        >
                                            {option.name}
                                        </span>
                                        {selected ? (
                                            <span
                                                className={clsx(
                                                    'absolute inset-y-0 right-0 flex items-center pr-4 transition-colors',
                                                    active ? 'text-white' : 'text-primary',
                                                )}
                                            >
                                                <Check className='h-4 w-4 stroke-[3px]' aria-hidden='true' />
                                            </span>
                                        ) : null}
                                    </div>
                                )}
                            </Listbox.Option>
                        );
                    })}
                </Listbox.Options>

                {error && (
                    <Description className='text-destructive animate-fade-in mt-2 flex items-center gap-1 text-sm'>
                        <svg className='h-4 w-4' fill='none' viewBox='0 0 24 24' stroke='currentColor'>
                            <path
                                strokeLinecap='round'
                                strokeLinejoin='round'
                                strokeWidth={2}
                                d='M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
                            />
                        </svg>
                        {error}
                    </Description>
                )}
            </Field>
        </Listbox>
    );
}
