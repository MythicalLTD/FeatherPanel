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

import { Button as HeadlessButton } from '@headlessui/react';
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost' | 'destructive';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    loading?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'default', size = 'default', loading = false, className = '', children, disabled, ...props }, ref) => {
        const baseStyles =
            'inline-flex items-center justify-center rounded-xl font-semibold transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';

        const variants = {
            default:
                'bg-primary text-primary-foreground hover:bg-primary/90',
            outline:
                'border-2 border-border bg-background/50 backdrop-blur-sm hover:bg-accent hover:text-accent-foreground hover:border-primary/50',
            ghost: 'hover:bg-accent hover:text-accent-foreground',
            destructive:
                'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        };

        const sizes = {
            default: 'h-11 px-6 py-2.5 text-sm',
            sm: 'h-9 px-4 text-xs',
            lg: 'h-12 px-8 text-base',
            icon: 'h-11 w-11',
        };

        return (
            <HeadlessButton
                ref={ref}
                className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
                disabled={disabled || loading}
                {...props}
            >
                {loading && (
                    <svg className='animate-spin -ml-1 mr-2 h-4 w-4' fill='none' viewBox='0 0 24 24'>
                        <circle className='opacity-25' cx='12' cy='12' r='10' stroke='currentColor' strokeWidth='4' />
                        <path
                            className='opacity-75'
                            fill='currentColor'
                            d='M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z'
                        />
                    </svg>
                )}
                {children}
            </HeadlessButton>
        );
    },
);

Button.displayName = 'Button';

export { Button };
