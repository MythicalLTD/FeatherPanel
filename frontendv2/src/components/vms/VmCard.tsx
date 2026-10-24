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
import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { Globe, Play, Square, RotateCcw, Terminal, Server, Loader2 } from 'lucide-react';
import { VmInstance } from '@/lib/vms-api';
import { cn } from '@/lib/utils';
import { formatMemory } from '@/lib/server-utils';
import { OverflowText } from '@/components/featherui/OverflowText';
import { Sensitive } from '@/components/common/Sensitive';
import { ServiceExpiryChip } from '@/components/common/ServiceExpiryChip';
import { StatusBadge } from '@/components/servers/StatusBadge';
import { ResourceBar } from '@/components/servers/ResourceBar';
import { useTranslation } from '@/contexts/TranslationContext';

interface VmCardProps {
    vm: VmInstance;
    layout: 'grid' | 'list';
}

interface LiveStatus {
    status?: string;
    cpu?: number;
    maxcpu?: number;
    mem?: number;
    maxmem?: number;
}

const STATUS_POLL_MS = 30_000;

/** Live Proxmox status for a card, polled while the card is mounted. */
function useVmLiveStatus(id: number, enabled: boolean) {
    const [live, setLive] = useState<LiveStatus | null>(null);
    const refresh = useCallback(async () => {
        try {
            const { data } = await axios.get(`/api/user/vm-instances/${id}/status`, { timeout: 8000 });
            if (data?.success && data.data?.status) setLive(data.data.status as LiveStatus);
        } catch {
            // Keep the last known values; the card falls back to the DB status.
        }
    }, [id]);
    useEffect(() => {
        if (!enabled) return;
        const first = setTimeout(() => void refresh(), 0);
        const timer = setInterval(() => void refresh(), STATUS_POLL_MS);
        return () => {
            clearTimeout(first);
            clearInterval(timer);
        };
    }, [enabled, refresh]);
    return { live, refresh };
}

function QuickActions({
    vm,
    status,
    onDone,
    className,
}: {
    vm: VmInstance;
    status: string;
    onDone: () => void;
    className?: string;
}) {
    const { t } = useTranslation();
    const [busy, setBusy] = useState<string | null>(null);
    const running = status === 'running';

    const run = async (action: 'start' | 'stop' | 'reboot', e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setBusy(action);
        try {
            await axios.post(`/api/user/vm-instances/${vm.id}/power`, { action });
            toast.success(t('ui.components.vms.vmCard.action_sent'));
            setTimeout(onDone, 4000);
        } catch (err) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : null;
            toast.error(msg || t('ui.components.vms.vmCard.action_failed'));
        } finally {
            setBusy(null);
        }
    };

    const btn =
        'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors disabled:pointer-events-none disabled:opacity-50';
    const icon = (action: string, Icon: typeof Play) =>
        busy === action ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <Icon className='h-3.5 w-3.5' />;

    return (
        <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
            {running ? (
                <>
                    <button
                        type='button'
                        disabled={busy !== null}
                        onClick={(e) => void run('reboot', e)}
                        className={cn(btn, 'border-border hover:bg-muted')}
                        title={t('ui.components.vms.vmCard.restart')}
                    >
                        {icon('reboot', RotateCcw)}
                        <span className='hidden sm:inline'>{t('ui.components.vms.vmCard.restart')}</span>
                    </button>
                    <button
                        type='button'
                        disabled={busy !== null}
                        onClick={(e) => void run('stop', e)}
                        className={cn(btn, 'border-red-500/30 text-red-500 hover:bg-red-500/10')}
                        title={t('ui.components.vms.vmCard.stop')}
                    >
                        {icon('stop', Square)}
                        <span className='hidden sm:inline'>{t('ui.components.vms.vmCard.stop')}</span>
                    </button>
                </>
            ) : (
                <button
                    type='button'
                    disabled={busy !== null || status === 'unknown'}
                    onClick={(e) => void run('start', e)}
                    className={cn(btn, 'border-green-500/30 text-green-600 hover:bg-green-500/10 dark:text-green-400')}
                    title={t('ui.components.vms.vmCard.start')}
                >
                    {icon('start', Play)}
                    <span className='hidden sm:inline'>{t('ui.components.vms.vmCard.start')}</span>
                </button>
            )}
            <Link
                href={`/vds/${vm.id}`}
                onClick={(e) => e.stopPropagation()}
                className={cn(btn, 'border-border hover:bg-muted')}
                title={t('ui.components.vms.vmCard.console')}
            >
                <Terminal className='h-3.5 w-3.5' />
                <span className='hidden sm:inline'>{t('ui.components.vms.vmCard.console')}</span>
            </Link>
        </div>
    );
}

export function VmCard({ vm, layout }: VmCardProps) {
    const { t } = useTranslation();
    const suspended = vm.suspended === 1 || vm.status === 'suspended';
    const { live, refresh } = useVmLiveStatus(vm.id, !suspended);
    const status = suspended ? 'suspended' : live?.status || vm.status || 'unknown';
    const href = `/vds/${vm.id}`;
    const vcpus = live?.maxcpu ?? (vm.cpus ?? 1) * (vm.cores ?? 1);
    const memLimit = live?.maxmem ?? (vm.memory ?? 0) * 1024 * 1024;
    const memUsed = status === 'running' ? (live?.mem ?? 0) : 0;
    const cpuPercent = status === 'running' ? (live?.cpu ?? 0) * 100 : 0;
    const nodeName = vm.node_name ?? vm.pve_node ?? null;
    const diskLabel = vm.disk_gb ? `${vm.disk_gb} GB` : 'N/A';

    const meta = (
        <>
            <div className='min-w-0 text-sm'>
                <div className='text-muted-foreground mb-1 text-xs'>{t('ui.components.vms.vmCard.ip')}</div>
                <div className='flex items-center gap-1 font-medium'>
                    <Globe className='text-muted-foreground h-3.5 w-3.5 shrink-0' />
                    {vm.ip_address ? <Sensitive>{vm.ip_address}</Sensitive> : 'N/A'}
                </div>
            </div>
            <div className='min-w-0 text-sm'>
                <div className='text-muted-foreground mb-1 text-xs'>{t('ui.components.vms.vmCard.specs')}</div>
                <OverflowText className='font-medium'>
                    {`${vcpus} vCPU · ${formatMemory(memLimit)} · ${diskLabel}`}
                </OverflowText>
            </div>
        </>
    );

    const bars = (
        <>
            <ResourceBar
                label={t('ui.components.vms.vmCard.cpu')}
                used={cpuPercent}
                limit={100}
                formatter={(v) => `${v.toFixed(1)}%`}
            />
            <ResourceBar
                label={t('ui.components.vms.vmCard.memory')}
                used={memUsed}
                limit={memLimit}
                formatter={formatMemory}
            />
        </>
    );

    const badges = (
        <div className='flex flex-wrap items-center gap-2'>
            <StatusBadge status={status} t={t} liveConnected={live !== null} />
            <span className='bg-primary/10 text-primary rounded-lg px-2 py-0.5 text-xs font-medium uppercase'>
                {vm.vm_type}
            </span>
            {vm.is_subuser && (
                <span className='rounded-lg bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-500'>
                    {t('servers.subuser')}
                </span>
            )}
            <ServiceExpiryChip expiresAt={vm.expires_at} compact />
        </div>
    );

    if (layout === 'list') {
        return (
            <div className='fp-surface-solid hover:border-primary group relative flex flex-col items-stretch gap-4 rounded-xl border p-4 transition-all sm:flex-row sm:items-center sm:gap-6 sm:p-5'>
                <Link href={href} className='flex min-w-0 flex-1 items-center gap-3'>
                    <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                        <Server className='text-primary h-5 w-5' />
                    </div>
                    <div className='min-w-0 flex-1 space-y-1.5'>
                        <h3 className='text-base font-semibold sm:text-lg'>
                            <OverflowText>{vm.hostname}</OverflowText>
                        </h3>
                        {badges}
                    </div>
                </Link>
                <Link href={href} className='grid min-w-0 gap-3 sm:w-56 sm:shrink-0'>
                    {bars}
                </Link>
                <Link href={href} className='hidden min-w-0 gap-3 lg:grid lg:w-56 lg:grid-cols-1'>
                    {meta}
                </Link>
                {!suspended && <QuickActions vm={vm} status={status} onDone={refresh} className='sm:shrink-0' />}
            </div>
        );
    }

    return (
        <div className='fp-surface-solid hover:border-primary group relative flex h-full flex-col gap-3 rounded-xl border p-4 transition-all sm:p-5'>
            <Link href={href} className='flex min-w-0 items-center gap-3'>
                <div className='bg-primary/10 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg'>
                    <Server className='text-primary h-5 w-5' />
                </div>
                <div className='min-w-0 flex-1'>
                    <h3 className='text-base font-semibold sm:text-lg'>
                        <OverflowText>{vm.hostname}</OverflowText>
                    </h3>
                    {nodeName && <p className='text-muted-foreground truncate text-xs'>{nodeName}</p>}
                </div>
            </Link>
            <Link href={href}>{badges}</Link>
            <Link href={href} className='grid grid-cols-1 gap-3 pt-1 min-[400px]:grid-cols-2'>
                {meta}
            </Link>
            <Link href={href} className='block min-w-0 space-y-2 pt-1 sm:space-y-2.5'>
                {bars}
            </Link>
            {!suspended && (
                <div className='border-border/60 mt-auto border-t pt-3'>
                    <QuickActions vm={vm} status={status} onDone={refresh} />
                </div>
            )}
        </div>
    );
}
