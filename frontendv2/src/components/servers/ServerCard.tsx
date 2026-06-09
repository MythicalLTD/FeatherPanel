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

import { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import { MoreVertical, FolderMinus, FolderInput, Star } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
    displayStatus,
    getServerMemory,
    getServerMemoryLimit,
    getServerDisk,
    getServerDiskLimit,
    getServerCpu,
    getServerCpuLimit,
    formatMemory,
    formatDisk,
    formatCpu,
    isServerAccessible,
} from '@/lib/server-utils';
import type { Server, ServerFolder } from '@/types/server';
import { StatusBadge } from './StatusBadge';
import { ResourceBar } from './ResourceBar';
import { Checkbox } from '@/components/ui/checkbox';

interface ServerCardProps {
    server: Server;
    layout: string;
    liveStats: { memory: number; disk: number; cpu: number; status: string } | null;
    isConnected: boolean;
    t: (key: string) => string;
    folders: ServerFolder[];
    onAssignFolder: (folderId: number) => void;
    onUnassignFolder: () => void;
    serverUrl: string;
    /** Optional selection controls for bulk actions */
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    /** Pin server to dashboard favorites (synced via user preferences) */
    showFavoriteToggle?: boolean;
    isFavorite?: boolean;
    onToggleFavorite?: () => void;
}

export function ServerCard({
    server,
    layout,
    liveStats,
    isConnected,
    t,
    folders,
    onAssignFolder,
    onUnassignFolder,
    serverUrl,
    selectable = false,
    selected = false,
    onToggleSelect,
    showFavoriteToggle = false,
    isFavorite = false,
    onToggleFavorite,
}: ServerCardProps) {
    const accessible = isServerAccessible(server);
    const status = liveStats?.status || displayStatus(server);
    const isSuspended = server.suspended === 1;

    const memory = liveStats?.memory ?? getServerMemory(server);
    const disk = liveStats?.disk ?? getServerDisk(server);
    const cpu = liveStats?.cpu ?? getServerCpu(server);

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
                {server.spell?.banner && (
                    <Link
                        href={serverUrl}
                        className='block h-28 w-full shrink-0 cursor-pointer overflow-hidden rounded-lg sm:h-16 sm:w-24'
                    >
                        <div
                            className='h-full w-full bg-cover bg-center'
                            style={{ backgroundImage: `url(${server.spell.banner})` }}
                        />
                    </Link>
                )}

                <Link href={serverUrl} className='block w-full min-w-0 flex-1 cursor-pointer'>
                    <div className='mb-1 flex flex-col gap-2'>
                        <div className='flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1.5'>
                            <h3 className='w-full min-w-0 flex-1 truncate text-base font-semibold sm:w-auto sm:max-w-[12rem] sm:text-lg md:max-w-none'>
                                {server.name}
                            </h3>
                            <div className='flex flex-wrap items-center gap-2'>
                                {isSuspended ? (
                                    <span className='rounded-lg border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-[10px] font-bold tracking-wide text-red-600 uppercase sm:text-xs dark:text-red-400'>
                                        {t('servers.status.suspended')}
                                    </span>
                                ) : (
                                    <StatusBadge status={status} t={t} liveConnected={isConnected && !isSuspended} />
                                )}
                            </div>
                        </div>
                        {server.description ? (
                            <p className='text-muted-foreground line-clamp-2 text-xs wrap-break-word sm:text-sm'>
                                {server.description}
                            </p>
                        ) : null}
                    </div>
                </Link>

                <div className='mt-1 flex w-full flex-col gap-3 sm:mt-0 sm:w-auto sm:shrink-0 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                    <Link
                        href={serverUrl}
                        className='flex min-w-0 cursor-pointer flex-wrap items-start gap-x-6 gap-y-2 text-sm'
                    >
                        <div className='min-w-0'>
                            <div className='text-muted-foreground text-[10px] tracking-wider uppercase sm:text-xs'>
                                {t('servers.node')}
                            </div>
                            <div className='max-w-[10rem] truncate text-xs font-medium sm:max-w-[14rem] sm:text-sm'>
                                {server.node?.name}
                            </div>
                        </div>
                        <div className='min-w-0'>
                            <div className='text-muted-foreground text-[10px] tracking-wider uppercase sm:text-xs'>
                                {t('servers.spell')}
                            </div>
                            <div className='max-w-[10rem] truncate text-xs font-medium sm:max-w-[14rem] sm:text-sm'>
                                {server.spell?.name}
                            </div>
                        </div>
                    </Link>

                    <div className='flex shrink-0 items-center gap-0.5 self-end sm:self-auto'>
                        {showFavoriteToggle && onToggleFavorite ? (
                            <button
                                type='button'
                                title={isFavorite ? t('servers.favorite_remove') : t('servers.favorite_add')}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleFavorite();
                                }}
                                className={cn(
                                    'rounded-lg p-2 transition-colors focus:outline-none',
                                    isFavorite
                                        ? 'text-amber-500 hover:bg-amber-500/10'
                                        : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                <Star className={cn('h-5 w-5', isFavorite && 'fill-current')} />
                            </button>
                        ) : null}
                        <Menu as='div' className='relative'>
                            <MenuButton
                                className='hover:bg-muted rounded-lg p-2 transition-colors focus:outline-none'
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className='text-muted-foreground h-5 w-5' />
                            </MenuButton>
                            <Transition
                                as={Fragment}
                                enter='transition ease-out duration-100'
                                enterFrom='transform opacity-0 scale-95'
                                enterTo='transform opacity-100 scale-100'
                                leave='transition ease-in duration-75'
                                leaveFrom='transform opacity-100 scale-100'
                                leaveTo='transform opacity-0 scale-95'
                            >
                                <MenuItems className='bg-popover border-border absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl border py-1 focus:outline-none'>
                                    {server.folder_id ? (
                                        <MenuItem>
                                            {({ active }) => (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUnassignFolder();
                                                    }}
                                                    className={cn(
                                                        'flex w-full items-center gap-2 px-4 py-2 text-sm',
                                                        active ? 'bg-muted' : '',
                                                    )}
                                                >
                                                    <FolderMinus className='h-4 w-4' />
                                                    {t('servers.removeFromFolder')}
                                                </button>
                                            )}
                                        </MenuItem>
                                    ) : (
                                        <div className='px-1 py-1'>
                                            <div className='text-muted-foreground px-3 py-1 text-xs font-semibold tracking-wider uppercase'>
                                                {t('servers.moveToFolder')}
                                            </div>
                                            {folders.map((folder) => (
                                                <MenuItem key={folder.id}>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAssignFolder(folder.id);
                                                            }}
                                                            className={cn(
                                                                'flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm',
                                                                active ? 'bg-muted' : '',
                                                            )}
                                                        >
                                                            <FolderInput className='h-4 w-4' />
                                                            {folder.name}
                                                        </button>
                                                    )}
                                                </MenuItem>
                                            ))}
                                            {folders.length === 0 && (
                                                <div className='text-muted-foreground px-4 py-2 text-sm italic'>
                                                    {t('servers.noFolders')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </MenuItems>
                            </Transition>
                        </Menu>
                    </div>
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
                <div
                    className='absolute top-3 right-3 z-20'
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    <Checkbox
                        checked={selected}
                        onCheckedChange={() => {
                            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                            onToggleSelect && onToggleSelect();
                        }}
                        className='bg-card/80 h-4 w-4'
                    />
                </div>
            )}
            <Link href={serverUrl} className='relative block cursor-pointer'>
                {server.spell?.banner && (
                    <div className='relative h-40 overflow-hidden'>
                        <div
                            className='absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105'
                            style={{ backgroundImage: `url(${server.spell.banner})` }}
                        />
                        <div className='from-card via-card/60 absolute inset-0 bg-linear-to-t to-transparent' />
                    </div>
                )}
                {isConnected && status === 'running' && (
                    <div className='absolute top-3 left-3'>
                        <span className='flex items-center gap-1.5 rounded-lg bg-green-500/20 px-2 py-1 text-xs font-medium text-green-100 backdrop-blur-sm'>
                            <span className='h-1.5 w-1.5 animate-pulse rounded-full bg-green-400' />
                            {t('servers.live')}
                        </span>
                    </div>
                )}
            </Link>

            <div className='space-y-4 p-4 sm:p-6'>
                <div className='flex items-start justify-between gap-4'>
                    <Link href={serverUrl} className='block min-w-0 flex-1 cursor-pointer'>
                        <h3 className='mb-1 truncate text-xl font-bold'>{server.name}</h3>
                        <p className='text-muted-foreground line-clamp-2 text-sm'>
                            {server.description || t('servers.noDescription')}
                        </p>
                    </Link>

                    <div className='flex shrink-0 items-center gap-0.5'>
                        {showFavoriteToggle && onToggleFavorite ? (
                            <button
                                type='button'
                                title={isFavorite ? t('servers.favorite_remove') : t('servers.favorite_add')}
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    onToggleFavorite();
                                }}
                                className={cn(
                                    'rounded-lg p-2 transition-colors focus:outline-none',
                                    isFavorite
                                        ? 'text-amber-500 hover:bg-amber-500/10'
                                        : 'text-muted-foreground hover:bg-muted',
                                )}
                            >
                                <Star className={cn('h-5 w-5', isFavorite && 'fill-current')} />
                            </button>
                        ) : null}
                        <Menu as='div' className='relative'>
                            <MenuButton
                                className='hover:bg-muted rounded-lg p-2 transition-colors focus:outline-none'
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreVertical className='text-muted-foreground h-5 w-5' />
                            </MenuButton>
                            <Transition
                                as={Fragment}
                                enter='transition ease-out duration-100'
                                enterFrom='transform opacity-0 scale-95'
                                enterTo='transform opacity-100 scale-100'
                                leave='transition ease-in duration-75'
                                leaveFrom='transform opacity-100 scale-100'
                                leaveTo='transform opacity-0 scale-95'
                            >
                                <MenuItems className='bg-popover border-border absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl border py-1 focus:outline-none'>
                                    {server.folder_id ? (
                                        <MenuItem>
                                            {({ active }) => (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onUnassignFolder();
                                                    }}
                                                    className={cn(
                                                        'flex w-full items-center gap-2 px-4 py-2 text-sm',
                                                        active ? 'bg-muted' : '',
                                                    )}
                                                >
                                                    <FolderMinus className='h-4 w-4' />
                                                    {t('servers.removeFromFolder')}
                                                </button>
                                            )}
                                        </MenuItem>
                                    ) : (
                                        <div className='px-1 py-1'>
                                            <div className='text-muted-foreground px-3 py-1 text-xs font-semibold tracking-wider uppercase'>
                                                {t('servers.moveToFolder')}
                                            </div>
                                            {folders.map((folder) => (
                                                <MenuItem key={folder.id}>
                                                    {({ active }) => (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onAssignFolder(folder.id);
                                                            }}
                                                            className={cn(
                                                                'flex w-full items-center gap-2 rounded-lg px-4 py-2 text-sm',
                                                                active ? 'bg-muted' : '',
                                                            )}
                                                        >
                                                            <FolderInput className='h-4 w-4' />
                                                            {folder.name}
                                                        </button>
                                                    )}
                                                </MenuItem>
                                            ))}
                                            {folders.length === 0 && (
                                                <div className='text-muted-foreground px-4 py-2 text-sm italic'>
                                                    {t('servers.noFolders')}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </MenuItems>
                            </Transition>
                        </Menu>
                    </div>
                </div>

                <Link href={serverUrl} className='flex cursor-pointer flex-wrap items-center gap-2'>
                    {isSuspended ? (
                        <span className='rounded-lg border border-red-500/30 bg-red-500/20 px-2 py-1 text-xs font-bold text-red-600 uppercase dark:text-red-400'>
                            {t('servers.status.suspended')}
                        </span>
                    ) : (
                        <StatusBadge status={status} t={t} />
                    )}
                    {server.is_subuser && (
                        <span className='rounded-lg bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-500'>
                            {t('servers.subuser')}
                        </span>
                    )}
                </Link>

                <Link href={serverUrl} className='grid cursor-pointer grid-cols-1 gap-3 pt-2 min-[400px]:grid-cols-2'>
                    <div className='min-w-0 text-sm'>
                        <div className='text-muted-foreground mb-1 text-xs'>{t('servers.node')}</div>
                        <div className='truncate font-medium'>{server.node?.name || 'N/A'}</div>
                    </div>
                    <div className='min-w-0 text-sm'>
                        <div className='text-muted-foreground mb-1 text-xs'>{t('servers.spell')}</div>
                        <div className='truncate font-medium'>{server.spell?.name || 'N/A'}</div>
                    </div>
                </Link>

                <Link href={serverUrl} className='block min-w-0 cursor-pointer space-y-2 pt-2 sm:space-y-2.5'>
                    <ResourceBar
                        label={t('servers.memoryShort')}
                        used={memory}
                        limit={getServerMemoryLimit(server)}
                        formatter={formatMemory}
                    />
                    <ResourceBar
                        label={t('servers.cpuShort')}
                        used={cpu}
                        limit={getServerCpuLimit(server)}
                        formatter={formatCpu}
                    />
                    <ResourceBar
                        label={t('servers.diskShort')}
                        used={disk}
                        limit={getServerDiskLimit(server)}
                        formatter={formatDisk}
                    />
                </Link>
            </div>
        </div>
    );
}
