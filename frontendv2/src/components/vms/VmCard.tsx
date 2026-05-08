// This file is part of FeatherPanel.
// Copyright (C) 2025 MythicalSystems Studios | FeatherPanel Contributors

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
import { HardDrive, Cpu, MemoryStick, Globe, Server, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VmCardProps {
    vm: VmInstance;
    layout: 'grid' | 'list';
}

function StatusDot({ status, suspended }: { status?: string; suspended?: number }) {
    const isSuspended = suspended === 1 || status === 'suspended';
    const isRunning = status === 'running' && !isSuspended;
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
                isSuspended
                    ? 'bg-amber-500/15 text-amber-400'
                    : isRunning
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-red-500/15 text-red-400',
            )}
        >
            <span
                className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isSuspended ? 'bg-amber-400' : isRunning ? 'animate-pulse bg-green-400' : 'bg-red-400',
                )}
            />
            {isSuspended ? 'suspended' : (status ?? 'unknown')}
        </span>
    );
}

interface SpecProps {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: string;
}

function Spec({ icon: Icon, label, value }: SpecProps) {
    return (
        <div className='flex items-center gap-1.5'>
            <Icon className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
            <span className='text-muted-foreground text-xs'>{label}</span>
            <span className='text-foreground text-xs font-semibold'>{value}</span>
        </div>
    );
}

export function VmCard({ vm, layout }: VmCardProps) {
    // Total vCPUs = sockets × cores
    const totalCores = (vm.cpus ?? 1) * (vm.cores ?? 1);
    const memoryGb = vm.memory ? (vm.memory / 1024).toFixed(vm.memory >= 1024 ? 0 : 1) : null;
    const nodeName = vm.node_name ?? vm.pve_node ?? null;

    if (layout === 'list') {
        return (
            <Link href={`/vds/${vm.id}`}>
                <div className='border-border/40 bg-card/40 hover:bg-card/70 hover:border-primary/30 group flex items-center gap-4 rounded-xl border p-4 backdrop-blur-sm transition-all duration-200'>
                    {/* Icon */}
                    <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                        <Server className='text-primary h-5 w-5' />
                    </div>

                    {/* Name + IP */}
                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <span className='text-foreground truncate font-semibold'>{vm.hostname}</span>
                            <StatusDot status={vm.status} suspended={vm.suspended} />
                        </div>
                        <div className='text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs'>
                            {vm.ip_address && (
                                <span className='flex items-center gap-1'>
                                    <Globe className='h-3 w-3' />
                                    {vm.ip_address}
                                </span>
                            )}
                            {nodeName && <span>{nodeName}</span>}
                            <span className='uppercase opacity-60'>{vm.vm_type}</span>
                        </div>
                    </div>

                    {/* Specs */}
                    <div className='hidden shrink-0 flex-col gap-1 sm:flex'>
                        {totalCores > 0 && <Spec icon={Cpu} label='vCPU' value={String(totalCores)} />}
                        {memoryGb && <Spec icon={MemoryStick} label='RAM' value={`${memoryGb} GB`} />}
                        {vm.disk_gb && <Spec icon={HardDrive} label='Disk' value={`${vm.disk_gb} GB`} />}
                    </div>

                    {/* Arrow */}
                    <ArrowRight className='text-muted-foreground group-hover:text-primary ml-2 hidden h-4 w-4 shrink-0 transition-colors sm:block' />
                </div>
            </Link>
        );
    }

    // Grid layout
    return (
        <Link href={`/vds/${vm.id}`}>
            <div className='border-border/40 bg-card/40 hover:bg-card/70 hover:border-primary/30 group flex h-full flex-col rounded-xl border p-4 backdrop-blur-sm transition-all duration-200'>
                {/* Header */}
                <div className='mb-3 flex items-start justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-2.5'>
                        <div className='bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                            <Server className='text-primary h-4.5 w-4.5' />
                        </div>
                        <span className='text-foreground truncate font-semibold'>{vm.hostname}</span>
                    </div>
                    <StatusDot status={vm.status} suspended={vm.suspended} />
                </div>

                {/* IP + Node */}
                <div className='text-muted-foreground mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
                    {vm.ip_address && (
                        <span className='flex items-center gap-1'>
                            <Globe className='h-3 w-3 shrink-0' />
                            {vm.ip_address}
                        </span>
                    )}
                    {nodeName && <span>{nodeName}</span>}
                </div>

                {/* Specs grid */}
                <div className='mt-auto grid grid-cols-3 gap-2'>
                    <div className='bg-background/60 flex flex-col items-center rounded-lg px-2 py-2.5'>
                        <Cpu className='text-primary mb-1 h-4 w-4' />
                        <span className='text-foreground text-sm font-bold'>{totalCores}</span>
                        <span className='text-muted-foreground text-[10px] tracking-wide uppercase'>vCPU</span>
                    </div>
                    <div className='bg-background/60 flex flex-col items-center rounded-lg px-2 py-2.5'>
                        <MemoryStick className='text-primary mb-1 h-4 w-4' />
                        <span className='text-foreground text-sm font-bold'>{memoryGb ?? '—'}</span>
                        <span className='text-muted-foreground text-[10px] tracking-wide uppercase'>GB RAM</span>
                    </div>
                    <div className='bg-background/60 flex flex-col items-center rounded-lg px-2 py-2.5'>
                        <HardDrive className='text-primary mb-1 h-4 w-4' />
                        <span className='text-foreground text-sm font-bold'>{vm.disk_gb ?? '—'}</span>
                        <span className='text-muted-foreground text-[10px] tracking-wide uppercase'>GB Disk</span>
                    </div>
                </div>

                {/* Footer */}
                <div className='border-border/30 mt-3 flex items-center justify-between border-t pt-3'>
                    <div className='flex gap-1.5'>
                        <span className='bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase'>
                            {vm.vm_type}
                        </span>
                        {nodeName && (
                            <span className='bg-muted/50 text-muted-foreground rounded px-2 py-0.5 text-[10px] font-medium'>
                                {nodeName}
                            </span>
                        )}
                    </div>
                    <ArrowRight className='text-muted-foreground group-hover:text-primary h-3.5 w-3.5 transition-colors' />
                </div>
            </div>
        </Link>
    );
}
