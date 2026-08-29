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

import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    /** Visual error state; string also renders an error message below the field. */
    error?: boolean | string;
    label?: string;
    description?: string;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
    ({ className, error, label, description, id, ...props }, ref) => {
        const hasError = Boolean(error);
        const errorMessage = typeof error === 'string' ? error : undefined;
        const fieldId = id || (label ? `textarea-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

        const field = (
            <textarea
                id={fieldId}
                className={cn(
                    'bg-muted/30 placeholder:text-muted-foreground/50 text-foreground custom-scrollbar flex min-h-[120px] w-full rounded-xl border px-4 py-3 text-sm font-semibold shadow-sm transition-all duration-200 hover:shadow-md focus:shadow-lg focus:ring-4 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                    hasError
                        ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                        : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border',
                    className,
                )}
                ref={ref}
                aria-invalid={hasError || undefined}
                {...props}
            />
        );

        if (!label && !description && !errorMessage) {
            return field;
        }

        return (
            <div className='w-full'>
                {label && (
                    <label htmlFor={fieldId} className='text-foreground mb-2 block text-sm font-semibold'>
                        {label}
                    </label>
                )}
                {description && <p className='text-muted-foreground mb-2 text-sm'>{description}</p>}
                {field}
                {errorMessage && (
                    <p className='text-destructive mt-2 flex items-center gap-1 text-sm' role='alert'>
                        {errorMessage}
                    </p>
                )}
            </div>
        );
    },
);
Textarea.displayName = 'Textarea';

export { Textarea };
