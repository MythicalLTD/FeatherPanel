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

import * as React from 'react';
import { Field, Label, Description } from '@headlessui/react';
import { cn } from '@/lib/utils';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    description?: string;
    error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
    ({ className, children, label, description, error, ...props }, ref) => {
        return (
            <Field>
                {label && <Label className='block text-sm font-semibold text-foreground mb-2'>{label}</Label>}
                {description && <Description className='text-sm text-muted-foreground mb-2'>{description}</Description>}
                <div className='relative'>
                    <select
                        className={cn(
                            'w-full h-12 rounded-xl border bg-muted/30 text-sm transition-all duration-200 px-4 py-3 appearance-none focus:outline-none focus:ring-4 disabled:cursor-not-allowed disabled:opacity-50 placeholder:text-muted-foreground/50 shadow-sm hover:shadow-md focus:shadow-lg font-semibold text-foreground [&>option]:bg-zinc-900 [&>option]:text-white',
                            error
                                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                                : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border',
                            className,
                        )}
                        ref={ref}
                        {...props}
                    >
                        {children}
                    </select>
                    <div className='absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none'>
                        <svg
                            className='h-4 w-4 opacity-50'
                            xmlns='http://www.w3.org/2000/svg'
                            viewBox='0 0 24 24'
                            fill='none'
                            stroke='currentColor'
                            strokeWidth='2'
                            strokeLinecap='round'
                            strokeLinejoin='round'
                        >
                            <path d='m6 9 6 6 6-6' />
                        </svg>
                    </div>
                </div>
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
        );
    },
);

Select.displayName = 'Select';

export { Select };
