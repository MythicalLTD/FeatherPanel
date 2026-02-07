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
    image?: string;
    onClick?: () => void;
    highlightClassName?: string;
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
    image,
    onClick,
    highlightClassName,
}: ResourceCardProps) {
    const renderBadges = () => {
        if (!badges) return null;

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
            {image ? (
                <div className='absolute inset-0 z-0 opacity-10 blur-sm group-hover:opacity-20 transition-opacity'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt='' className='w-full h-full object-cover' />
                </div>
            ) : (
                <div
                    className={cn(
                        'absolute inset-0 transition-colors z-0',
                        highlightClassName || 'bg-primary/5 group-hover:bg-primary/10',
                    )}
                />
            )}

            <div className='p-6 flex flex-col md:flex-row md:items-center gap-6 relative z-10'>
                <div
                    className={cn(
                        'h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0 transition-transform group-hover:scale-105 group-hover:rotate-2 relative z-10 overflow-hidden',
                        iconWrapperClassName,
                    )}
                >
                    {image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={image} alt={title} className='h-full w-full object-cover' />
                    ) : (
                        <Icon className={cn('h-8 w-8 text-primary', iconClassName)} />
                    )}
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
