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
                        <div className='mb-2 flex items-start justify-between'>
                            <h3 className='text-foreground truncate font-semibold'>{vm.hostname}</h3>
                            <span
                                className={cn(
                                    'ml-2 inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                    statusBg,
                                    statusColor,
                                )}
                            >
                                {vm.status || 'unknown'}
                            </span>
                        </div>
                        {vm.description && <p className='text-muted-foreground truncate text-sm'>{vm.description}</p>}
                        {vm.ip_address && <p className='text-muted-foreground mt-1 text-xs'>{vm.ip_address}</p>}
                    </div>

                    <div className='grid grid-cols-3 gap-2 sm:gap-3'>
                        {vm.cpu_cores && (
                            <div className='bg-background/50 flex items-center gap-2 rounded-lg p-2'>
                                <Cpu className='text-primary h-4 w-4' />
                                <span className='text-xs font-medium'>{vm.cpu_cores}</span>
                            </div>
                        )}
                        {vm.memory_mb && (
                            <div className='bg-background/50 flex items-center gap-2 rounded-lg p-2'>
                                <Zap className='text-primary h-4 w-4' />
                                <span className='text-xs font-medium'>{Math.round(vm.memory_mb / 1024)}GB</span>
                            </div>
                        )}
                        {vm.disk_gb && (
                            <div className='bg-background/50 flex items-center gap-2 rounded-lg p-2'>
                                <HardDrive className='text-primary h-4 w-4' />
                                <span className='text-xs font-medium'>{vm.disk_gb}GB</span>
                            </div>
                        )}
                    </div>

                    <div className='flex gap-2'>
                        <span className='bg-primary/10 text-primary inline-flex items-center rounded-md px-2 py-1 text-xs font-medium'>
                            {vm.vm_type === 'qemu' ? 'QEMU' : 'LXC'}
                        </span>
                        <span className='bg-secondary/10 text-secondary-foreground inline-flex items-center rounded-md px-2 py-1 text-xs font-medium'>
                            {vm.pve_node}
                        </span>
                    </div>
                </div>
            ) : (
                // List Layout
                <div className='flex w-full min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
                    <div className='flex min-w-0 flex-1 items-start gap-3 sm:items-center'>
                        <div className='shrink-0 pt-0.5 sm:pt-0'>
                            <Server className='text-primary/60 h-7 w-7 sm:h-8 sm:w-8' />
                        </div>
                        <div className='min-w-0 flex-1'>
                            <h3 className='text-foreground truncate text-sm font-semibold sm:text-base'>
                                {vm.hostname}
                            </h3>
                            <p className='text-muted-foreground line-clamp-2 text-xs break-words sm:text-sm'>
                                {vm.vm_type === 'qemu' ? 'QEMU' : 'LXC'} • {vm.pve_node}
                                {vm.ip_address && ` • ${vm.ip_address}`}
                            </p>
                        </div>
                    </div>

                    <div className='flex flex-wrap items-center gap-2 pl-10 sm:flex-shrink-0 sm:justify-end sm:gap-3 sm:pl-0'>
                        {vm.cpu_cores && (
                            <div className='flex items-center gap-1 text-xs sm:text-sm'>
                                <Cpu className='text-muted-foreground h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4' />
                                <span className='font-medium tabular-nums'>{vm.cpu_cores}</span>
                            </div>
                        )}
                        {vm.memory_mb && (
                            <div className='flex items-center gap-1 text-xs sm:text-sm'>
                                <Zap className='text-muted-foreground h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4' />
                                <span className='font-medium tabular-nums'>{Math.round(vm.memory_mb / 1024)}GB</span>
                            </div>
                        )}
                        {vm.disk_gb && (
                            <div className='flex items-center gap-1 text-xs sm:text-sm'>
                                <HardDrive className='text-muted-foreground h-3.5 w-3.5 shrink-0 sm:h-4 sm:w-4' />
                                <span className='font-medium tabular-nums'>{vm.disk_gb}GB</span>
                            </div>
                        )}
                        <span
                            className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium sm:px-3 sm:py-1 sm:text-xs',
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
                    'border-border/50 bg-card/50 hover:bg-card/70 hover:border-primary/30 cursor-pointer rounded-lg border p-3 backdrop-blur-xl transition-all sm:p-4',
                    layout === 'grid' ? 'col-span-1' : 'w-full',
                )}
            >
                {content}
            </div>
        </Link>
    );
}
