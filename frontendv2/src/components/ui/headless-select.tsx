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

import { Listbox, Field, Label, Description } from '@headlessui/react';
import { Check, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

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
    anchorPosition = 'bottom',
}: HeadlessSelectProps) {
    const selectedOption = options.find((o) => o.id === value) || null;
    const anchor = anchorPosition === 'top' ? 'top start' : 'bottom start';

    return (
        <Listbox value={value} onChange={onChange} disabled={disabled}>
            <Field className={clsx('relative', className)}>
                {label && <Label className='block text-sm font-semibold text-foreground mb-2'>{label}</Label>}
                {description && <Description className='text-sm text-muted-foreground mb-2'>{description}</Description>}

                <Listbox.Button
                    className={clsx(
                        'relative w-full h-12 cursor-pointer rounded-xl border bg-muted/30 text-sm transition-all duration-200 focus:outline-none focus:ring-4 px-4 py-3 text-left shadow-sm hover:shadow-md focus:shadow-lg font-semibold',
                        error
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border',
                        disabled && 'opacity-50 cursor-not-allowed bg-muted/30',
                        !disabled && 'group',
                        buttonClassName,
                    )}
                >
                    <span
                        className={clsx('flex items-center gap-3 truncate', !selectedOption && 'text-muted-foreground')}
                    >
                        {selectedOption?.image && (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img src={selectedOption.image} alt='' className='h-5 w-5 rounded object-cover' />
                        )}
                        <span className={clsx('font-medium', selectedOption ? 'text-foreground' : '')}>
                            {selectedOption ? selectedOption.name : placeholder}
                        </span>
                    </span>
                    <span className='pointer-events-none absolute inset-y-0 right-0 flex items-center pr-4'>
                        <ChevronDown
                            className='h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors'
                            aria-hidden='true'
                        />
                    </span>
                </Listbox.Button>

                <Listbox.Options
                    anchor={anchor}
                    transition
                    className={clsx(
                        'max-h-60 w-[var(--button-width)] overflow-auto rounded-2xl bg-popover/80 backdrop-blur-3xl border border-white/10 dark:border-white/5 py-1 text-base shadow-[0_20px_50px_rgba(0,0,0,0.3)] focus:outline-none sm:text-sm z-50 custom-scrollbar p-1.5',
                        'transition duration-200 ease-out data-closed:scale-95 data-closed:opacity-0',
                        anchorPosition === 'top' ? 'origin-bottom' : 'origin-top',
                    )}
                >
                    {options.map((option) => (
                            <Listbox.Option
                                key={option.id}
                                className={({ active, selected }) =>
                                    clsx(
                                        'relative cursor-pointer select-none py-3 pl-4 pr-10 rounded-xl transition-all duration-200 mx-0.5 my-0.5 group',
                                        active
                                            ? 'bg-primary text-white shadow-lg shadow-primary/20 scale-[1.02]'
                                            : selected
                                              ? 'bg-primary/10 text-primary'
                                              : 'text-foreground/80 hover:bg-muted/50',
                                    )
                                }
                                value={option.id}
                            >
                                {({ selected, active }) => (
                                    <div className='flex items-center gap-3'>
                                        {option.image && (
                                            /* eslint-disable-next-line @next/next/no-img-element */
                                            <img
                                                src={option.image}
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
                        ))}
                </Listbox.Options>

                {error && (
                    <Description className='text-sm text-destructive mt-2 flex items-center gap-1 animate-fade-in'>
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
