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

import { Field, Label, Input as HeadlessInput, Description } from '@headlessui/react';
import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    description?: string;
    error?: string;
    icon?: React.ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, description, error, icon, className = '', ...props }, ref) => {
        return (
            <Field>
                {label && <Label className='text-foreground mb-2 block text-sm font-semibold'>{label}</Label>}
                {description && <Description className='text-muted-foreground mb-2 text-sm'>{description}</Description>}
                <div className='group relative'>
                    {icon && (
                        <div className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 -translate-y-1/2 transition-colors'>
                            {icon}
                        </div>
                    )}
                    <HeadlessInput
                        ref={ref}
                        className={`bg-muted/30 h-12 w-full rounded-xl border text-sm font-semibold transition-all duration-200 ${icon ? 'pr-4 pl-10' : 'px-4'} py-3 ${
                            error
                                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                                : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border'
                        } placeholder:text-muted-foreground/50 shadow-sm hover:shadow-md focus:shadow-lg focus:ring-4 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className} `}
                        {...props}
                    />
                </div>
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
        );
    },
);

Input.displayName = 'Input';

export { Input, Field, Label };
