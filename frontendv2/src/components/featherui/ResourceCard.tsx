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
import { ReactNode, ComponentType, createContext, useContext } from 'react';
import { useTranslation } from '@/contexts/TranslationContext';
import { OverflowText } from './OverflowText';

export interface ResourceBadge {
    label: string;
    className?: string;
    style?: React.CSSProperties;
    iconUrl?: string;
}

/** Set by ResourceTable: cards inside it render as table rows on desktop. */
const ResourceTableContext = createContext(false);

/**
 * Wraps a list of ResourceCards so they read as one table on desktop (name, details and actions
 * columns aligned across rows) and as separate cards on smaller screens.
 */
export function ResourceTable({
    children,
    className,
    nameHeader,
    detailsHeader,
    actionsHeader,
}: {
    children: ReactNode;
    className?: string;
    nameHeader?: ReactNode;
    detailsHeader?: ReactNode;
    actionsHeader?: ReactNode;
}) {
    const { t } = useTranslation();
    return (
        <ResourceTableContext.Provider value={true}>
            <div
                role='table'
                className={cn(
                    'lg:fp-surface space-y-2 lg:grid lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)_auto] lg:space-y-0 lg:divide-y lg:divide-[var(--fp-surface-border)] lg:overflow-hidden lg:rounded-xl lg:border',
                    className,
                )}
            >
                <div
                    role='row'
                    className='text-muted-foreground hidden text-xs font-medium lg:col-span-3 lg:grid lg:grid-cols-subgrid'
                >
                    <div role='columnheader' className='px-4 py-3'>
                        {nameHeader ?? t('common.name')}
                    </div>
                    <div role='columnheader' className='px-4 py-3'>
                        {detailsHeader ?? t('common.details')}
                    </div>
                    <div role='columnheader' className='px-4 py-3 text-right'>
                        {actionsHeader ?? t('common.actions')}
                    </div>
                </div>
                {children}
            </div>
        </ResourceTableContext.Provider>
    );
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
    const inTable = useContext(ResourceTableContext);
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

    if (inTable) {
        const rowClassName = cn(
            'group relative max-lg:fp-surface max-lg:rounded-xl max-lg:border lg:col-span-3 lg:grid lg:grid-cols-subgrid lg:transition-colors lg:hover:bg-primary/[0.04]',
            (href || onClick) && 'cursor-pointer max-lg:fp-surface-interactive',
            className,
        );
        const rowBody = (
            <>
                {highlightClassName ? (
                    <div className={cn('absolute inset-0 z-0 transition-colors', highlightClassName)} />
                ) : null}
                <div
                    role='row'
                    className={cn(
                        'relative z-10 flex flex-col gap-3 p-3.5 lg:col-span-3 lg:grid lg:grid-cols-subgrid lg:items-center lg:gap-0 lg:p-0',
                        href && 'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto',
                    )}
                >
                    <div role='cell' className='flex min-w-0 items-center gap-3 lg:px-4 lg:py-3'>
                        <div
                            className={cn(
                                'fp-icon-tile relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg',
                                iconWrapperClassName,
                            )}
                        >
                            {image ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img src={image} alt={title} className='h-full w-full object-cover' />
                            ) : (
                                <Icon className={cn('text-primary h-4.5 w-4.5', iconClassName)} />
                            )}
                        </div>
                        <div className='min-w-0 flex-1'>
                            <div
                                className={cn(
                                    'text-foreground min-w-0 text-sm font-semibold tracking-tight',
                                    titleClassName,
                                )}
                            >
                                {titleClassName?.includes('break-') ? title : <OverflowText>{title}</OverflowText>}
                            </div>
                            {subtitle ? (
                                <div className='text-muted-foreground mt-0.5 min-w-0 truncate text-xs'>{subtitle}</div>
                            ) : null}
                        </div>
                    </div>
                    <div role='cell' className='flex min-w-0 flex-col gap-1.5 lg:px-4 lg:py-3'>
                        {badges ? <div className='flex flex-wrap items-center gap-1.5'>{renderBadges()}</div> : null}
                        {description ? <div className='min-w-0 text-sm [&_.mt-2]:mt-0'>{description}</div> : null}
                    </div>
                    <div
                        role='cell'
                        className={cn(
                            'flex items-center justify-end gap-1 lg:px-4 lg:py-2',
                            href && 'pointer-events-auto',
                            actions
                                ? 'max-lg:border-t max-lg:border-[var(--fp-surface-border)] max-lg:pt-2.5'
                                : 'max-lg:hidden',
                        )}
                    >
                        {actions}
                    </div>
                </div>
            </>
        );
        if (href) {
            return (
                <div style={style} className={rowClassName}>
                    <Link href={href} aria-label={title} className='absolute inset-0 z-[5]' onClick={onClick} />
                    {rowBody}
                </div>
            );
        }
        return (
            <div
                style={style}
                className={rowClassName}
                onClick={onClick}
                onKeyDown={
                    onClick
                        ? (e) => {
                              if (e.key === 'Enter') onClick();
                          }
                        : undefined
                }
                tabIndex={onClick ? 0 : undefined}
            >
                {rowBody}
            </div>
        );
    }

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
                    'relative z-10 flex flex-col gap-3 p-3.5 sm:px-4 sm:py-3.5',
                    href && 'pointer-events-none [&_a]:pointer-events-auto [&_button]:pointer-events-auto',
                    layout === 'horizontal' ? 'md:flex-row md:items-center' : 'sm:flex-row sm:items-start',
                )}
            >
                <div
                    className={cn(
                        'fp-icon-tile relative z-10 flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg',
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
                            {titleClassName?.includes('break-') ? title : <OverflowText>{title}</OverflowText>}
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
