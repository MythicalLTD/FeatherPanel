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
import {
    Check,
    Cpu,
    Globe,
    HardDrive,
    Loader2,
    MemoryStick,
    MonitorCog,
    Play,
    RotateCw,
    Server as ServerIcon,
    Square,
    Star,
    type LucideIcon,
} from 'lucide-react';
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

function Thumb({ banner, icon, small }: { banner?: string | null; icon: ReactNode; small?: boolean }) {
    const box = small ? 'h-8 w-8' : 'h-10 w-10';
    if (banner) {
        return (
            <span
                className={cn('border-border/60 shrink-0 rounded-lg border bg-cover bg-center', box)}
                style={{ backgroundImage: safeCssUrl(resolveAttachmentUrl(banner) || banner) }}
                aria-hidden
            />
        );
    }
    return (
        <span className={cn('fp-icon-tile flex shrink-0 items-center justify-center rounded-lg', box)} aria-hidden>
            {icon}
        </span>
    );
}

export type ServerRowMeter = 'cpu' | 'ram' | 'disk';

export interface DashboardServerDisplay {
    /** list: name and status only; detailed: with meters; grid: card (see DashboardServerGaugeCard). */
    view?: 'list' | 'detailed' | 'grid';
    images?: boolean;
    meters?: ServerRowMeter[];
    compact?: boolean;
}

const ALL_METERS: ServerRowMeter[] = ['cpu', 'ram', 'disk'];

/** Live usage, limits and power handling shared by the row and the card. */
function useServerPresentation(server: Server, live?: ServerLiveData) {
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

    const meter = (id: ServerRowMeter) =>
        id === 'cpu' ? (
            <Meter
                key='cpu'
                label={t('dashboard.home.meters.cpu')}
                value={formatCpu(cpu)}
                percent={cpuLimit > 0 ? getUsagePercentage(cpu, cpuLimit) : null}
            />
        ) : id === 'ram' ? (
            <Meter
                key='ram'
                label={t('dashboard.home.meters.ram')}
                value={formatMemory(memory)}
                percent={memoryLimit > 0 ? getUsagePercentage(memory, memoryLimit) : null}
            />
        ) : (
            <Meter
                key='disk'
                label={t('dashboard.home.meters.disk')}
                value={formatDisk(disk)}
                percent={diskLimit > 0 ? getUsagePercentage(disk, diskLimit) : null}
            />
        );

    const powerButtons = (
        <>
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
        </>
    );

    return {
        t,
        status,
        accessible,
        href,
        meter,
        powerButtons,
        usage: { cpu, memory, disk, cpuLimit, memoryLimit, diskLimit },
    };
}

function FavoriteButton({ isFavorite, onToggle }: { isFavorite: boolean; onToggle: () => void }) {
    const { t } = useTranslation();
    return (
        <IconButton
            label={isFavorite ? t('servers.favorite_remove') : t('servers.favorite_add')}
            onClick={onToggle}
            className={cn(isFavorite && 'text-amber-500 hover:text-amber-500')}
        >
            <Star className={cn('h-4 w-4', isFavorite && 'fill-current')} />
        </IconButton>
    );
}

export function DashboardServerRow({
    server,
    live,
    isFavorite,
    onToggleFavorite,
    view = 'detailed',
    images = true,
    meters = ALL_METERS,
    compact = false,
    selectable = false,
    selected = false,
    onToggleSelect,
}: {
    server: Server;
    live?: ServerLiveData;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
} & DashboardServerDisplay) {
    const { t, status, accessible, href, meter, powerButtons } = useServerPresentation(server, live);
    const shownMeters = view === 'list' ? [] : ALL_METERS.filter((m) => meters.includes(m));
    const meterCols = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3'][shownMeters.length];
    const meterWidth = ['', 'md:w-28', 'md:w-48', 'md:w-72'][shownMeters.length];

    return (
        <div
            className={cn(
                'group hover:bg-muted/40 relative flex gap-3 px-3 transition-colors sm:px-4 md:items-center md:gap-4',
                compact ? 'py-2' : 'py-3',
                shownMeters.length > 0 ? 'flex-col md:flex-row' : 'flex-row items-center',
                !accessible && 'opacity-70',
                selected && 'bg-primary/8',
            )}
        >
            {selectable && (
                <button
                    type='button'
                    onClick={onToggleSelect}
                    aria-pressed={selected}
                    aria-label={t('dashboard.home.select_server', { name: server.name })}
                    className='absolute inset-0 z-10 cursor-pointer'
                />
            )}
            <Link href={href} className='flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-none'>
                {selectable && (
                    <span
                        className={cn(
                            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                            selected ? 'bg-primary border-primary text-primary-foreground' : 'border-border',
                        )}
                        aria-hidden
                    >
                        {selected && <Check className='h-3.5 w-3.5' strokeWidth={3} />}
                    </span>
                )}
                {images && (
                    <Thumb small={compact} banner={server.spell?.banner} icon={<ServerIcon className='h-5 w-5' />} />
                )}
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

            <div className={cn('flex min-w-0 items-center gap-3 md:gap-4', shownMeters.length === 0 && 'shrink-0')}>
                {shownMeters.length > 0 && (
                    <Link
                        href={href}
                        tabIndex={-1}
                        className={cn('grid min-w-0 flex-1 gap-3 md:flex-none', meterCols, meterWidth)}
                    >
                        {shownMeters.map(meter)}
                    </Link>
                )}

                {!selectable && (
                    <div className='flex w-24 shrink-0 items-center justify-end'>
                        {powerButtons}
                        <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
                    </div>
                )}
            </div>
        </div>
    );
}

function Gauge({
    icon: Icon,
    label,
    value,
    limit,
    percent,
}: {
    icon: LucideIcon;
    label: string;
    value: string;
    limit: string;
    percent: number | null;
}) {
    const radius = 18;
    const circumference = 2 * Math.PI * radius;
    const clamped = percent === null ? 0 : Math.min(100, Math.max(percent, 0));
    const tone =
        percent === null
            ? 'text-primary/50'
            : percent >= 90
              ? 'text-rose-500'
              : percent >= 70
                ? 'text-amber-500'
                : 'text-emerald-500';
    return (
        <div className='flex min-w-0 flex-col items-center text-center' title={label}>
            <span className='relative flex h-12 w-12 items-center justify-center'>
                <svg viewBox='0 0 44 44' className='absolute inset-0 h-full w-full -rotate-90' aria-hidden>
                    <circle cx='22' cy='22' r={radius} fill='none' strokeWidth='3.5' className='stroke-muted' />
                    <circle
                        cx='22'
                        cy='22'
                        r={radius}
                        fill='none'
                        strokeWidth='3.5'
                        strokeLinecap='round'
                        stroke='currentColor'
                        strokeDasharray={circumference}
                        strokeDashoffset={circumference * (1 - clamped / 100)}
                        className={cn('transition-[stroke-dashoffset] duration-500', tone)}
                    />
                </svg>
                <Icon className='text-muted-foreground h-4 w-4' aria-hidden />
            </span>
            <span className='mt-1.5 max-w-full truncate text-xs font-semibold tabular-nums'>{value}</span>
            <span className='text-muted-foreground max-w-full truncate text-[10px]'>{limit}</span>
        </div>
    );
}

/** Grid card: banner with a tag and the favourite star, name, address, status, description,
 * three usage gauges against the limits, uptime and quick power buttons. */
export function DashboardServerGaugeCard({
    server,
    live,
    isFavorite,
    onToggleFavorite,
    images = true,
    tag,
    uptime,
    selectable = false,
    selected = false,
    onToggleSelect,
    trend,
}: {
    server: Server;
    live?: ServerLiveData;
    isFavorite: boolean;
    onToggleFavorite: () => void;
    images?: boolean;
    tag?: string | null;
    uptime?: string | null;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    /** Optional 24 hour history under the gauges. */
    trend?: ReactNode;
}) {
    const { t, status, accessible, href, powerButtons, usage } = useServerPresentation(server, live);
    const banner = server.spell?.banner;
    const address = server.allocation
        ? `${server.allocation.ip_alias || server.allocation.alias || server.allocation.ip}:${server.allocation.port}`
        : null;
    const pct = (used: number, limit: number) => (limit > 0 ? getUsagePercentage(used, limit) : null);
    const ofLimit = (limit: number, format: (n: number) => string) =>
        limit > 0 ? t('dashboard.home.gauges.of', { limit: format(limit) }) : t('dashboard.home.gauges.unlimited');

    const toggle = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onToggleSelect?.();
    };

    return (
        <div
            className={cn(
                'fp-surface group relative flex min-w-0 flex-col overflow-hidden rounded-2xl border transition-colors',
                selected ? 'border-primary ring-primary/30 ring-2' : 'hover:border-primary/40',
                !accessible && 'opacity-75',
            )}
        >
            {selectable && (
                <button
                    type='button'
                    onClick={toggle}
                    className='absolute inset-0 z-10 cursor-pointer'
                    aria-pressed={selected}
                    aria-label={t('dashboard.home.select_server', { name: server.name })}
                />
            )}
            <div
                className={cn(
                    'relative bg-cover bg-center',
                    images ? 'h-24' : 'h-10',
                    images && banner ? 'bg-muted' : 'bg-muted/60',
                )}
                style={
                    images && banner
                        ? { backgroundImage: safeCssUrl(resolveAttachmentUrl(banner) || banner) }
                        : undefined
                }
            >
                {images && banner ? (
                    <span className='from-card/90 absolute inset-0 bg-linear-to-t to-transparent' aria-hidden />
                ) : null}
                {tag && (
                    <span className='bg-background/70 absolute top-2.5 left-2.5 max-w-[60%] truncate rounded-md px-2 py-0.5 text-[11px] font-medium backdrop-blur-sm'>
                        {tag}
                    </span>
                )}
                <span className='absolute top-1.5 right-1.5 z-20 flex items-center gap-1'>
                    {selectable ? (
                        <button
                            type='button'
                            onClick={toggle}
                            aria-pressed={selected}
                            aria-label={t('dashboard.home.select_server', { name: server.name })}
                            className={cn(
                                'flex h-7 w-7 items-center justify-center rounded-lg border backdrop-blur-sm transition-colors',
                                selected
                                    ? 'bg-primary border-primary text-primary-foreground'
                                    : 'bg-background/70 border-border/70',
                            )}
                        >
                            {selected && <Check className='h-4 w-4' strokeWidth={3} />}
                        </button>
                    ) : (
                        <span className='bg-background/70 rounded-lg backdrop-blur-sm'>
                            <FavoriteButton isFavorite={isFavorite} onToggle={onToggleFavorite} />
                        </span>
                    )}
                </span>
            </div>
            <div className='relative flex min-w-0 flex-1 flex-col gap-3 px-4 pb-3'>
                <div className='-mt-5 flex min-w-0 items-end gap-3'>
                    <span className='fp-icon-tile border-background flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2'>
                        <ServerIcon className='h-5 w-5' aria-hidden />
                    </span>
                    <span className='mb-0.5 ml-auto'>
                        <span className='border-border/60 bg-background/60 inline-flex items-center rounded-full border px-2 py-0.5'>
                            <StatusLabel status={status} />
                        </span>
                    </span>
                </div>
                <Link href={href} className='min-w-0 focus-visible:outline-none'>
                    <span className='block truncate text-sm font-semibold'>{server.name}</span>
                    {address && (
                        <span className='text-muted-foreground block truncate font-mono text-[11px]'>{address}</span>
                    )}
                </Link>
                {server.description && (
                    <p className='text-muted-foreground line-clamp-2 text-xs'>{server.description}</p>
                )}
                <div className='grid grid-cols-3 gap-2'>
                    <Gauge
                        icon={Cpu}
                        label={t('dashboard.home.meters.cpu')}
                        value={formatCpu(usage.cpu)}
                        limit={ofLimit(usage.cpuLimit, (n) => formatCpu(n))}
                        percent={pct(usage.cpu, usage.cpuLimit)}
                    />
                    <Gauge
                        icon={MemoryStick}
                        label={t('dashboard.home.meters.ram')}
                        value={formatMemory(usage.memory)}
                        limit={ofLimit(usage.memoryLimit, formatMemory)}
                        percent={pct(usage.memory, usage.memoryLimit)}
                    />
                    <Gauge
                        icon={HardDrive}
                        label={t('dashboard.home.meters.disk')}
                        value={formatDisk(usage.disk)}
                        limit={ofLimit(usage.diskLimit, formatDisk)}
                        percent={pct(usage.disk, usage.diskLimit)}
                    />
                </div>
                {trend}
                <div className='mt-auto -mr-1.5 flex min-h-8 items-center justify-between gap-2'>
                    <span className='text-muted-foreground truncate text-xs'>
                        {uptime ? t('dashboard.home.gauges.up', { time: uptime }) : null}
                    </span>
                    {!selectable && <span className='flex shrink-0 items-center'>{powerButtons}</span>}
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
    compact,
}: {
    compact?: boolean;
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
            className={cn(
                'hover:bg-muted/40 flex min-w-0 items-center gap-3 px-3 transition-colors sm:px-4',
                compact ? 'py-2' : 'py-3',
            )}
        >
            <Thumb small={compact} icon={icon} />
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

export function DashboardVmRow({ vm, compact }: { vm: VmInstance; compact?: boolean }) {
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
            compact={compact}
            href={`/vds/${vm.id}`}
            icon={<MonitorCog className='h-5 w-5' />}
            title={vm.hostname}
            status={<StatusLabel status={status} />}
            meta={vm.ip_address || vm.node_name}
            right={specs || null}
        />
    );
}

export function DashboardWebSpaceRow({ webspace, compact }: { webspace: DashboardWebSpace; compact?: boolean }) {
    const status =
        webspace.suspended === 1 || webspace.status === 'suspended'
            ? 'suspended'
            : webspace.state || webspace.status || 'unknown';
    const domain = Array.isArray(webspace.domains) && webspace.domains.length > 0 ? webspace.domains[0] : null;
    const used = webspace.disk_used_bytes;
    const limit = webspace.disk_limit_bytes;
    return (
        <SimpleRow
            compact={compact}
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
