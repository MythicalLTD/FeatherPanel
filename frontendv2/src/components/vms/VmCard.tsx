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
import { VmInstance } from '@/lib/vms-api';
import { Server, HardDrive, Cpu, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VmCardProps {
    vm: VmInstance;
    layout: 'grid' | 'list';
}

export function VmCard({ vm, layout }: VmCardProps) {
    const isSuspended = vm.suspended === 1 || vm.status === 'suspended';
    const isRunning = vm.status === 'running' && !isSuspended;
    const statusColor = isSuspended ? 'text-amber-500' : isRunning ? 'text-green-500' : 'text-red-500';
    const statusBg = isSuspended ? 'bg-amber-500/10' : isRunning ? 'bg-green-500/10' : 'bg-red-500/10';

    const content = (
        <>
            {layout === 'grid' ? (
                // Grid Layout
                <div className='space-y-4'>
                    <div>
                        <div className='flex items-start justify-between mb-2'>
                            <h3 className='font-semibold text-foreground truncate'>{vm.hostname}</h3>
                            <span
                                className={cn(
                                    'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ml-2 shrink-0',
                                    statusBg,
                                    statusColor,
                                )}
                            >
                                {vm.status || 'unknown'}
                            </span>
                        </div>
                        {vm.description && <p className='text-sm text-muted-foreground truncate'>{vm.description}</p>}
                        {vm.ip_address && <p className='text-xs text-muted-foreground mt-1'>{vm.ip_address}</p>}
                    </div>

                    <div className='grid grid-cols-3 gap-2 sm:gap-3'>
                        {vm.cpu_cores && (
                            <div className='flex items-center gap-2 p-2 bg-background/50 rounded-lg'>
                                <Cpu className='h-4 w-4 text-primary' />
                                <span className='text-xs font-medium'>{vm.cpu_cores}</span>
                            </div>
                        )}
                        {vm.memory_mb && (
                            <div className='flex items-center gap-2 p-2 bg-background/50 rounded-lg'>
                                <Zap className='h-4 w-4 text-primary' />
                                <span className='text-xs font-medium'>{Math.round(vm.memory_mb / 1024)}GB</span>
                            </div>
                        )}
                        {vm.disk_gb && (
                            <div className='flex items-center gap-2 p-2 bg-background/50 rounded-lg'>
                                <HardDrive className='h-4 w-4 text-primary' />
                                <span className='text-xs font-medium'>{vm.disk_gb}GB</span>
                            </div>
                        )}
                    </div>

                    <div className='flex gap-2'>
                        <span className='inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary'>
                            {vm.vm_type === 'qemu' ? 'QEMU' : 'LXC'}
                        </span>
                        <span className='inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-secondary/10 text-secondary-foreground'>
                            {vm.pve_node}
                        </span>
                    </div>
                </div>
            ) : (
                // List Layout
                <div className='flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 w-full min-w-0'>
                    <div className='flex items-start sm:items-center gap-3 flex-1 min-w-0'>
                        <div className='shrink-0 pt-0.5 sm:pt-0'>
                            <Server className='h-7 w-7 sm:h-8 sm:w-8 text-primary/60' />
                        </div>
                        <div className='flex-1 min-w-0'>
                            <h3 className='font-semibold text-foreground text-sm sm:text-base truncate'>
                                {vm.hostname}
                            </h3>
                            <p className='text-xs sm:text-sm text-muted-foreground line-clamp-2 break-words'>
                                {vm.vm_type === 'qemu' ? 'QEMU' : 'LXC'} • {vm.pve_node}
                                {vm.ip_address && ` • ${vm.ip_address}`}
                            </p>
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 sm:gap-3 sm:justify-end sm:flex-shrink-0 pl-10 sm:pl-0'>
                        {vm.cpu_cores && (
                            <div className='flex items-center gap-1 text-xs sm:text-sm'>
                                <Cpu className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0' />
                                <span className='font-medium tabular-nums'>{vm.cpu_cores}</span>
                            </div>
                        )}
                        {vm.memory_mb && (
                            <div className='flex items-center gap-1 text-xs sm:text-sm'>
                                <Zap className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0' />
                                <span className='font-medium tabular-nums'>{Math.round(vm.memory_mb / 1024)}GB</span>
                            </div>
                        )}
                        {vm.disk_gb && (
                            <div className='flex items-center gap-1 text-xs sm:text-sm'>
                                <HardDrive className='h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground shrink-0' />
                                <span className='font-medium tabular-nums'>{vm.disk_gb}GB</span>
                            </div>
                        )}
                        <span
                            className={cn(
                                'inline-flex items-center px-2 py-0.5 sm:px-3 sm:py-1 rounded-full text-[10px] sm:text-xs font-medium',
                                statusBg,
                                statusColor,
                            )}
                        >
                            {vm.status || 'unknown'}
                        </span>
                    </div>
                </div>
            )}
        </>
    );

    return (
        <Link href={`/vds/${vm.id}`}>
            <div
                className={cn(
                    'rounded-lg border border-border/50 bg-card/50 backdrop-blur-xl hover:bg-card/70 hover:border-primary/30 transition-all cursor-pointer p-3 sm:p-4',
                    layout === 'grid' ? 'col-span-1' : 'w-full',
                )}
            >
                {content}
            </div>
        </Link>
    );
}
