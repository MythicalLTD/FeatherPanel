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

import { Field, Label, Textarea as HeadlessTextarea, Description } from '@headlessui/react';
import { forwardRef } from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    description?: string;
    error?: string;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className = '', label, description, error, ...props }, ref) => {
        return (
            <Field>
                {label && <Label className='text-foreground mb-2 block text-sm font-semibold'>{label}</Label>}
                {description && <Description className='text-muted-foreground mb-2 text-sm'>{description}</Description>}
                <HeadlessTextarea
                    className={`bg-muted/30 flex min-h-[120px] w-full rounded-xl border px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                        error
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border'
                    } placeholder:text-muted-foreground/50 shadow-sm hover:shadow-md focus:shadow-lg focus:ring-4 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 ${className} `}
                    ref={ref}
                    {...props}
                />
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
Textarea.displayName = 'Textarea';

export { Textarea, Field, Label };
