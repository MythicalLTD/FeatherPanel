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
import { OverflowText } from './OverflowText';

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
        'group fp-surface relative overflow-hidden rounded-xl border',
        (href || onClick) && 'fp-surface-interactive cursor-pointer',
        className,
    );

    const cardBody = (
        <>
            {highlightClassName ? (
                <div className={cn('absolute inset-0 z-0 transition-colors', highlightClassName)} />
            ) : null}

            <div
                className={cn(
                    'relative z-10 flex flex-col gap-4 p-4 sm:p-5',
                    href && 'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto',
                    layout === 'horizontal' ? 'md:flex-row md:items-center' : 'sm:flex-row sm:items-start',
                )}
            >
                <div
                    className={cn(
                        'fp-icon-tile relative z-10 flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-lg',
                        iconWrapperClassName,
                    )}
                >
                    {image ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={image} alt={title} className='h-full w-full object-cover' />
                    ) : (
                        <Icon className={cn('text-primary h-5 w-5', iconClassName)} />
                    )}
                </div>

                <div className='min-w-0 flex-1 space-y-1.5'>
                    <div className='flex flex-wrap items-center gap-2'>
                        <h3
                            className={cn(
                                'text-foreground max-w-full min-w-0 text-base font-semibold tracking-tight',
                                titleClassName,
                            )}
                        >
                            {titleClassName ? title : <OverflowText>{title}</OverflowText>}
                        </h3>
                        {renderBadges()}
                    </div>
                    {subtitle && <div className='text-muted-foreground -mt-0.5 text-sm'>{subtitle}</div>}

                    {description && <div className='w-full min-w-0'>{description}</div>}
                </div>

                {actions && (
                    <div
                        className={cn(
                            'flex items-center gap-2',
                            href && 'pointer-events-auto',
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
            <div style={style} className={cardClassName}>
                <Link href={href} aria-label={title} className='absolute inset-0 z-[5]' onClick={onClick} />
                {cardBody}
            </div>
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
