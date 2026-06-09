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
                        'rounded-md border px-2 py-1 text-xs font-medium',
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

            <div className='relative z-10 flex flex-col gap-6 p-6 md:flex-row md:items-center'>
                <div
                    className={cn(
                        'bg-primary/10 relative z-10 flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl transition-transform group-hover:scale-105 group-hover:rotate-2',
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
                        <h3 className='text-foreground group-hover:text-primary truncate text-xl font-bold tracking-tight transition-colors'>
                            {title}
                        </h3>
                        {renderBadges()}
                    </div>
                    {subtitle && (
                        <div className='text-muted-foreground/60 group-hover:text-muted-foreground/80 -mt-1 text-sm font-medium transition-colors'>
                            {subtitle}
                        </div>
                    )}

                    {description && <div className='flex flex-wrap items-center gap-x-6 gap-y-2'>{description}</div>}
                </div>

                {actions && <div className='flex items-center gap-2 md:self-center'>{actions}</div>}
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

    return (
        <div onClick={onClick} style={style} className={cardClassName}>
            {cardBody}
        </div>
    );
}
