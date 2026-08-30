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

import { HardDrive, Cpu, Database, ArrowDown, ArrowUp, Activity, Globe } from 'lucide-react';
import { useTranslation } from '@/contexts/TranslationContext';
import { Progress } from '@/components/ui/progress';
import { cn, formatFileSize, copyToClipboard } from '@/lib/utils';
import { getProgressColor } from '@/lib/server-utils';

export type WebSpaceUtilization = {
    cpu_percent?: number | null;
    memory_used_bytes?: number | null;
    memory_limit_bytes?: number | null;
    disk_used_bytes?: number | null;
    disk_limit_bytes?: number | null;
    network_rx_bytes?: number | null;
    network_tx_bytes?: number | null;
    bandwidth_used_bytes?: number | null;
    bandwidth_limit_bytes?: number | null;
    bandwidth_over_quota?: boolean | null;
    state?: string | null;
};

export function parseWebSpaceUtilization(data: unknown): WebSpaceUtilization | null {
    if (!data || typeof data !== 'object') return null;
    const root = data as Record<string, unknown>;
    const inner = (root.utilization ?? root) as Record<string, unknown>;
    if (!inner || typeof inner !== 'object') return null;
    return inner as WebSpaceUtilization;
}

interface WebSpaceInfoCardsProps {
    status?: string | null;
    state?: string | null;
    webplateName?: string | null;
    nodeName?: string | null;
    domains?: string[];
    ssl?: boolean;
    util?: WebSpaceUtilization | null;
    className?: string;
}

function usagePercent(used?: number | null, limit?: number | null) {
    if (used == null || !limit || limit <= 0) return 0;
    return Math.min(100, (used / limit) * 100);
}

export function WebSpaceInfoCards({
    status,
    state,
    webplateName,
    nodeName,
    domains = [],
    ssl,
    util,
    className,
}: WebSpaceInfoCardsProps) {
    const { t } = useTranslation();
    const na = t('common.not_available');
    const diskUsed = util?.disk_used_bytes ?? null;
    const diskLimit = util?.disk_limit_bytes ?? null;
    const memUsed = util?.memory_used_bytes ?? null;
    const memLimit = util?.memory_limit_bytes ?? null;
    const diskPct = usagePercent(diskUsed, diskLimit);
    const memPct = usagePercent(memUsed, memLimit);
    const cpuPct = util?.cpu_percent != null ? Math.min(100, util.cpu_percent) : 0;
    const runtimeState = util?.state ?? state ?? null;
    const lifecycleActive = !!status && ['installing', 'reinstalling', 'failed', 'transferring'].includes(status);
    const primaryDomain = domains.filter(Boolean)[0] || '';

    const handleCopy = (text: string) => {
        void copyToClipboard(text, t);
    };

    return (
        <div className={cn('grid gap-4', className)}>
            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <Globe className='h-4 w-4' />
                    {t('servers.console.info_cards.network_title')}
                </h3>
                <div className='space-y-4'>
                    <div>
                        <p className='text-muted-foreground mb-1 text-xs'>{t('servers.console.info_cards.address')}</p>
                        <div className='flex items-center gap-2'>
                            <code className='bg-muted flex-1 truncate rounded px-2 py-1 font-mono text-sm'>
                                {primaryDomain || na}
                            </code>
                            {primaryDomain ? (
                                <button
                                    type='button'
                                    onClick={() => handleCopy(primaryDomain)}
                                    className='hover:bg-muted text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors'
                                    title={t('servers.console.info_cards.copy')}
                                >
                                    <svg
                                        xmlns='http://www.w3.org/2000/svg'
                                        width='14'
                                        height='14'
                                        viewBox='0 0 24 24'
                                        fill='none'
                                        stroke='currentColor'
                                        strokeWidth='2'
                                        strokeLinecap='round'
                                        strokeLinejoin='round'
                                    >
                                        <rect width='14' height='14' x='8' y='8' rx='2' ry='2' />
                                        <path d='M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2' />
                                    </svg>
                                </button>
                            ) : null}
                        </div>
                    </div>
                    <div className='grid grid-cols-2 gap-4 pt-2'>
                        <div>
                            <p className='text-muted-foreground mb-1 text-xs'>{t('webSpaces.ssl')}</p>
                            <p className='text-sm font-medium'>
                                {ssl ? t('webSpaces.overview.sslEnabled') : t('webSpaces.overview.sslDisabled')}
                            </p>
                        </div>
                        <div>
                            <p className='text-muted-foreground mb-1 text-xs'>{t('webSpaces.overview.status')}</p>
                            <p className='text-sm font-medium capitalize'>
                                {lifecycleActive ? status : runtimeState || na}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <Activity className='h-4 w-4' />
                    {t('servers.console.info_cards.resources_title')}
                </h3>
                <div className='space-y-4'>
                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <Cpu className='h-3 w-3' />
                                {t('webSpaces.overview.cpu')}
                            </span>
                            <span className='font-medium tabular-nums'>
                                {util?.cpu_percent != null ? `${util.cpu_percent.toFixed(1)}%` : na}
                            </span>
                        </div>
                        {util?.cpu_percent != null && (
                            <Progress value={cpuPct} className='h-1.5' indicatorClassName={getProgressColor(cpuPct)} />
                        )}
                    </div>

                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <Database className='h-3 w-3' />
                                {t('webSpaces.overview.memory')}
                            </span>
                            <span className='font-medium tabular-nums'>
                                {memUsed != null ? formatFileSize(memUsed) : na}
                            </span>
                        </div>
                        {memLimit != null && memLimit > 0 && memUsed != null && (
                            <>
                                <Progress
                                    value={memPct}
                                    className='h-1.5'
                                    indicatorClassName={getProgressColor(memPct)}
                                />
                                <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                                    {t('servers.console.info_cards.limit', { limit: formatFileSize(memLimit) })}
                                </p>
                            </>
                        )}
                    </div>

                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <HardDrive className='h-3 w-3' />
                                {t('webSpaces.overview.disk')}
                            </span>
                            <span className='font-medium tabular-nums'>
                                {diskUsed != null ? formatFileSize(diskUsed) : na}
                            </span>
                        </div>
                        {diskLimit != null && diskLimit > 0 && (
                            <>
                                <Progress
                                    value={diskPct}
                                    className='h-1.5'
                                    indicatorClassName={getProgressColor(diskPct)}
                                />
                                <p className='text-muted-foreground mt-1 text-right text-[10px]'>
                                    {t('servers.console.info_cards.limit', { limit: formatFileSize(diskLimit) })}
                                </p>
                            </>
                        )}
                    </div>

                    <div>
                        <div className='mb-1.5 flex justify-between text-sm'>
                            <span className='text-muted-foreground flex items-center gap-2'>
                                <ArrowUp className='h-3 w-3' />
                                {t('webSpaces.overview.bandwidth')}
                            </span>
                            <span className='font-medium tabular-nums'>
                                {util?.bandwidth_used_bytes != null ? formatFileSize(util.bandwidth_used_bytes) : na}
                                {util?.bandwidth_limit_bytes != null && util.bandwidth_limit_bytes > 0
                                    ? ` / ${formatFileSize(util.bandwidth_limit_bytes)}`
                                    : ''}
                            </span>
                        </div>
                        {util?.bandwidth_limit_bytes != null &&
                            util.bandwidth_limit_bytes > 0 &&
                            util?.bandwidth_used_bytes != null && (
                                <>
                                    <Progress
                                        value={Math.min(
                                            100,
                                            (util.bandwidth_used_bytes / util.bandwidth_limit_bytes) * 100,
                                        )}
                                        className='h-1.5'
                                        indicatorClassName={getProgressColor(
                                            Math.min(
                                                100,
                                                (util.bandwidth_used_bytes / util.bandwidth_limit_bytes) * 100,
                                            ),
                                        )}
                                    />
                                    {util.bandwidth_over_quota && (
                                        <p className='text-destructive mt-1 text-right text-[10px]'>
                                            {t('webSpaces.overview.bandwidthOverQuota')}
                                        </p>
                                    )}
                                </>
                            )}
                    </div>
                </div>
            </div>

            <div className='border-border/50 bg-card/50 rounded-xl border p-4 backdrop-blur-xl'>
                <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-sm font-medium'>
                    <ArrowDown className='h-4 w-4' />
                    {t('servers.console.info_cards.network_title')}
                </h3>
                <div className='space-y-3'>
                    <div className='flex items-center justify-between gap-2 text-sm'>
                        <span className='text-muted-foreground flex min-w-0 items-center gap-2'>
                            <ArrowDown className='h-3 w-3 shrink-0' />
                            <span className='truncate'>{t('servers.console.info_cards.network_rx')}</span>
                        </span>
                        <span className='shrink-0 font-medium tabular-nums'>
                            {util?.network_rx_bytes != null ? formatFileSize(util.network_rx_bytes) : na}
                        </span>
                    </div>
                    <div className='flex items-center justify-between gap-2 text-sm'>
                        <span className='text-muted-foreground flex min-w-0 items-center gap-2'>
                            <ArrowUp className='h-3 w-3 shrink-0' />
                            <span className='truncate'>{t('servers.console.info_cards.network_tx')}</span>
                        </span>
                        <span className='shrink-0 font-medium tabular-nums'>
                            {util?.network_tx_bytes != null ? formatFileSize(util.network_tx_bytes) : na}
                        </span>
                    </div>
                    {(webplateName || nodeName) && (
                        <div className='border-border/50 space-y-2 border-t pt-3 text-sm'>
                            {webplateName && (
                                <div className='flex items-center justify-between gap-2'>
                                    <span className='text-muted-foreground'>{t('webSpaces.overview.webplate')}</span>
                                    <span className='truncate font-medium'>{webplateName}</span>
                                </div>
                            )}
                            {nodeName && (
                                <div className='flex items-center justify-between gap-2'>
                                    <span className='text-muted-foreground'>{t('webSpaces.overview.node')}</span>
                                    <span className='truncate font-medium'>{nodeName}</span>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
