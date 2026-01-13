/*
MIT License

Copyright (c) 2024-2026 MythicalSystems and Contributors
Copyright (c) 2024-2026 Cassian Gherman (NaysKutzu)
Copyright (c) 2018 - 2021 Dane Everitt <dane@daneeveritt.com> and Contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

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

import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PageCardProps {
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
        bg: 'bg-card/50',
        border: 'border-border/50',
        iconBg: 'bg-primary/5',
        iconBorder: 'border-primary/20',
        iconColor: 'text-primary',
        glow: 'bg-primary/5',
        hoverBorder: 'group-hover:bg-primary/10',
        title: '',
    },
    danger: {
        bg: 'bg-red-500/5',
        border: 'border-red-500/10 hover:border-red-500/30',
        iconBg: 'bg-red-500/10',
        iconBorder: 'border-red-500/20',
        iconColor: 'text-red-500',
        glow: 'bg-red-500/5',
        hoverBorder: 'group-hover:opacity-100',
        title: 'text-red-500',
    },
    warning: {
        bg: 'bg-orange-500/5',
        border: 'border-orange-500/10 hover:border-orange-500/30',
        iconBg: 'bg-orange-500/10',
        iconBorder: 'border-orange-500/20',
        iconColor: 'text-orange-500',
        glow: 'bg-orange-500/5',
        hoverBorder: 'group-hover:opacity-100',
        title: 'text-orange-500',
    },
};

export function PageCard({
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
            className={cn(
                'backdrop-blur-3xl border rounded-3xl p-8 space-y-6 relative overflow-hidden group transition-all',
                styles.bg,
                styles.border,
                className,
            )}
        >
            <div
                className={cn(
                    'absolute top-0 right-0 w-32 h-32 blur-2xl pointer-events-none transition-all duration-700 opacity-0 group-hover:opacity-100',
                    styles.glow,
                )}
            />

            <div className='flex items-center justify-between border-b border-border/10 pb-6 relative z-10'>
                <div className='flex items-center gap-4'>
                    {(Icon || iconSrc) && (
                        <div
                            className={cn(
                                'h-10 w-10 rounded-xl flex items-center justify-center border overflow-hidden p-2',
                                styles.iconBg,
                                styles.iconBorder,
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
                    <div className='space-y-0.5 flex-1 min-w-0'>
                        <h2
                            className={cn(
                                'text-lg font-black uppercase tracking-tight line-clamp-2 break-all',
                                styles.title,
                            )}
                            title={title}
                        >
                            {title}
                        </h2>
                        {description && (
                            <p className='text-[9px] font-bold text-muted-foreground tracking-widest uppercase opacity-50 truncate'>
                                {description}
                            </p>
                        )}
                    </div>
                </div>
                {action && <div>{action}</div>}
            </div>

            <div className='relative z-10'>{children}</div>

            {footer && <div className='pt-4 border-t border-border/10 relative z-10'>{footer}</div>}
        </div>
    );
}
