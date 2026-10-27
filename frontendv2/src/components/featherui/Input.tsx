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

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
    /** Visual error state; string also renders an error message below the field. */
    error?: boolean | string;
    label?: string;
    description?: string;
    icon?: React.ReactNode;
    /** `surface`: opaque card fill and hairline border, for fields that sit directly on the page (list search bars). */
    variant?: 'default' | 'surface';
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, error, label, description, icon, id, variant = 'default', ...props }, ref) => {
        const hasError = Boolean(error);
        const errorMessage = typeof error === 'string' ? error : undefined;
        const inputId = id || (label ? `input-${label.replace(/\s+/g, '-').toLowerCase()}` : undefined);

        const field = (
            <div className={cn('w-full min-w-0', icon && 'group relative')}>
                {icon && (
                    <div className='text-muted-foreground group-focus-within:text-primary absolute top-1/2 left-3 z-10 -translate-y-1/2 transition-colors'>
                        {icon}
                    </div>
                )}
                <input
                    id={inputId}
                    type={type}
                    className={cn(
                        'placeholder:text-muted-foreground/50 text-foreground h-12 w-full rounded-xl border py-3 text-sm font-semibold transition-all duration-200 focus:ring-4 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50',
                        variant === 'surface' ? 'fp-surface-field' : 'bg-muted/30 shadow-sm focus:shadow-lg',
                        icon ? 'pr-4 pl-10' : 'px-4',
                        hasError
                            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                            : variant === 'surface'
                              ? 'focus:border-primary/60 focus:ring-primary/10'
                              : 'border-border/50 focus:border-primary focus:ring-primary/20 hover:border-border',
                        className,
                    )}
                    ref={ref}
                    aria-invalid={hasError || undefined}
                    {...props}
                />
            </div>
        );

        if (!label && !description && !errorMessage) {
            return field;
        }

        return (
            <div className='w-full'>
                {label && (
                    <label htmlFor={inputId} className='text-foreground mb-2 block text-sm font-semibold'>
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
Input.displayName = 'Input';

export { Input };
