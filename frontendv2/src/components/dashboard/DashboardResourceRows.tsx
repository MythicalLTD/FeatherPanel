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

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import axios from 'axios';
import { toast } from 'sonner';
import { Globe, Loader2, MonitorCog, Play, RotateCw, Server as ServerIcon, Square, Star } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { getApiErrorMessage } from '@/lib/api-errors';
import {
    displayStatus,
    formatCpu,
    formatDisk,
    formatMemory,
    getServerCpu,
    getServerCpuLimit,
    getServerDisk,
    getServerDiskLimit,
    getServerMemory,
    getServerMemoryLimit,
    getStatusDotColor,
    getUsagePercentage,
    isServerAccessible,
} from '@/lib/server-utils';
import { cn, resolveAttachmentUrl } from '@/lib/utils';
import { safeCssUrl } from '@/lib/safe-css-url';
import type { Server } from '@/types/server';
import type { VmInstance } from '@/lib/vms-api';
import type { DashboardWebSpace } from '@/components/webspace/WebSpaceCard';
import type { ServerLiveData } from '@/hooks/useServersWebSocket';

type PowerAction = 'start' | 'stop' | 'restart';

const POWER_LABEL_KEYS: Record<PowerAction, string> = {
    start: 'dashboard.home.power.start',
    stop: 'dashboard.home.power.stop',
    restart: 'dashboard.home.power.restart',
};

const POWER_SENT_KEYS: Record<PowerAction, string> = {
    start: 'dashboard.home.power.sent_start',
    stop: 'dashboard.home.power.sent_stop',
    restart: 'dashboard.home.power.sent_restart',
};

const RUNNING_STATES = new Set(['running', 'starting']);
const STOPPED_STATES = new Set(['offline', 'stopped']);

/** Status shown on a row: live state first, then the stored one. "installed" only means the
 * install finished, so without live data it reads as unknown instead of looking like a state. */
export function serverRowStatus(server: Server, live?: ServerLiveData): string {
    const stored = displayStatus(server);
    if (['suspended', 'installing', 'install_failed', 'restoring_backup', 'transferring'].includes(stored)) {
        return stored;
    }
    const liveStatus = live?.status || live?.stats?.state;
    if (liveStatus) return liveStatus;
    return stored === 'installed' ? 'unknown' : stored;
}

function canUsePower(server: Server, action: PowerAction): boolean {
    if (!server.is_subuser) return true;
    const perms = Array.isArray(server.subuser_permissions) ? server.subuser_permissions : [];
    return perms.includes(`control.${action}`);
}

function Meter({ label, value, percent }: { label: string; value: string; percent: number | null }) {
    const tone =
        percent === null
            ? 'bg-primary/60'
            : percent >= 90
              ? 'bg-rose-500'
              : percent >= 70
                ? 'bg-amber-500'
                : 'bg-emerald-500';
    return (
        <div className='min-w-0'>
            <div className='flex flex-col gap-0.5 text-[11px] leading-none sm:flex-row sm:items-baseline sm:justify-between sm:gap-1'>
                <span className='text-muted-foreground font-medium'>{label}</span>
                <span className='truncate font-medium tabular-nums'>{value}</span>
            </div>
            <div className='bg-muted mt-1.5 h-1 overflow-hidden rounded-full'>
                <div
                    className={cn('h-full rounded-full transition-[width] duration-500', tone)}
                    style={{ width: `${percent === null ? 0 : Math.min(100, Math.max(percent, 0))}%` }}
                />
            </div>
        </div>
    );
}

function StatusLabel({ status }: { status: string }) {
    const { t } = useTranslation();
    return (
        <span className='text-muted-foreground inline-flex min-w-0 items-center gap-1.5 text-xs'>
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', getStatusDotColor(status))} aria-hidden />
            <span className='truncate'>{t(`servers.status.${status}`)}</span>
        </span>
    );
}

function IconButton({
    label,
    onClick,
    disabled,
    className,
    children,
}: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    className?: string;
    children: ReactNode;
}) {
    return (
        <button
            type='button'
            title={label}
            aria-label={label}
            disabled={disabled}
            onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClick();
            }}
            className={cn(
                'text-muted-foreground hover:text-foreground hover:bg-muted inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors disabled:pointer-events-none disabled:opacity-40',
                className,
            )}
        >
            {children}
        </button>
    );
}

function Thumb({ banner, icon }: { banner?: string | null; icon: ReactNode }) {
    if (banner) {
        return (
            <span
                className='border-border/60 h-10 w-10 shrink-0 rounded-lg border bg-cover bg-center'
                style={{ backgroundImage: safeCssUrl(resolveAttachmentUrl(banner) || banner) }}
                aria-hidden
            />
        );
    }
    return (
        <span className='fp-icon-tile flex h-10 w-10 shrink-0 items-center justify-center rounded-lg' aria-hidden>
            {icon}
        </span>
    );
}

export function DashboardServerRow({
    server,
    live,
    isFavorite,
    onToggleFavorite,
}: {
    server: Server;
    live?: ServerLiveData;
    isFavorite: boolean;
    onToggleFavorite: () => void;
}) {
    const { t } = useTranslation();
    const [pending, setPending] = useState<PowerAction | null>(null);
    const status = serverRowStatus(server, live);
    const accessible = isServerAccessible(server) && status !== 'installing';
    const href = `/server/${server.uuidShort}`;

    const memory = live?.stats?.memoryUsage ?? getServerMemory(server);
    const disk = live?.stats?.diskUsage ?? getServerDisk(server);
    const cpu = live?.stats?.cpuUsage ?? getServerCpu(server);
    const memoryLimit = getServerMemoryLimit(server);
    const diskLimit = getServerDiskLimit(server);
    const cpuLimit = getServerCpuLimit(server);

    const running = RUNNING_STATES.has(status);
    const stopped = STOPPED_STATES.has(status) || status === 'unknown';

    const power = async (action: PowerAction) => {
        setPending(action);
        try {
            await axios.post(`/api/user/servers/${server.uuidShort}/power/${action}`);
            toast.success(t(POWER_SENT_KEYS[action], { name: server.name }));
        } catch (err) {
            toast.error(getApiErrorMessage(err, t, 'dashboard.home.power.failed'));
        } finally {
            setPending(null);
        }
    };

    const powerButton = (action: PowerAction, icon: ReactNode, className?: string) =>
        canUsePower(server, action) ? (
            <IconButton
                key={action}
                label={t(POWER_LABEL_KEYS[action])}
                onClick={() => void power(action)}
                disabled={pending !== null}
                className={className}
            >
                {pending === action ? <Loader2 className='h-4 w-4 animate-spin' /> : icon}
            </IconButton>
        ) : null;

    return (
        <div
            className={cn(
                'group hover:bg-muted/40 relative flex flex-col gap-3 px-3 py-3 transition-colors sm:px-4 md:flex-row md:items-center md:gap-4',
                !accessible && 'opacity-70',
            )}
        >
            <Link href={href} className='flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none'>
                <Thumb banner={server.spell?.banner} icon={<ServerIcon className='h-5 w-5' />} />
                <span className='min-w-0 flex-1'>
                    <span className='flex min-w-0 items-center gap-2'>
                        <span className='truncate text-sm font-semibold'>{server.name}</span>
                    </span>
                    <span className='mt-0.5 flex min-w-0 items-center gap-2'>
                        <StatusLabel status={status} />
                        {(server.node?.name || server.spell?.name) && (
                            <span className='text-muted-foreground/80 hidden min-w-0 truncate text-xs sm:inline'>
                                {[server.spell?.name, server.node?.name].filter(Boolean).join(' · ')}
                            </span>
                        )}
                    </span>
                </span>
            </Link>

            <div className='flex min-w-0 items-center gap-3 md:gap-4'>
                <Link href={href} tabIndex={-1} className='grid min-w-0 flex-1 grid-cols-3 gap-3 md:w-72 md:flex-none'>
                    <Meter
                        label={t('dashboard.home.meters.cpu')}
                        value={formatCpu(cpu)}
                        percent={cpuLimit > 0 ? getUsagePercentage(cpu, cpuLimit) : null}
                    />
                    <Meter
                        label={t('dashboard.home.meters.ram')}
                        value={formatMemory(memory)}
                        percent={memoryLimit > 0 ? getUsagePercentage(memory, memoryLimit) : null}
                    />
                    <Meter
                        label={t('dashboard.home.meters.disk')}
                        value={formatDisk(disk)}
                        percent={diskLimit > 0 ? getUsagePercentage(disk, diskLimit) : null}
                    />
                </Link>

                <div className='flex w-24 shrink-0 items-center justify-end'>
                    {accessible && running && (
                        <>
                            {powerButton('restart', <RotateCw className='h-4 w-4' />)}
                            {powerButton(
                                'stop',
                                <Square className='h-3.5 w-3.5' />,
                                'hover:text-rose-600 dark:hover:text-rose-400',
                            )}
                        </>
                    )}
                    {accessible &&
                        stopped &&
                        powerButton(
                            'start',
                            <Play className='h-4 w-4' />,
                            'hover:text-emerald-600 dark:hover:text-emerald-400',
                        )}
                    <IconButton
                        label={isFavorite ? t('servers.favorite_remove') : t('servers.favorite_add')}
                        onClick={onToggleFavorite}
                        className={cn(isFavorite && 'text-amber-500 hover:text-amber-500')}
                    >
                        <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
                    </IconButton>
                </div>
            </div>
        </div>
    );
}

function SimpleRow({
    href,
    icon,
    title,
    status,
    meta,
    right,
}: {
    href: string;
    icon: ReactNode;
    title: string;
    status: ReactNode;
    meta?: string | null;
    right?: ReactNode;
}) {
    return (
        <Link
            href={href}
            className='hover:bg-muted/40 flex min-w-0 items-center gap-3 px-3 py-3 transition-colors sm:px-4'
        >
            <Thumb icon={icon} />
            <span className='min-w-0 flex-1'>
                <span className='block truncate text-sm font-semibold'>{title}</span>
                <span className='mt-0.5 flex min-w-0 items-center gap-2'>
                    {status}
                    {meta && <span className='text-muted-foreground/80 min-w-0 truncate text-xs'>{meta}</span>}
                </span>
            </span>
            {right && <span className='text-muted-foreground shrink-0 text-xs tabular-nums'>{right}</span>}
        </Link>
    );
}

export function DashboardVmRow({ vm }: { vm: VmInstance }) {
    const status = vm.suspended === 1 ? 'suspended' : vm.status || 'unknown';
    const specs = [
        vm.cores ? `${(vm.cpus || 1) * vm.cores} vCPU` : null,
        vm.memory ? formatMemory(vm.memory * 1024 * 1024) : null,
        vm.disk_gb ? `${vm.disk_gb} GB` : null,
    ]
        .filter(Boolean)
        .join(' · ');
    return (
        <SimpleRow
            href={`/vds/${vm.id}`}
            icon={<MonitorCog className='h-5 w-5' />}
            title={vm.hostname}
            status={<StatusLabel status={status} />}
            meta={vm.ip_address || vm.node_name}
            right={specs || null}
        />
    );
}

export function DashboardWebSpaceRow({ webspace }: { webspace: DashboardWebSpace }) {
    const status =
        webspace.suspended === 1 || webspace.status === 'suspended'
            ? 'suspended'
            : webspace.state || webspace.status || 'unknown';
    const domain = Array.isArray(webspace.domains) && webspace.domains.length > 0 ? webspace.domains[0] : null;
    const used = webspace.disk_used_bytes;
    const limit = webspace.disk_limit_bytes;
    return (
        <SimpleRow
            href={`/webspace/${webspace.uuidShort || webspace.uuid.slice(0, 8)}`}
            icon={<Globe className='h-5 w-5' />}
            title={webspace.name}
            status={<StatusLabel status={status} />}
            meta={domain || webspace.webplate_name}
            right={
                typeof used === 'number' && typeof limit === 'number' && limit > 0
                    ? `${formatDisk(used)} / ${formatDisk(limit)}`
                    : null
            }
        />
    );
}
