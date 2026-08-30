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
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDisk } from '@/lib/server-utils';
import { StatusBadge } from '@/components/servers/StatusBadge';
import { ResourceBar } from '@/components/servers/ResourceBar';
import { Checkbox } from '@/components/ui/checkbox';
import { displayWebSpaceStatus, isWebSpaceAccessible } from '@/lib/webspace-utils';
import type { WebSpace } from '@/types/webspace';

export type DashboardWebSpace = WebSpace & {
    id?: number;
};

interface WebSpaceCardProps {
    webspace: DashboardWebSpace;
    layout: 'list' | 'grid';
    webspaceUrl: string;
    t: (key: string) => string;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    showFavoriteToggle?: boolean;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
}

export function WebSpaceCard({
    webspace,
    layout,
    webspaceUrl,
    t,
    selectable = false,
    selected = false,
    onToggleSelect,
    showFavoriteToggle = false,
    isFavorite = false,
    onToggleFavorite,
}: WebSpaceCardProps) {
    const accessible = isWebSpaceAccessible(webspace);
    const status = displayWebSpaceStatus(webspace);
    const isSuspended = webspace.suspended === 1 || webspace.status === 'suspended';
    const diskLimitBytes =
        webspace.disk_limit_bytes ?? (webspace.disk && webspace.disk > 0 ? webspace.disk * 1024 * 1024 : 0);
    const diskUsedBytes = webspace.disk_used_bytes ?? 0;

    const favoriteButton = showFavoriteToggle && onToggleFavorite && (
        <button
            type='button'
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onToggleFavorite();
            }}
            className={cn(
                'text-muted-foreground hover:text-primary shrink-0 rounded-lg p-2 transition-colors',
                isFavorite && 'text-primary',
            )}
            title={isFavorite ? t('webSpaces.favorite_remove') : t('webSpaces.favorite_add')}
            aria-label={isFavorite ? t('webSpaces.favorite_remove') : t('webSpaces.favorite_add')}
        >
            <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} aria-hidden />
        </button>
    );

    if (layout === 'list') {
        return (
            <div
                className={cn(
                    'bg-card/50 border-border/50 group relative flex flex-col items-stretch gap-4 rounded-2xl border p-4 backdrop-blur-xl transition-all sm:flex-row sm:items-center sm:gap-6 sm:p-5 md:p-6',
                    accessible ? 'hover:border-primary' : 'opacity-60',
                )}
            >
                {selectable && (
                    <div className='self-start pt-1'>
                        <Checkbox
                            checked={selected}
                            onCheckedChange={() => onToggleSelect && onToggleSelect()}
                            className='h-4 w-4'
                        />
                    </div>
                )}

                <Link href={webspaceUrl} className='block w-full min-w-0 flex-1 cursor-pointer'>
                    <div className='mb-1 flex flex-col gap-2'>
                        <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5'>
                            <h3 className='w-full min-w-0 flex-1 truncate text-base font-semibold sm:w-auto sm:max-w-[12rem] sm:text-lg md:max-w-none'>
                                {webspace.name}
                            </h3>
                            <div className='flex flex-wrap items-center gap-2'>
                                {isSuspended ? (
                                    <span className='rounded-lg border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600 uppercase sm:text-xs dark:text-red-400'>
                                        {t('servers.status.suspended')}
                                    </span>
                                ) : (
                                    <StatusBadge status={status} t={t} />
                                )}
                            </div>
                        </div>
                        {webspace.description ? (
                            <p className='text-muted-foreground line-clamp-2 text-xs wrap-break-word sm:text-sm'>
                                {webspace.description}
                            </p>
                        ) : null}
                    </div>
                </Link>

                <div className='mt-1 flex w-full flex-col gap-3 sm:mt-0 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                    <Link
                        href={webspaceUrl}
                        className='flex min-w-0 cursor-pointer flex-wrap items-start gap-x-6 gap-y-2 text-sm'
                    >
                        <div className='min-w-0'>
                            <div className='text-muted-foreground text-[10px] tracking-wider uppercase sm:text-xs'>
                                {t('webSpaces.webNode')}
                            </div>
                            <div className='max-w-[10rem] truncate text-xs font-medium sm:max-w-[14rem] sm:text-sm'>
                                {webspace.web_node_name || '—'}
                            </div>
                        </div>
                        <div className='min-w-0'>
                            <div className='text-muted-foreground text-[10px] tracking-wider uppercase sm:text-xs'>
                                {t('webSpaces.webPlate')}
                            </div>
                            <div className='max-w-[10rem] truncate text-xs font-medium sm:max-w-[14rem] sm:text-sm'>
                                {webspace.webplate_name || '—'}
                            </div>
                        </div>
                    </Link>
                    {favoriteButton}
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'group bg-card/50 border-border/50 relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all',
                accessible ? 'hover:border-primary' : 'opacity-60',
            )}
        >
            {selectable && (
                <div className='absolute top-4 left-4 z-10'>
                    <Checkbox
                        checked={selected}
                        onCheckedChange={() => onToggleSelect && onToggleSelect()}
                        className='bg-background/80 h-4 w-4'
                    />
                </div>
            )}
            {showFavoriteToggle && onToggleFavorite && (
                <div className='absolute top-4 right-4 z-10'>{favoriteButton}</div>
            )}

            <div className='space-y-4 p-4 sm:p-6'>
                <Link href={webspaceUrl} className='block min-w-0 cursor-pointer'>
                    <h3 className='mb-1 truncate text-xl font-bold'>{webspace.name}</h3>
                    <p className='text-muted-foreground line-clamp-2 text-sm'>
                        {webspace.description || t('webSpaces.noDescription')}
                    </p>
                </Link>

                <Link href={webspaceUrl} className='flex cursor-pointer flex-wrap items-center gap-2'>
                    {isSuspended ? (
                        <span className='rounded-lg border border-red-500/30 bg-red-500/20 px-2 py-1 text-xs font-bold text-red-600 uppercase dark:text-red-400'>
                            {t('servers.status.suspended')}
                        </span>
                    ) : (
                        <StatusBadge status={status} t={t} />
                    )}
                </Link>

                <Link href={webspaceUrl} className='grid cursor-pointer grid-cols-1 gap-3 pt-2 min-[400px]:grid-cols-2'>
                    <div className='min-w-0 text-sm'>
                        <div className='text-muted-foreground mb-1 text-xs'>{t('webSpaces.webNode')}</div>
                        <div className='truncate font-medium'>{webspace.web_node_name || '—'}</div>
                    </div>
                    <div className='min-w-0 text-sm'>
                        <div className='text-muted-foreground mb-1 text-xs'>{t('webSpaces.webPlate')}</div>
                        <div className='truncate font-medium'>{webspace.webplate_name || '—'}</div>
                    </div>
                </Link>

                <Link href={webspaceUrl} className={cn('block min-w-0 cursor-pointer space-y-2 pt-2 sm:space-y-2.5')}>
                    <ResourceBar
                        label={t('webSpaces.diskShort')}
                        used={diskUsedBytes}
                        limit={diskLimitBytes}
                        formatter={formatDisk}
                    />
                </Link>
            </div>
        </div>
    );
}
