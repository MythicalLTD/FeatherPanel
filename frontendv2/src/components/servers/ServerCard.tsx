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

import { Fragment } from 'react';
import { Menu, MenuButton, MenuItems, MenuItem, Transition } from '@headlessui/react';
import { MoreVertical, FolderMinus, FolderInput } from 'lucide-react';
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
}: ServerCardProps) {
    const accessible = isServerAccessible(server);
    const status = liveStats?.status || displayStatus(server);

    // Use live stats if available, otherwise fall back to server stats
    const memory = liveStats?.memory ?? getServerMemory(server);
    const disk = liveStats?.disk ?? getServerDisk(server);
    const cpu = liveStats?.cpu ?? getServerCpu(server);

    if (layout === 'list') {
        return (
            <div
                className={cn(
                    'flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 p-4 sm:p-6 bg-card rounded-2xl border border-border transition-all relative group',
                    accessible ? 'hover:border-primary hover:shadow-lg' : 'opacity-60',
                )}
            >
                {/* Banner Thumbnail */}
                {server.spell?.banner && (
                    <Link
                        href={accessible ? serverUrl : '#'}
                        className={cn(
                            'w-full sm:w-24 h-32 sm:h-16 rounded-lg overflow-hidden shrink-0 block',
                            accessible && 'cursor-pointer',
                        )}
                        onClick={(e) => !accessible && e.preventDefault()}
                    >
                        <div
                            className='w-full h-full bg-cover bg-center'
                            style={{ backgroundImage: `url(${server.spell.banner})` }}
                        />
                    </Link>
                )}

                <Link
                    href={accessible ? serverUrl : '#'}
                    className={cn('flex-1 min-w-0 w-full block', accessible && 'cursor-pointer')}
                    onClick={(e) => !accessible && e.preventDefault()}
                >
                    <div className='flex items-center gap-3 mb-2'>
                        <h3 className='text-lg font-semibold truncate'>{server.name}</h3>
                        <StatusBadge status={status} t={t} />
                        {isConnected && (
                            <span
                                className='h-2 w-2 bg-green-500 rounded-full animate-pulse'
                                title={t('servers.liveConnected')}
                            />
                        )}
                    </div>
                    <p className='text-sm text-muted-foreground truncate'>{server.description}</p>
                </Link>

                <div className='flex items-center justify-between w-full sm:w-auto gap-4 mt-2 sm:mt-0'>
                    <Link
                        href={accessible ? serverUrl : '#'}
                        className={cn('flex items-center gap-4 sm:gap-6', accessible && 'cursor-pointer')}
                        onClick={(e) => !accessible && e.preventDefault()}
                    >
                        <div className='text-sm'>
                            <div className='text-muted-foreground text-xs sm:text-sm'>{t('servers.node')}</div>
                            <div className='font-medium text-sm sm:text-base'>{server.node?.name}</div>
                        </div>
                        <div className='text-sm'>
                            <div className='text-muted-foreground text-xs sm:text-sm'>{t('servers.spell')}</div>
                            <div className='font-medium text-sm sm:text-base'>{server.spell?.name}</div>
                        </div>
                    </Link>

                    {/* Manage Menu */}
                    <Menu as='div' className='relative'>
                        <MenuButton
                            className='p-2 hover:bg-muted rounded-lg transition-colors focus:outline-none'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className='h-5 w-5 text-muted-foreground' />
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
                            <MenuItems className='absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-popover border border-border shadow-2xl focus:outline-none py-1'>
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
                                        <div className='px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
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
                                                            'flex w-full items-center gap-2 px-4 py-2 text-sm rounded-lg',
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
                                            <div className='px-4 py-2 text-sm text-muted-foreground italic'>
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
        );
    }

    return (
        <div
            className={cn(
                'group relative bg-card rounded-2xl border border-border overflow-hidden transition-all',
                accessible ? 'hover:border-primary hover:shadow-2xl hover:shadow-primary/10' : 'opacity-60',
            )}
        >
            {/* Banner Image */}
            <Link
                href={accessible ? serverUrl : '#'}
                className={cn('relative block', accessible && 'cursor-pointer')}
                onClick={(e) => !accessible && e.preventDefault()}
            >
                {server.spell?.banner && (
                    <div className='relative h-40 overflow-hidden'>
                        <div
                            className='absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-105'
                            style={{ backgroundImage: `url(${server.spell.banner})` }}
                        />
                        <div className='absolute inset-0 bg-linear-to-t from-card via-card/60 to-transparent' />
                    </div>
                )}
                {isConnected && (
                    <div className='absolute top-3 left-3'>
                        <span className='px-2 py-1 bg-green-500/20 backdrop-blur-sm text-green-100 text-xs rounded-lg font-medium flex items-center gap-1.5'>
                            <span className='h-1.5 w-1.5 bg-green-400 rounded-full animate-pulse' />
                            {t('servers.live')}
                        </span>
                    </div>
                )}
            </Link>

            <div className='p-4 sm:p-6 space-y-4'>
                <div className='flex items-start justify-between gap-4'>
                    <Link
                        href={accessible ? serverUrl : '#'}
                        className={cn('flex-1 min-w-0 block', accessible && 'cursor-pointer')}
                        onClick={(e) => !accessible && e.preventDefault()}
                    >
                        <h3 className='text-xl font-bold truncate mb-1'>{server.name}</h3>
                        <p className='text-sm text-muted-foreground line-clamp-2'>
                            {server.description || t('servers.noDescription')}
                        </p>
                    </Link>

                    {/* Manage Menu */}
                    <Menu as='div' className='relative shrink-0'>
                        <MenuButton
                            className='p-2 hover:bg-muted rounded-lg transition-colors focus:outline-none'
                            onClick={(e) => e.stopPropagation()}
                        >
                            <MoreVertical className='h-5 w-5 text-muted-foreground' />
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
                            <MenuItems className='absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-xl bg-popover border border-border shadow-2xl focus:outline-none py-1'>
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
                                                Remove from Folder
                                            </button>
                                        )}
                                    </MenuItem>
                                ) : (
                                    <div className='px-1 py-1'>
                                        <div className='px-3 py-1 text-xs font-semibold text-muted-foreground uppercase tracking-wider'>
                                            Move to Folder
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
                                                            'flex w-full items-center gap-2 px-4 py-2 text-sm rounded-lg',
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
                                            <div className='px-4 py-2 text-sm text-muted-foreground italic'>
                                                No folders created
                                            </div>
                                        )}
                                    </div>
                                )}
                            </MenuItems>
                        </Transition>
                    </Menu>
                </div>

                <Link
                    href={accessible ? serverUrl : '#'}
                    className={cn('flex items-center gap-2', accessible && 'cursor-pointer')}
                    onClick={(e) => !accessible && e.preventDefault()}
                >
                    <StatusBadge status={status} t={t} />
                    {server.is_subuser && (
                        <span className='px-2 py-1 bg-blue-500/10 text-blue-500 text-xs font-medium rounded-lg'>
                            {t('servers.subuser')}
                        </span>
                    )}
                </Link>

                <Link
                    href={accessible ? serverUrl : '#'}
                    className={cn('grid grid-cols-2 gap-3 pt-2', accessible && 'cursor-pointer')}
                    onClick={(e) => !accessible && e.preventDefault()}
                >
                    <div className='text-sm'>
                        <div className='text-muted-foreground mb-1'>{t('servers.node')}</div>
                        <div className='font-medium truncate'>{server.node?.name || 'N/A'}</div>
                    </div>
                    <div className='text-sm'>
                        <div className='text-muted-foreground mb-1'>{t('servers.spell')}</div>
                        <div className='font-medium truncate'>{server.spell?.name || 'N/A'}</div>
                    </div>
                </Link>

                <Link
                    href={accessible ? serverUrl : '#'}
                    className={cn('space-y-2 pt-2 block', accessible && 'cursor-pointer')}
                    onClick={(e) => !accessible && e.preventDefault()}
                >
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
