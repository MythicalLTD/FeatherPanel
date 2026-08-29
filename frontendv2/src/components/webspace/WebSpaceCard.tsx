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
import { AppWindow, ArrowRight, Globe, HardDrive, LayoutTemplate, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export type DashboardWebSpace = {
    uuid: string;
    uuidShort?: string;
    name: string;
    web_node_name?: string | null;
    webplate_name?: string | null;
    domains?: string[];
    status?: string;
    state?: string;
    ssl?: boolean;
    dns_status?: string | null;
    suspended?: number;
    disk?: number;
};

interface WebSpaceCardProps {
    webspace: DashboardWebSpace;
    layout?: 'list' | 'grid';
}

function StatusDot({ status, state, suspended }: { status?: string; state?: string; suspended?: number }) {
    const isSuspended = suspended === 1 || status === 'suspended';
    const running = !isSuspended && state === 'running';
    const label = isSuspended ? 'suspended' : state || status || 'unknown';

    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide',
                isSuspended
                    ? 'bg-amber-500/15 text-amber-400'
                    : running
                      ? 'bg-green-500/15 text-green-400'
                      : 'bg-red-500/15 text-red-400',
            )}
        >
            <span
                className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isSuspended ? 'bg-amber-400' : running ? 'animate-pulse bg-green-400' : 'bg-red-400',
                )}
            />
            {label}
        </span>
    );
}

export function WebSpaceCard({ webspace, layout = 'list' }: WebSpaceCardProps) {
    const short = webspace.uuidShort || webspace.uuid.slice(0, 8);
    const domains = Array.isArray(webspace.domains) ? webspace.domains : [];
    const href = `/webspace/${short}`;
    const diskLabel = webspace.disk ? `${webspace.disk} MiB` : '—';

    if (layout === 'list') {
        return (
            <Link href={href}>
                <div className='border-border/40 bg-card/40 hover:bg-card/70 hover:border-primary/30 group flex items-center gap-4 rounded-xl border p-4 backdrop-blur-sm transition-all duration-200'>
                    <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl'>
                        <AppWindow className='text-primary h-5 w-5' />
                    </div>

                    <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                            <span className='text-foreground truncate font-semibold'>{webspace.name}</span>
                            <StatusDot status={webspace.status} state={webspace.state} suspended={webspace.suspended} />
                        </div>
                        <div className='text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs'>
                            {domains[0] && (
                                <span className='flex items-center gap-1 truncate'>
                                    <Globe className='h-3 w-3 shrink-0' />
                                    {domains[0]}
                                    {domains.length > 1 ? ` +${domains.length - 1}` : ''}
                                </span>
                            )}
                            {webspace.web_node_name && <span>{webspace.web_node_name}</span>}
                            {webspace.webplate_name && (
                                <span className='uppercase opacity-60'>{webspace.webplate_name}</span>
                            )}
                        </div>
                    </div>

                    <div className='hidden shrink-0 flex-col gap-1 sm:flex'>
                        {webspace.disk ? (
                            <div className='flex items-center gap-1.5'>
                                <HardDrive className='text-muted-foreground h-3.5 w-3.5' />
                                <span className='text-muted-foreground text-xs'>Disk</span>
                                <span className='text-foreground text-xs font-semibold'>{diskLabel}</span>
                            </div>
                        ) : null}
                        {webspace.ssl ? (
                            <div className='flex items-center gap-1.5'>
                                <ShieldCheck className='text-muted-foreground h-3.5 w-3.5' />
                                <span className='text-foreground text-xs font-semibold'>SSL</span>
                            </div>
                        ) : null}
                    </div>

                    <ArrowRight className='text-muted-foreground group-hover:text-primary ml-2 hidden h-4 w-4 shrink-0 transition-colors sm:block' />
                </div>
            </Link>
        );
    }

    return (
        <Link href={href}>
            <div className='border-border/40 bg-card/40 hover:bg-card/70 hover:border-primary/30 group flex h-full flex-col rounded-xl border p-4 backdrop-blur-sm transition-all duration-200'>
                <div className='mb-3 flex items-start justify-between gap-2'>
                    <div className='flex min-w-0 items-center gap-2.5'>
                        <div className='bg-primary/10 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg'>
                            <AppWindow className='text-primary h-4.5 w-4.5' />
                        </div>
                        <span className='text-foreground truncate font-semibold'>{webspace.name}</span>
                    </div>
                    <StatusDot status={webspace.status} state={webspace.state} suspended={webspace.suspended} />
                </div>

                <div className='text-muted-foreground mb-4 flex flex-wrap gap-x-3 gap-y-1 text-xs'>
                    {domains[0] && (
                        <span className='flex items-center gap-1 truncate'>
                            <Globe className='h-3 w-3 shrink-0' />
                            {domains[0]}
                            {domains.length > 1 ? ` +${domains.length - 1}` : ''}
                        </span>
                    )}
                    {webspace.web_node_name && <span>{webspace.web_node_name}</span>}
                </div>

                <div className='mt-auto grid grid-cols-2 gap-2'>
                    <div className='bg-background/60 flex flex-col items-center rounded-lg px-2 py-2.5'>
                        <HardDrive className='text-primary mb-1 h-4 w-4' />
                        <span className='text-foreground text-sm font-bold'>{diskLabel}</span>
                        <span className='text-muted-foreground text-[10px] tracking-wide uppercase'>Disk</span>
                    </div>
                    <div className='bg-background/60 flex flex-col items-center rounded-lg px-2 py-2.5'>
                        <LayoutTemplate className='text-primary mb-1 h-4 w-4' />
                        <span className='text-foreground truncate px-1 text-sm font-bold'>
                            {webspace.webplate_name || '—'}
                        </span>
                        <span className='text-muted-foreground text-[10px] tracking-wide uppercase'>Plate</span>
                    </div>
                </div>

                <div className='border-border/30 mt-3 flex items-center justify-between border-t pt-3'>
                    <div className='flex gap-1.5'>
                        {webspace.ssl && (
                            <span className='bg-primary/10 text-primary rounded px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase'>
                                SSL
                            </span>
                        )}
                        {webspace.web_node_name && (
                            <span className='bg-muted/50 text-muted-foreground rounded px-2 py-0.5 text-[10px] font-medium'>
                                {webspace.web_node_name}
                            </span>
                        )}
                    </div>
                    <ArrowRight className='text-muted-foreground group-hover:text-primary h-3.5 w-3.5 transition-colors' />
                </div>
            </div>
        </Link>
    );
}
