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

'use client';

import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode, ComponentType } from 'react';

export interface ResourceBadge {
    label: string;
    className?: string;
    style?: React.CSSProperties;
}

interface ResourceCardProps {
    icon: LucideIcon | ComponentType<{ className?: string }>;
    title: string;
    subtitle?: ReactNode;
    badges?: ReactNode | ResourceBadge[];
    description?: ReactNode;
    actions?: ReactNode;
    className?: string;
    style?: React.CSSProperties;
    iconWrapperClassName?: string;
    iconClassName?: string;
    onClick?: () => void;
}

export function ResourceCard({
    icon: Icon,
    title,
    subtitle,
    badges,
    description,
    actions,
    className,
    style,
    iconWrapperClassName,
    iconClassName,
    onClick,
}: ResourceCardProps) {
    const renderBadges = () => {
        if (!badges) return null;

        // Check if badges is an array of ResourceBadge objects (has label property)
        if (
            Array.isArray(badges) &&
            badges.length > 0 &&
            typeof badges[0] === 'object' &&
            badges[0] &&
            'label' in badges[0]
        ) {
            return (badges as ResourceBadge[]).map((badge, i) => (
                <span
                    key={i}
                    className={cn(
                        'px-2 py-1 rounded-md text-xs font-medium border',
                        badge.className || 'bg-secondary text-secondary-foreground border-transparent',
                    )}
                    style={badge.style}
                >
                    {badge.label}
                </span>
            ));
        }

        return badges as ReactNode;
    };

    return (
        <div
            onClick={onClick}
            style={style}
            className={cn(
                'group relative overflow-hidden rounded-3xl bg-card/30 backdrop-blur-sm border border-border/10 hover:border-primary/30 hover:bg-accent/50 transition-all duration-300 shadow-sm hover:shadow-xl hover:shadow-primary/5',
                onClick && 'cursor-pointer',
                className,
            )}
        >
            <div className='p-6 flex flex-col md:flex-row md:items-center gap-6 relative z-10'>
                <div
                    className={cn(
                        'h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2',
                        iconWrapperClassName,
                    )}
                >
                    <Icon className={cn('h-8 w-8 text-primary', iconClassName)} />
                </div>

                <div className='flex-1 min-w-0 space-y-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                        <h3 className='text-xl font-bold truncate tracking-tight text-foreground group-hover:text-primary transition-colors'>
                            {title}
                        </h3>
                        {renderBadges()}
                    </div>
                    {subtitle && (
                        <div className='text-sm text-muted-foreground/60 font-medium -mt-1 group-hover:text-muted-foreground/80 transition-colors'>
                            {subtitle}
                        </div>
                    )}

                    {description && <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>{description}</div>}
                </div>

                {actions && <div className='flex items-center gap-2 md:self-center'>{actions}</div>}
            </div>
        </div>
    );
}
