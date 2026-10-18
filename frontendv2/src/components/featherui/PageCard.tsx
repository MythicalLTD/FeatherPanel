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

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OverflowText } from './OverflowText';

interface PageCardProps {
    id?: string;
    title?: string;
    description?: string;
    icon?: LucideIcon;
    iconSrc?: string;
    children: React.ReactNode;
    footer?: React.ReactNode;
    variant?: 'default' | 'danger' | 'warning';
    className?: string;
    action?: React.ReactNode;
}

const variantStyles = {
    default: {
        bg: 'bg-card',
        border: 'border-border',
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        title: '',
    },
    danger: {
        bg: 'bg-card',
        border: 'border-red-500/30',
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-600 dark:text-red-400',
        title: 'text-red-600 dark:text-red-400',
    },
    warning: {
        bg: 'bg-card',
        border: 'border-amber-500/30',
        iconBg: 'bg-amber-500/10',
        iconColor: 'text-amber-600 dark:text-amber-400',
        title: 'text-amber-700 dark:text-amber-400',
    },
};

export function PageCard({
    id,
    title,
    description,
    icon: Icon,
    iconSrc,
    children,
    footer,
    variant = 'default',
    className,
    action,
}: PageCardProps) {
    const styles = variantStyles[variant];

    return (
        <div
            id={id}
            className={cn(
                'relative space-y-5 overflow-visible rounded-xl border p-4 shadow-xs sm:p-6',
                styles.bg,
                styles.border,
                className,
            )}
        >
            <div className='border-border/70 relative flex min-w-0 flex-wrap items-start justify-between gap-3 border-b pb-4'>
                <div className='flex min-w-48 flex-1 items-center gap-3'>
                    {(Icon || iconSrc) && (
                        <div
                            className={cn(
                                'flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg p-2',
                                styles.iconBg,
                            )}
                        >
                            {iconSrc ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={iconSrc} alt={title} className='h-full w-full object-contain' />
                            ) : (
                                Icon && <Icon className={cn('h-5 w-5', styles.iconColor)} />
                            )}
                        </div>
                    )}
                    <div className='min-w-0 flex-1 space-y-0.5'>
                        <h2 className={cn('text-base font-semibold tracking-tight', styles.title)} title={title}>
                            <OverflowText>{title}</OverflowText>
                        </h2>
                        {description && (
                            <p className='text-muted-foreground line-clamp-3 text-sm leading-snug break-words'>
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action && <div className='shrink-0'>{action}</div>}
            </div>

            <div className='relative'>{children}</div>

            {footer && <div className='border-border/70 relative border-t pt-4'>{footer}</div>}
        </div>
    );
}
