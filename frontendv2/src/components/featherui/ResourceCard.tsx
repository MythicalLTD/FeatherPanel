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

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';
import { ReactNode, ComponentType } from 'react';

export interface ResourceBadge {
    label: string;
    className?: string;
    style?: React.CSSProperties;
    iconUrl?: string;
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
    href?: string;
    onClick?: () => void;
    highlightClassName?: string;
    titleClassName?: string;
    layout?: 'horizontal' | 'stacked';
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
    href,
    onClick,
    highlightClassName,
    titleClassName,
    layout = 'horizontal',
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
                        'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium',
                        badge.className || 'bg-secondary text-secondary-foreground border-transparent',
                    )}
                    style={badge.style}
                >
                    {badge.iconUrl && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={badge.iconUrl} alt='' className='h-3.5 w-3.5 shrink-0 rounded-sm object-cover' />
                    )}
                    {badge.label}
                </span>
            ));
        }

        return badges as ReactNode;
    };

    const cardClassName = cn(
        'group bg-card/30 border-border/10 hover:border-primary/30 hover:bg-accent/50 relative overflow-hidden rounded-3xl border backdrop-blur-sm transition-all duration-300',
        (href || onClick) && 'cursor-pointer',
        className,
    );

    const cardBody = (
        <>
            {image ? (
                <div className='absolute inset-0 z-0 opacity-10 blur-sm transition-opacity group-hover:opacity-20'>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt='' className='h-full w-full object-cover' />
                </div>
            ) : (
                <div
                    className={cn(
                        'absolute inset-0 z-0 transition-colors',
                        highlightClassName || 'bg-primary/5 group-hover:bg-primary/10',
                    )}
                />
            )}

            <div
                className={cn(
                    'relative z-10 flex flex-col gap-6 p-6',
                    layout === 'horizontal' ? 'md:flex-row md:items-center' : 'sm:flex-row sm:items-start',
                )}
            >
                <div
                    className={cn(
                        'bg-primary/10 relative z-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-transform group-hover:scale-105',
                        layout === 'horizontal' && 'group-hover:rotate-2',
                        iconWrapperClassName,
                    )}
                >
                    {image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={image} alt={title} className='h-full w-full object-cover' />
                    ) : (
                        <Icon className={cn('text-primary h-8 w-8', iconClassName)} />
                    )}
                </div>

                <div className='min-w-0 flex-1 space-y-2'>
                    <div className='flex flex-wrap items-center gap-3'>
                        <h3
                            className={cn(
                                'text-foreground group-hover:text-primary text-xl font-bold tracking-tight transition-colors',
                                titleClassName ?? 'truncate',
                            )}
                        >
                            {title}
                        </h3>
                        {renderBadges()}
                    </div>
                    {subtitle && (
                        <div className='text-muted-foreground/60 group-hover:text-muted-foreground/80 -mt-1 text-sm font-medium transition-colors'>
                            {subtitle}
                        </div>
                    )}

                    {description && <div className='w-full min-w-0'>{description}</div>}
                </div>

                {actions && (
                    <div
                        className={cn(
                            'flex items-center gap-2',
                            layout === 'stacked' ? 'w-full sm:w-auto sm:self-center' : 'md:self-center',
                        )}
                    >
                        {actions}
                    </div>
                )}
            </div>
        </>
    );

    if (href) {
        return (
            <Link href={href} style={style} className={cardClassName} onClick={onClick}>
                {cardBody}
            </Link>
        );
    }

    if (onClick) {
        return (
            <button type='button' onClick={onClick} style={style} className={cn(cardClassName, 'w-full text-left')}>
                {cardBody}
            </button>
        );
    }

    return (
        <div style={style} className={cardClassName}>
            {cardBody}
        </div>
    );
}
